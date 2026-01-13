/**
 * Export Controller
 * Controller để xuất báo cáo CSV
 * Sử dụng lại logic từ statistics.controller.js (không thay đổi code hiện tại)
 */

const ShoppingList = require('../models/ShoppingList.model');
const FridgeItem = require('../models/FridgeItem.model');
const Recipe = require('../models/Recipe.model');
const Notification = require('../models/Notification.model');
const FoodItem = require('../models/FoodItem.model');
const Category = require('../models/Category.model');
const ConsumptionLog = require('../models/ConsumptionLog.model');
const { buildViewFilter, buildAggregateMatch, mergeViewFilter } = require('../utils/view');
const csvExport = require('../utils/csvExport');

// Helper function để tính date range (copy từ statistics.controller.js)
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
      startDate.setMonth(startDate.getMonth() - 1);
  }

  return { startDate, endDate: endDate || now };
};

// Helper functions để lấy data (tái sử dụng logic từ statistics.controller.js)
const getPurchaseStatisticsData = async (req) => {
  const userId = req.user.id;
  const period = req.query.period || 'month';
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const { startDate, endDate } = getDateRange(period, offset);
  const viewFilter = buildViewFilter(req);

  const dateFilter = {
    $or: [
      { completedAt: { $gte: startDate, $lte: endDate } },
      { completedAt: null, updatedAt: { $gte: startDate, $lte: endDate } }
    ]
  };
  
  const shoppingLists = await ShoppingList.find(
    mergeViewFilter(viewFilter, {
      status: 'completed',
      ...dateFilter
    })
  )
    .populate({
      path: 'items.foodItemId',
      select: 'name categoryId',
      populate: { path: 'categoryId', select: 'name' }
    })
    .populate('items.categoryId', 'name');

  const itemMap = new Map();
  const categoryMap = new Map();

  shoppingLists.forEach(list => {
    list.items.forEach(item => {
      if (!item.foodItemId || !item.isBought || !item.foodItemId._id) return;

      const foodItemId = item.foodItemId._id.toString();
      const categoryId = item.categoryId?._id || item.foodItemId.categoryId?._id;
      const categoryName = item.categoryId?.name || item.foodItemId.categoryId?.name || 'Chưa phân loại';
      const foodItemName = item.foodItemId.name || 'Unknown';

      if (itemMap.has(foodItemId)) {
        const existing = itemMap.get(foodItemId);
        existing.totalQuantity += item.quantity;
        existing.totalAmount += (item.quantity * (item.price || 0));
      } else {
        itemMap.set(foodItemId, {
          foodItemId, foodItemName, totalQuantity: item.quantity,
          totalAmount: item.quantity * (item.price || 0)
        });
      }

      if (categoryId) {
        const catKey = categoryId.toString();
        if (categoryMap.has(catKey)) {
          const existing = categoryMap.get(catKey);
          existing.totalQuantity += item.quantity;
          existing.totalAmount += (item.quantity * (item.price || 0));
        } else {
          categoryMap.set(catKey, {
            categoryId, categoryName, totalQuantity: item.quantity,
            totalAmount: item.quantity * (item.price || 0)
          });
        }
      }
    });
  });

  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 10);
  const byCategory = Array.from(categoryMap.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
  const totalItems = topItems.reduce((sum, item) => sum + item.totalQuantity, 0);
  const totalAmount = topItems.reduce((sum, item) => sum + item.totalAmount, 0);

  return { period, totalItems, totalAmount, byCategory, topItems };
};

