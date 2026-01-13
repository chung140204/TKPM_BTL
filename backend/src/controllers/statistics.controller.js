const ShoppingList = require('../models/ShoppingList.model');
const FridgeItem = require('../models/FridgeItem.model');
const Recipe = require('../models/Recipe.model');
const Notification = require('../models/Notification.model');
const FoodItem = require('../models/FoodItem.model');
const Category = require('../models/Category.model');
const ConsumptionLog = require('../models/ConsumptionLog.model');
const mongoose = require('mongoose');
const { buildViewFilter, buildAggregateMatch, mergeViewFilter } = require('../utils/view');

// Helper function để tính date range dựa trên period
const getDateRange = (period, offset = 0) => {
  const now = new Date();
  let startDate;
  let endDate;

  switch (period) {
    case 'week':
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() - (7 * offset));
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() - offset);
      startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'year':
      endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() - offset);
      startDate = new Date(endDate);
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() - offset);
      startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 1); // Default: 1 month
  }

  return { startDate, endDate: endDate || now };
};

/**
 * @desc    Thống kê mua sắm
 * @route   GET /api/statistics/purchases?period=week|month|year
 * @access  Private
 */
exports.getPurchaseStatistics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const period = req.query.period || 'month';
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const { startDate, endDate } = getDateRange(period, offset);
    const userIds = req.view === 'family' && req.familyGroup
      ? req.familyGroup.members.map(member => member.userId)
      : [userId];
    const viewFilter = buildViewFilter(req);

    // Debug log để kiểm tra filter
    if (process.env.NODE_ENV === 'development' && req.view === 'family') {
      console.log('[Purchase Statistics] View filter:', JSON.stringify(viewFilter, null, 2));
    }

    // Lấy tất cả completed shopping lists trong khoảng thời gian
    // Nếu completedAt = null, sử dụng updatedAt hoặc createdAt
    const dateFilter = {
      $or: [
        { completedAt: { $gte: startDate, $lte: endDate } },
        { 
          completedAt: null,
          updatedAt: { $gte: startDate, $lte: endDate }
        }
      ]
    };
    
    const query = mergeViewFilter(viewFilter, {
      status: 'completed',
      ...dateFilter
    });
    
    const shoppingLists = await ShoppingList.find(query)
      .populate({
        path: 'items.foodItemId',
        select: 'name categoryId',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      })
      .populate('items.categoryId', 'name');

    // Flatten items và aggregate
    const itemMap = new Map();
    const categoryMap = new Map();

    shoppingLists.forEach(list => {
      list.items.forEach(item => {
        // Kiểm tra điều kiện: phải có foodItemId (sau populate) và isBought = true
        if (!item.foodItemId || !item.isBought) {
          return; // Bỏ qua item không hợp lệ
        }

        // Kiểm tra foodItemId có _id không (populate thành công)
        if (!item.foodItemId._id) {
          return; // Bỏ qua nếu populate thất bại
        }

        const foodItemId = item.foodItemId._id.toString();
        const categoryId = item.categoryId?._id || item.foodItemId.categoryId?._id;
        const categoryName = item.categoryId?.name || item.foodItemId.categoryId?.name || 'Chưa phân loại';
        const foodItemName = item.foodItemId.name || 'Unknown';

        // Aggregate by foodItem
        if (itemMap.has(foodItemId)) {
          const existing = itemMap.get(foodItemId);
          existing.totalQuantity += item.quantity;
          existing.totalAmount += (item.quantity * (item.price || 0));
        } else {
          itemMap.set(foodItemId, {
            foodItemId: foodItemId,
            foodItemName: foodItemName,
            totalQuantity: item.quantity,
            totalAmount: item.quantity * (item.price || 0)
          });
        }

        // Aggregate by category
        if (categoryId) {
          const catKey = categoryId.toString();
          if (categoryMap.has(catKey)) {
            const existing = categoryMap.get(catKey);
            existing.totalQuantity += item.quantity;
            existing.totalAmount += (item.quantity * (item.price || 0));
          } else {
            categoryMap.set(catKey, {
              categoryId: categoryId,
              categoryName: categoryName,
              totalQuantity: item.quantity,
              totalAmount: item.quantity * (item.price || 0)
            });
          }
        }
      });
    });

    // Convert maps to arrays
    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    const byCategory = Array.from(categoryMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    // Calculate totals
    const totalItems = topItems.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalAmount = topItems.reduce((sum, item) => sum + item.totalAmount, 0);

    res.json({
      success: true,
      data: {
        period: period,
        totalItems: totalItems,
        totalAmount: totalAmount,
        byCategory: byCategory,
        topItems: topItems
      }
    });
  } catch (error) {
    console.error('Error in getPurchaseStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê mua sắm',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Thống kê lãng phí
 * @route   GET /api/statistics/waste?period=week|month|year
 * @access  Private
 */
exports.getWasteStatistics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const period = req.query.period || 'month';
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const { startDate, endDate } = getDateRange(period, offset);
    const viewFilter = buildViewFilter(req);

    // Debug log để kiểm tra filter
    if (process.env.NODE_ENV === 'development' && req.view === 'family') {
      console.log('[Waste Statistics] View filter:', JSON.stringify(viewFilter, null, 2));
    }

    // Lấy tất cả expired fridge items
    // QUAN TRỌNG: Lấy TẤT CẢ expired items (không filter date) để hiển thị tổng hợp waste
    // Sau đó filter theo expiryDate trong khoảng thời gian khi aggregate để hiển thị trend đúng
    // Điều này đảm bảo các items hết hạn từ lâu vẫn được tính vào tổng waste
    const allExpiredItems = await FridgeItem.find(
      mergeViewFilter(viewFilter, {
        status: 'expired'
        // Không filter date ở đây, lấy tất cả expired items
      })
    )
      .populate('foodItemId', 'name categoryId')
      .populate({
        path: 'foodItemId',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      });

    // Để hiển thị đúng waste, trend chart sẽ hiển thị TẤT CẢ expired items
    // Không filter theo date range vì waste là tổng hợp tất cả items đã hết hạn
    // Nếu muốn filter theo khoảng thời gian, có thể filter sau khi query
    // Nhưng để đảm bảo hiển thị đúng, dùng tất cả expired items cho trend
    const expiredItemsForTrend = allExpiredItems; // Dùng tất cả expired items cho trend

    // Aggregate by foodItem and category (tính TẤT CẢ expired items)
    const itemMap = new Map();
    const categoryMap = new Map();
    const dateMap = new Map();

    // Tính tổng waste từ tất cả expired items
    allExpiredItems.forEach(item => {
      if (!item.foodItemId) return;

      const foodItemId = item.foodItemId._id.toString();
      const categoryId = item.foodItemId.categoryId?._id;
      const categoryName = item.foodItemId.categoryId?.name || 'Chưa phân loại';
      const foodItemName = item.foodItemId.name;
      const wastedAmount = item.quantity * (item.price || 0);

      // Aggregate by foodItem (tất cả expired items)
      if (itemMap.has(foodItemId)) {
        const existing = itemMap.get(foodItemId);
        existing.totalQuantity += item.quantity;
        existing.totalAmount += wastedAmount;
      } else {
        itemMap.set(foodItemId, {
          foodItemId: foodItemId,
          foodItemName: foodItemName,
          totalQuantity: item.quantity,
          totalAmount: wastedAmount
        });
      }

      // Aggregate by category (tất cả expired items)
      if (categoryId) {
        const catKey = categoryId.toString();
        if (categoryMap.has(catKey)) {
          const existing = categoryMap.get(catKey);
          existing.totalQuantity += item.quantity;
          existing.totalAmount += wastedAmount;
        } else {
          categoryMap.set(catKey, {
            categoryId: categoryId,
            categoryName: categoryName,
            totalQuantity: item.quantity,
            totalAmount: wastedAmount
          });
        }
      }
    });

    // Aggregate by date cho trend (chỉ tính items có expiryDate trong khoảng thời gian được chọn)
    expiredItemsForTrend.forEach(item => {
      if (!item.foodItemId) return;
      const wastedAmount = item.quantity * (item.price || 0);
      // Dùng expiryDate để group theo ngày hết hạn
      const dateKey = item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : item.createdAt.toISOString().split('T')[0];

      // Aggregate by date (for trend) - chỉ tính items trong khoảng thời gian
      if (dateMap.has(dateKey)) {
        const existing = dateMap.get(dateKey);
        existing.wastedItems += 1;
        existing.wastedAmount += wastedAmount;
        existing.totalQuantity += item.quantity;
      } else {
        dateMap.set(dateKey, {
          date: dateKey,
          wastedItems: 1,
          wastedAmount: wastedAmount,
          totalQuantity: item.quantity
        });
      }
    });

    // Convert maps to arrays
    const topWastedItems = Array.from(itemMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    const byCategory = Array.from(categoryMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    const trend = Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate totals - tính từ TẤT CẢ expired items (không chỉ trong khoảng thời gian)
    const totalWastedItems = allExpiredItems.length;
    const totalWastedAmount = topWastedItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalWastedQuantity = allExpiredItems.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      data: {
        totalWastedItems: totalWastedItems,
        totalWastedAmount: totalWastedAmount,
        totalWastedQuantity: totalWastedQuantity,
        byCategory: byCategory,
        topWastedItems: topWastedItems,
        trend: trend
      }
    });
  } catch (error) {
    console.error('Error in getWasteStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê lãng phí',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Phân tích xu hướng tiêu thụ
 * @route   GET /api/statistics/consumption?period=week|month|year
 * @access  Private
 */
exports.getConsumptionStatistics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const period = req.query.period || 'month';
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const { startDate, endDate } = getDateRange(period, offset);
    const viewFilter = buildViewFilter(req);

    // Debug log để kiểm tra filter
    if (process.env.NODE_ENV === 'development' && req.view === 'family') {
      console.log('[Consumption Statistics] View filter:', JSON.stringify(viewFilter, null, 2));
    }

    // 1. Lấy purchased items từ completed shopping lists
    const query = mergeViewFilter(viewFilter, {
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate }
    });
    
    const shoppingLists = await ShoppingList.find(query)
      .populate('items.foodItemId', 'name');

    // 2. Lấy used items từ consumption logs (ưu tiên), fallback to used_up nếu chưa có log
    const consumptionLogs = await ConsumptionLog.find(
      mergeViewFilter(viewFilter, {
        createdAt: { $gte: startDate, $lte: endDate }
      })
    )
      .populate('foodItemId', 'name');

    const usedItems = consumptionLogs.length === 0
      ? await FridgeItem.find(
          mergeViewFilter(viewFilter, {
            status: 'used_up',
            updatedAt: { $gte: startDate, $lte: endDate }
          })
        )
          .populate('foodItemId', 'name')
      : [];

    // 3. Lấy wasted items (status = expired)
    // Filter theo expiryDate thay vì createdAt để đúng với logic waste
    const wastedItems = await FridgeItem.find(
      mergeViewFilter(viewFilter, {
        status: 'expired',
        expiryDate: { $gte: startDate, $lte: endDate } // Filter theo expiryDate
      })
    )
      .populate('foodItemId', 'name');

    // Aggregate by date
    const dateMap = new Map();
    const itemUsageMap = new Map();

    // Process purchased items
    shoppingLists.forEach(list => {
      const dateKey = list.completedAt ? list.completedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: dateKey, purchased: 0, used: 0, wasted: 0 });
      }
      list.items.forEach(item => {
        if (item.isBought && item.foodItemId) {
          dateMap.get(dateKey).purchased += item.quantity;
        }
      });
    });

    // Process used items from logs
    consumptionLogs.forEach(log => {
      if (!log.foodItemId) return;
      const dateKey = log.createdAt.toISOString().split('T')[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: dateKey, purchased: 0, used: 0, wasted: 0 });
      }
      dateMap.get(dateKey).used += log.quantity;

      const foodItemId = log.foodItemId._id.toString();
      if (itemUsageMap.has(foodItemId)) {
        itemUsageMap.get(foodItemId).timesUsed += 1;
        itemUsageMap.get(foodItemId).totalQuantity += log.quantity;
      } else {
        itemUsageMap.set(foodItemId, {
          foodItemId: foodItemId,
          foodItemName: log.foodItemId.name,
          timesUsed: 1,
          totalQuantity: log.quantity
        });
      }
    });

    // Fallback: Process used items from used_up fridge items if no logs
    usedItems.forEach(item => {
      if (!item.foodItemId) return;
      const dateKey = item.updatedAt.toISOString().split('T')[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: dateKey, purchased: 0, used: 0, wasted: 0 });
      }
      dateMap.get(dateKey).used += item.quantity;

      const foodItemId = item.foodItemId._id.toString();
      if (itemUsageMap.has(foodItemId)) {
        itemUsageMap.get(foodItemId).timesUsed += 1;
        itemUsageMap.get(foodItemId).totalQuantity += item.quantity;
      } else {
        itemUsageMap.set(foodItemId, {
          foodItemId: foodItemId,
          foodItemName: item.foodItemId.name,
          timesUsed: 1,
          totalQuantity: item.quantity
        });
      }
    });

    // Process wasted items
    wastedItems.forEach(item => {
      if (!item.foodItemId) return;
      // Dùng expiryDate thay vì createdAt để group theo ngày hết hạn
      const dateKey = item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : item.createdAt.toISOString().split('T')[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: dateKey, purchased: 0, used: 0, wasted: 0 });
      }
      dateMap.get(dateKey).wasted += item.quantity;
    });

    // Convert to arrays
    const consumptionTrend = Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const topConsumedItems = Array.from(itemUsageMap.values())
      .sort((a, b) => b.timesUsed - a.timesUsed)
      .slice(0, 10);

    // Calculate waste rate
    const totalPurchased = consumptionTrend.reduce((sum, day) => sum + day.purchased, 0);
    const totalWasted = consumptionTrend.reduce((sum, day) => sum + day.wasted, 0);
    const wasteRate = totalPurchased > 0 ? (totalWasted / totalPurchased) * 100 : 0;

    res.json({
      success: true,
      data: {
        consumptionTrend: consumptionTrend,
        topConsumedItems: topConsumedItems,
        wasteRate: Math.round(wasteRate * 100) / 100 // Round to 2 decimals
      }
    });
  } catch (error) {
    console.error('Error in getConsumptionStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê tiêu thụ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Thống kê món ăn
 * @route   GET /api/statistics/recipes?period=week|month|year
 * @access  Private
 */
exports.getRecipeStatistics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const period = req.query.period || 'month';
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const { startDate, endDate } = getDateRange(period, offset);
    const userIds = req.view === 'family' && req.familyGroup
      ? req.familyGroup.members.map(member => member.userId)
      : [userId];

    // 1. Lấy tất cả notifications về recipe_cooked trong khoảng thời gian
    const cookedNotifications = await Notification.find({
      userId: { $in: userIds },
      type: 'recipe_cooked',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Count cooked recipes
    const recipeCookedMap = new Map();
    cookedNotifications.forEach(notif => {
      if (notif.relatedId) {
        const recipeId = notif.relatedId.toString();
        if (recipeCookedMap.has(recipeId)) {
          recipeCookedMap.set(recipeId, recipeCookedMap.get(recipeId) + 1);
        } else {
          recipeCookedMap.set(recipeId, 1);
        }
      }
    });

    // 2. Lấy tất cả recipes để populate thông tin
    const recipeIds = Array.from(recipeCookedMap.keys());
    const recipes = await Recipe.find({
      _id: { $in: recipeIds },
      isApproved: true
    }).select('name category favoriteCount');

    // 3. Build top cooked recipes
    const topCookedRecipes = recipes
      .map(recipe => ({
        recipeId: recipe._id,
        recipeName: recipe.name,
        cookedCount: recipeCookedMap.get(recipe._id.toString()) || 0,
        favoriteCount: recipe.favoriteCount || 0
      }))
      .sort((a, b) => b.cookedCount - a.cookedCount)
      .slice(0, 10);

    // 4. Get top favorite recipes (all time, not just period)
    const topFavoriteRecipes = await Recipe.find({ isApproved: true })
      .select('name category favoriteCount')
      .sort({ favoriteCount: -1 })
      .limit(10)
      .lean();

    const topFavoriteRecipesFormatted = topFavoriteRecipes.map(recipe => ({
      recipeId: recipe._id,
      recipeName: recipe.name,
      favoriteCount: recipe.favoriteCount || 0
    }));

    // 5. Aggregate by category
    const categoryMap = new Map();
    recipes.forEach(recipe => {
      const category = recipe.category || 'Chưa phân loại';
      if (categoryMap.has(category)) {
        const existing = categoryMap.get(category);
        existing.count += recipeCookedMap.get(recipe._id.toString()) || 0;
      } else {
        categoryMap.set(category, {
          category: category,
          count: recipeCookedMap.get(recipe._id.toString()) || 0
        });
      }
    });

    const byCategory = Array.from(categoryMap.values())
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        topCookedRecipes: topCookedRecipes,
        topFavoriteRecipes: topFavoriteRecipesFormatted,
        byCategory: byCategory
      }
    });
  } catch (error) {
    console.error('Error in getRecipeStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê món ăn',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Lấy dữ liệu tổng quan cho Dashboard
 * @route   GET /api/statistics/dashboard
 * @access  Private
 */
exports.getDashboardOverview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const viewFilter = buildViewFilter(req);
    const aggregateMatch = buildAggregateMatch(req);

    // 1. Tổng số thực phẩm trong tủ lạnh (status != used_up)
    const totalFridgeItems = await FridgeItem.countDocuments(
      mergeViewFilter(viewFilter, {
        status: { $ne: 'used_up' }
      })
    );

    // 2. Số thực phẩm sắp hết hạn (expiring_soon)
    const expiringSoon = await FridgeItem.countDocuments(
      mergeViewFilter(viewFilter, {
        status: 'expiring_soon'
      })
    );

    // 3. Số danh sách mua sắm (không phân biệt trạng thái)
    const shoppingListCount = await ShoppingList.countDocuments(viewFilter);

    // 4. Tính waste reduction (so sánh tháng này vs tháng trước)
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const calculatePercentChange = (currentValue, previousValue) => {
      if (previousValue > 0) {
        return Math.round(((currentValue - previousValue) / previousValue) * 100);
      }
      if (currentValue === 0) {
        return 0;
      }
      return 100;
    };

    // Waste tháng này - filter theo expiryDate thay vì createdAt
    const thisMonthWaste = await FridgeItem.aggregate([
      {
        $match: {
          ...aggregateMatch,
          status: 'expired',
          expiryDate: { $gte: thisMonthStart, $lte: now } // Items hết hạn trong tháng này
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    // Waste tháng trước - filter theo expiryDate
    const lastMonthWaste = await FridgeItem.aggregate([
      {
        $match: {
          ...aggregateMatch,
          status: 'expired',
          expiryDate: { $gte: lastMonthStart, $lte: lastMonthEnd } // Items hết hạn trong tháng trước
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    const thisMonthWasteQty = thisMonthWaste[0]?.totalQuantity || 0;
    const lastMonthWasteQty = lastMonthWaste[0]?.totalQuantity || 0;
    
    let wasteReduction = 0;
    if (lastMonthWasteQty > 0) {
      wasteReduction = Math.round(((lastMonthWasteQty - thisMonthWasteQty) / lastMonthWasteQty) * 100);
    } else if (thisMonthWasteQty === 0 && lastMonthWasteQty === 0) {
      wasteReduction = 0;
    } else {
      wasteReduction = 100; // Không có waste tháng này nhưng có tháng trước
    }

    // 5. Tính thay đổi theo tháng cho các chỉ số chính
    const [
      fridgeItemsThisMonth,
      fridgeItemsLastMonth,
      expiringSoonThisMonth,
      expiringSoonLastMonth,
      shoppingListsThisMonth,
      shoppingListsLastMonth
    ] = await Promise.all([
      FridgeItem.countDocuments(
        mergeViewFilter(viewFilter, {
          status: { $ne: 'used_up' },
          createdAt: { $gte: thisMonthStart }
        })
      ),
      FridgeItem.countDocuments(
        mergeViewFilter(viewFilter, {
          status: { $ne: 'used_up' },
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
        })
      ),
      FridgeItem.countDocuments(
        mergeViewFilter(viewFilter, {
          status: 'expiring_soon',
          createdAt: { $gte: thisMonthStart }
        })
      ),
      FridgeItem.countDocuments(
        mergeViewFilter(viewFilter, {
          status: 'expiring_soon',
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
        })
      ),
      ShoppingList.countDocuments(
        mergeViewFilter(viewFilter, {
          createdAt: { $gte: thisMonthStart }
        })
      ),
      ShoppingList.countDocuments(
        mergeViewFilter(viewFilter, {
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
        })
      )
    ]);

    const changes = {
      totalFridgeItems: {
        diff: fridgeItemsThisMonth - fridgeItemsLastMonth,
        percent: calculatePercentChange(fridgeItemsThisMonth, fridgeItemsLastMonth)
      },
      expiringSoon: {
        diff: expiringSoonThisMonth - expiringSoonLastMonth,
        percent: calculatePercentChange(expiringSoonThisMonth, expiringSoonLastMonth)
      },
      shoppingListCount: {
        diff: shoppingListsThisMonth - shoppingListsLastMonth,
        percent: calculatePercentChange(shoppingListsThisMonth, shoppingListsLastMonth)
      }
    };

    // 6. Lấy waste data theo tháng (6 tháng gần nhất)
    // Group theo expiryDate thay vì createdAt để hiển thị waste theo thời điểm hết hạn
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const wasteDataByMonth = await FridgeItem.aggregate([
      {
        $match: {
          ...aggregateMatch,
          status: 'expired',
          expiryDate: { $gte: sixMonthsAgo } // Filter theo expiryDate
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$expiryDate' }, // Group theo expiryDate
            month: { $month: '$expiryDate' }
          },
          waste: { $sum: '$quantity' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Format waste data
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6'];
    const wasteData = wasteDataByMonth.map((item, index) => ({
      month: monthNames[index] || `Tháng ${item._id.month}`,
      waste: Math.round(item.waste * 10) / 10 // Round to 1 decimal
    }));

    // Fill missing months with 0
    const filledWasteData = [];
    for (let i = 0; i < 6; i++) {
      const existing = wasteData.find(d => d.month === monthNames[i]);
      filledWasteData.push(existing || { month: monthNames[i], waste: 0 });
    }

    // 7. Phân bố theo danh mục (từ fridge items)
    const categoryDistribution = await FridgeItem.aggregate([
      {
        $match: {
          ...aggregateMatch,
          status: { $ne: 'used_up' }
        }
      },
      {
        $lookup: {
          from: 'fooditems',
          localField: 'foodItemId',
          foreignField: '_id',
          as: 'foodItem'
        }
      },
      {
        $unwind: {
          path: '$foodItem',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'foodItem.categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$category.name' || 'Chưa phân loại',
          value: { $sum: '$quantity' }
        }
      },
      {
        $project: {
          name: '$_id',
          value: 1,
          _id: 0
        }
      }
    ]);

    // Calculate percentages and format
    const totalCategoryValue = categoryDistribution.reduce((sum, item) => sum + item.value, 0);
    const categoryData = categoryDistribution.map(item => ({
      name: item.name || 'Chưa phân loại',
      value: Math.round(item.value),
      percentage: totalCategoryValue > 0 ? Math.round((item.value / totalCategoryValue) * 100) : 0
    })).sort((a, b) => b.value - a.value);

    res.json({
      success: true,
      data: {
        totalFridgeItems,
        expiringSoon,
        shoppingListCount,
        wasteReduction,
        changes,
        wasteData: filledWasteData,
        categoryData
      }
    });
  } catch (error) {
    console.error('Error in getDashboardOverview:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy dữ liệu dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Lấy hoạt động gần đây
 * @route   GET /api/statistics/recent-activities
 * @access  Private
 */
exports.getRecentActivities = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5; // Default 5 per page
    const skip = (page - 1) * limit;
    const viewFilter = buildViewFilter(req);
    const userIds = req.view === 'family' && req.familyGroup
      ? req.familyGroup.members.map(member => member.userId)
      : [userId];

    const activities = [];

    // 1. Lấy FridgeItems mới được thêm (trong 7 ngày gần nhất)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentFridgeItems = await FridgeItem.find(
      mergeViewFilter(viewFilter, {
        createdAt: { $gte: sevenDaysAgo }
      })
    )
      .populate('foodItemId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    recentFridgeItems.forEach(item => {
      if (item.foodItemId) {
        activities.push({
          type: 'fridge_add',
          action: `Thêm ${item.foodItemId.name} vào tủ lạnh`,
          timestamp: item.createdAt,
          icon: 'Package'
        });
      }
    });

    // 2. Lấy ShoppingLists mới được tạo hoặc completed
    const dateFilterForRecent = {
      $or: [
        { createdAt: { $gte: sevenDaysAgo } },
        { completedAt: { $gte: sevenDaysAgo } }
      ]
    };
    
    const recentShoppingLists = await ShoppingList.find(
      mergeViewFilter(viewFilter, dateFilterForRecent)
    )
      .sort({ createdAt: -1, completedAt: -1 })
      .limit(5);

    recentShoppingLists.forEach(list => {
      if (list.completedAt && list.completedAt >= sevenDaysAgo) {
        activities.push({
          type: 'shopping_complete',
          action: `Hoàn thành danh sách mua sắm "${list.name}"`,
          timestamp: list.completedAt,
          icon: 'ShoppingCart'
        });
      } else if (list.createdAt >= sevenDaysAgo) {
        activities.push({
          type: 'shopping_create',
          action: `Tạo danh sách mua sắm "${list.name}"`,
          timestamp: list.createdAt,
          icon: 'ShoppingCart'
        });
      }
    });

    // 3. Lấy Notifications về recipe_cooked và các loại khác
    const recentNotifications = await Notification.find({
      userId: { $in: userIds },
      type: { $in: ['recipe_cooked', 'shopping_update', 'expiry_reminder'] },
      createdAt: { $gte: sevenDaysAgo }
    })
      .populate('relatedId')
      .sort({ createdAt: -1 })
      .limit(5);

    recentNotifications.forEach(notif => {
      if (notif.message) {
        let icon = 'Bell';
        if (notif.type === 'recipe_cooked') {
          icon = 'Utensils';
        } else if (notif.type === 'shopping_update') {
          icon = 'ShoppingCart';
        } else if (notif.type === 'expiry_reminder') {
          icon = 'AlertTriangle';
        }
        activities.push({
          type: notif.type,
          action: notif.message,
          timestamp: notif.createdAt,
          icon: icon
        });
      }
    });

    // 4. Sort tất cả activities theo timestamp (mới nhất trước)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 5. Calculate pagination
    const totalCount = activities.length;
    const totalPages = Math.ceil(totalCount / limit);

    // 6. Format và paginate
    const paginatedActivities = activities.slice(skip, skip + limit);
    const formattedActivities = paginatedActivities.map(activity => {
      const now = new Date();
      const timestamp = new Date(activity.timestamp);
      const diffMs = now - timestamp;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let timeAgo = '';
      if (diffMins < 1) {
        timeAgo = 'Vừa xong';
      } else if (diffMins < 60) {
        timeAgo = `${diffMins} phút trước`;
      } else if (diffHours < 24) {
        timeAgo = `${diffHours} giờ trước`;
      } else if (diffDays === 1) {
        timeAgo = '1 ngày trước';
      } else {
        timeAgo = `${diffDays} ngày trước`;
      }

      return {
        action: activity.action,
        time: timeAgo,
        type: activity.type,
        icon: activity.icon,
        timestamp: activity.timestamp
      };
    });

    res.json({
      success: true,
      data: {
        activities: formattedActivities,
        pagination: {
          page: page,
          limit: limit,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error in getRecentActivities:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy hoạt động gần đây',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