const getWasteStatisticsData = async (req) => {
  const period = req.query.period || 'month';
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const { startDate, endDate } = getDateRange(period, offset);
  const viewFilter = buildViewFilter(req);

  // Filter theo expiryDate thay vì createdAt để đúng với logic waste
  const expiredItems = await FridgeItem.find(
    mergeViewFilter(viewFilter, {
      status: 'expired',
      expiryDate: { $gte: startDate, $lte: endDate } // Filter theo expiryDate
    })
  )
    .populate('foodItemId', 'name categoryId')
    .populate({ path: 'foodItemId', populate: { path: 'categoryId', select: 'name' } });

  const itemMap = new Map();
  const categoryMap = new Map();
  const dateMap = new Map();

  expiredItems.forEach(item => {
    if (!item.foodItemId) return;

    const foodItemId = item.foodItemId._id.toString();
    const categoryId = item.foodItemId.categoryId?._id;
    const categoryName = item.foodItemId.categoryId?.name || 'Chưa phân loại';
    const foodItemName = item.foodItemId.name;
    const wastedAmount = item.quantity * (item.price || 0);
    // Dùng expiryDate để group theo ngày hết hạn (đã được filter ở trên)
    const dateKey = item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : item.createdAt.toISOString().split('T')[0];

    if (itemMap.has(foodItemId)) {
      const existing = itemMap.get(foodItemId);
      existing.totalQuantity += item.quantity;
      existing.totalAmount += wastedAmount;
    } else {
      itemMap.set(foodItemId, {
        foodItemId, foodItemName, totalQuantity: item.quantity, totalAmount: wastedAmount
      });
    }

    if (categoryId) {
      const catKey = categoryId.toString();
      if (categoryMap.has(catKey)) {
        const existing = categoryMap.get(catKey);
        existing.totalQuantity += item.quantity;
        existing.totalAmount += wastedAmount;
      } else {
        categoryMap.set(catKey, {
          categoryId, categoryName, totalQuantity: item.quantity, totalAmount: wastedAmount
        });
      }
    }

    if (dateMap.has(dateKey)) {
      const existing = dateMap.get(dateKey);
      existing.wastedItems += 1;
      existing.wastedAmount += wastedAmount;
      existing.totalQuantity += item.quantity;
    } else {
      dateMap.set(dateKey, {
        date: dateKey, wastedItems: 1, wastedAmount: wastedAmount, totalQuantity: item.quantity
      });
    }
  });

  const topWastedItems = Array.from(itemMap.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 10);
  const byCategory = Array.from(categoryMap.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
  const trend = Array.from(dateMap.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalWastedItems = expiredItems.length;
  const totalWastedAmount = topWastedItems.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalWastedQuantity = expiredItems.reduce((sum, item) => sum + item.quantity, 0);

  return { totalWastedItems, totalWastedAmount, totalWastedQuantity, byCategory, topWastedItems, trend };
};

const getConsumptionStatisticsData = async (req) => {
  const period = req.query.period || 'month';
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const { startDate, endDate } = getDateRange(period, offset);
  const viewFilter = buildViewFilter(req);

  const shoppingLists = await ShoppingList.find(
    mergeViewFilter(viewFilter, {
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate }
    })
  ).populate('items.foodItemId', 'name');

  const consumptionLogs = await ConsumptionLog.find(
    mergeViewFilter(viewFilter, {
      createdAt: { $gte: startDate, $lte: endDate }
    })
  ).populate('foodItemId', 'name');

  const usedItems = consumptionLogs.length === 0
    ? await FridgeItem.find(
        mergeViewFilter(viewFilter, {
          status: 'used_up',
          updatedAt: { $gte: startDate, $lte: endDate }
        })
      ).populate('foodItemId', 'name')
    : [];

  const wastedItems = await FridgeItem.find(
    mergeViewFilter(viewFilter, {
      status: 'expired',
      createdAt: { $gte: startDate, $lte: endDate }
    })
  ).populate('foodItemId', 'name');

  const dateMap = new Map();
  const itemUsageMap = new Map();

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
        foodItemId, foodItemName: log.foodItemId.name, timesUsed: 1, totalQuantity: log.quantity
      });
    }
  });

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
        foodItemId, foodItemName: item.foodItemId.name, timesUsed: 1, totalQuantity: item.quantity
      });
    }
  });

  wastedItems.forEach(item => {
    if (!item.foodItemId) return;
    const dateKey = item.createdAt.toISOString().split('T')[0];
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { date: dateKey, purchased: 0, used: 0, wasted: 0 });
    }
    dateMap.get(dateKey).wasted += item.quantity;
  });

  const consumptionTrend = Array.from(dateMap.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const topConsumedItems = Array.from(itemUsageMap.values())
    .sort((a, b) => b.timesUsed - a.timesUsed).slice(0, 10);

  const totalPurchased = consumptionTrend.reduce((sum, day) => sum + day.purchased, 0);
  const totalWasted = consumptionTrend.reduce((sum, day) => sum + day.wasted, 0);
  const wasteRate = totalPurchased > 0 ? (totalWasted / totalPurchased) * 100 : 0;

  return {
    consumptionTrend,
    topConsumedItems,
    wasteRate: Math.round(wasteRate * 100) / 100
  };
};

const getDashboardOverviewData = async (req) => {
  const viewFilter = buildViewFilter(req);
  const aggregateMatch = buildAggregateMatch(req);

  const totalFridgeItems = await FridgeItem.countDocuments(
    mergeViewFilter(viewFilter, {
      status: { $ne: 'used_up' }
    })
  );

  const expiringSoon = await FridgeItem.countDocuments(
    mergeViewFilter(viewFilter, {
      status: 'expiring_soon'
    })
  );

  const shoppingListCount = await ShoppingList.countDocuments(viewFilter);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisMonthWaste = await FridgeItem.aggregate([
    { $match: { ...aggregateMatch, status: 'expired', createdAt: { $gte: thisMonthStart } } },
    { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }
  ]);

  const lastMonthWaste = await FridgeItem.aggregate([
    { $match: { ...aggregateMatch, status: 'expired', createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
    { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }
  ]);

  const thisMonthWasteQty = thisMonthWaste[0]?.totalQuantity || 0;
  const lastMonthWasteQty = lastMonthWaste[0]?.totalQuantity || 0;
  
  let wasteReduction = 0;
  if (lastMonthWasteQty > 0) {
    wasteReduction = Math.round(((lastMonthWasteQty - thisMonthWasteQty) / lastMonthWasteQty) * 100);
  } else if (thisMonthWasteQty === 0 && lastMonthWasteQty === 0) {
    wasteReduction = 0;
  } else {
    wasteReduction = 100;
  }

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const wasteDataByMonth = await FridgeItem.aggregate([
    { $match: { ...aggregateMatch, status: 'expired', createdAt: { $gte: sixMonthsAgo } } },
    { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, waste: { $sum: '$quantity' } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6'];
  const wasteData = wasteDataByMonth.map((item, index) => ({
    month: monthNames[index] || `Tháng ${item._id.month}`,
    waste: Math.round(item.waste * 10) / 10
  }));

  const filledWasteData = [];
  for (let i = 0; i < 6; i++) {
    const existing = wasteData.find(d => d.month === monthNames[i]);
    filledWasteData.push(existing || { month: monthNames[i], waste: 0 });
  }

  const categoryDistribution = await FridgeItem.aggregate([
    { $match: { ...aggregateMatch, status: { $ne: 'used_up' } } },
    { $lookup: { from: 'fooditems', localField: 'foodItemId', foreignField: '_id', as: 'foodItem' } },
    { $unwind: { path: '$foodItem', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'categories', localField: 'foodItem.categoryId', foreignField: '_id', as: 'category' } },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    { $group: { _id: '$category.name' || 'Chưa phân loại', value: { $sum: '$quantity' } } },
    { $project: { name: '$_id', value: 1, _id: 0 } }
  ]);

  const totalCategoryValue = categoryDistribution.reduce((sum, item) => sum + item.value, 0);
  const categoryData = categoryDistribution.map(item => ({
    name: item.name || 'Chưa phân loại',
    value: Math.round(item.value),
    percentage: totalCategoryValue > 0 ? Math.round((item.value / totalCategoryValue) * 100) : 0
  })).sort((a, b) => b.value - a.value);

  return {
    totalFridgeItems,
    expiringSoon,
    shoppingListCount,
    wasteReduction,
    wasteData: filledWasteData,
    categoryData
  };
};

// Export functions
exports.exportPurchaseStatisticsCSV = async (req, res, next) => {
  try {
    const data = await getPurchaseStatisticsData(req);
    const csv = csvExport.exportPurchaseStatistics(data);
    const period = req.query.period || 'month';
    const filename = `bao-cao-mua-sam-${period}-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error in exportPurchaseStatisticsCSV:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xuất báo cáo CSV',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.exportWasteStatisticsCSV = async (req, res, next) => {
  try {
    const data = await getWasteStatisticsData(req);
    const csv = csvExport.exportWasteStatistics(data);
    const period = req.query.period || 'month';
    const filename = `bao-cao-lang-phi-${period}-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error in exportWasteStatisticsCSV:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xuất báo cáo CSV',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.exportConsumptionStatisticsCSV = async (req, res, next) => {
  try {
    const data = await getConsumptionStatisticsData(req);
    const csv = csvExport.exportConsumptionStatistics(data);
    const period = req.query.period || 'month';
    const filename = `bao-cao-tieu-thu-${period}-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error in exportConsumptionStatisticsCSV:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xuất báo cáo CSV',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.exportConsumptionStatisticsPDF = async (req, res, next) => {
  try {
    const data = await getConsumptionStatisticsData(req);
    const doc = pdfExport.exportConsumptionStatistics(data);
    const period = req.query.period || 'month';
    const filename = `bao-cao-tieu-thu-${period}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);
  } catch (error) {
    console.error('Error in exportConsumptionStatisticsPDF:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xuất báo cáo PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.exportDashboardOverviewCSV = async (req, res, next) => {
  try {
    const data = await getDashboardOverviewData(req);
    const csv = csvExport.exportDashboardOverview(data);
    const filename = `bao-cao-dashboard-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error in exportDashboardOverviewCSV:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xuất báo cáo CSV',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

