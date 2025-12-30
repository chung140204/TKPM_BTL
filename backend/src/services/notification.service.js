/**
 * Notification Service
 * Tự động tạo thông báo cho người dùng
 */

const FridgeItem = require('../models/FridgeItem.model');
const ShoppingList = require('../models/ShoppingList.model');
const MealPlan = require('../models/MealPlan.model');
const FamilyGroup = require('../models/FamilyGroup.model');
const Notification = require('../models/Notification.model');
const User = require('../models/User.model');

/**
 * @desc    Kiểm tra và tạo thông báo cho thực phẩm sắp hết hạn
 * @returns {Promise<Object>} Kết quả: { success, created, errors }
 */
exports.checkExpiringFridgeItems = async () => {
  try {
    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    // Lấy tất cả FridgeItems có status = "expiring_soon" hoặc sắp hết hạn trong 3 ngày
    const expiringItems = await FridgeItem.find({
      status: { $in: ['available', 'expiring_soon'] },
      expiryDate: {
        $gte: now,
        $lte: threeDaysLater
      },
      quantity: { $gt: 0 }
    })
      .populate('foodItemId', 'name')
      .populate('userId', 'email fullName');

    let createdCount = 0;
    const errors = [];

    // Group by userId để tránh spam notifications
    const userItemsMap = new Map();

    expiringItems.forEach(item => {
      if (!item.foodItemId || !item.userId) return;

      const userId = item.userId._id.toString();
      const daysLeft = item.getDaysLeft();

      // Chỉ tạo notification cho items còn 0-3 ngày
      if (daysLeft < 0 || daysLeft > 3) return;

      if (!userItemsMap.has(userId)) {
        userItemsMap.set(userId, []);
      }
      userItemsMap.get(userId).push({
        item,
        daysLeft
      });
    });

    // Tạo notification cho mỗi user
    for (const [userId, items] of userItemsMap) {
      try {
        // Kiểm tra xem đã có notification gần đây chưa (trong 24h)
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const existingNotification = await Notification.findOne({
          userId: userId,
          type: 'expiry_reminder',
          relatedId: { $in: items.map(i => i.item._id) },
          createdAt: { $gte: oneDayAgo }
        });

        if (existingNotification) {
          continue; // Đã có notification gần đây, bỏ qua
        }

        // Tạo notification cho từng item hoặc tổng hợp
        for (const { item, daysLeft } of items) {
          const foodItemName = item.foodItemId.name || 'Thực phẩm';
          const daysText = daysLeft === 0 ? 'hôm nay' : daysLeft === 1 ? '1 ngày nữa' : `${daysLeft} ngày nữa`;

          await Notification.create({
            userId: userId,
            type: 'expiry_reminder',
            title: 'Thực phẩm sắp hết hạn',
            message: `${foodItemName} sẽ hết hạn sau ${daysText}`,
            relatedId: item._id,
            relatedType: 'FridgeItem',
            isRead: false
          });

          createdCount++;
        }
      } catch (error) {
        errors.push({
          userId,
          error: error.message
        });
      }
    }

    return {
      success: true,
      created: createdCount,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    console.error('Error in checkExpiringFridgeItems:', error);
    return {
      success: false,
      created: 0,
      errors: [{ error: error.message }]
    };
  }
};

/**
 * @desc    Tạo thông báo khi có shopping list mới trong family group
 * @param   {String} shoppingListId - ID của shopping list
 * @returns {Promise<Object>} Kết quả: { success, created, errors }
 */
exports.notifyNewShoppingList = async (shoppingListId) => {
  try {
    const shoppingList = await ShoppingList.findById(shoppingListId)
      .populate('userId', 'email fullName')
      .populate('familyGroupId');

    if (!shoppingList) {
      return {
        success: false,
        created: 0,
        errors: [{ error: 'Shopping list not found' }]
      };
    }

    // Nếu không có familyGroupId, không cần notify
    if (!shoppingList.familyGroupId) {
      return {
        success: true,
        created: 0,
        message: 'Shopping list không thuộc family group'
      };
    }

    // Lấy family group
    const familyGroup = await FamilyGroup.findById(shoppingList.familyGroupId)
      .populate('members.userId', 'email fullName');

    if (!familyGroup) {
      return {
        success: false,
        created: 0,
        errors: [{ error: 'Family group not found' }]
      };
    }

    // Lấy danh sách member IDs (trừ creator)
    const creatorId = shoppingList.userId._id.toString();
    const memberIds = familyGroup.members
      .filter(member => member.userId._id.toString() !== creatorId)
      .map(member => member.userId._id);

    if (memberIds.length === 0) {
      return {
        success: true,
        created: 0,
        message: 'Không có thành viên khác trong family group'
      };
    }

    // Tạo notification cho mỗi member
    let createdCount = 0;
    const errors = [];

    for (const memberId of memberIds) {
      try {
        // Kiểm tra xem đã có notification chưa
        const existingNotification = await Notification.findOne({
          userId: memberId,
          type: 'shopping_update',
          relatedId: shoppingListId,
          createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Trong 1 giờ
        });

        if (existingNotification) {
          continue; // Đã có notification gần đây
        }

        await Notification.create({
          userId: memberId,
          type: 'shopping_update',
          title: 'Danh sách mua sắm mới',
          message: `${shoppingList.userId.fullName || shoppingList.userId.email} đã tạo danh sách mua sắm "${shoppingList.name}"`,
          relatedId: shoppingListId,
          relatedType: 'ShoppingList',
          isRead: false
        });

        createdCount++;
      } catch (error) {
        errors.push({
          userId: memberId,
          error: error.message
        });
      }
    }

    return {
      success: true,
      created: createdCount,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    console.error('Error in notifyNewShoppingList:', error);
    return {
      success: false,
      created: 0,
      errors: [{ error: error.message }]
    };
  }
};

/**
 * @desc    Tạo thông báo trước 1 ngày khi meal plan bắt đầu
 * @param   {String} mealPlanId - ID của meal plan
 * @returns {Promise<Object>} Kết quả: { success, created, errors }
 */
exports.notifyUpcomingMealPlan = async (mealPlanId) => {
  try {
    const mealPlan = await MealPlan.findById(mealPlanId)
      .populate('userId', 'email fullName')
      .populate('familyGroupId');

    if (!mealPlan) {
      return {
        success: false,
        created: 0,
        errors: [{ error: 'Meal plan not found' }]
      };
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const startDate = new Date(mealPlan.startDate);
    startDate.setHours(0, 0, 0, 0);

    // Kiểm tra xem meal plan có bắt đầu vào ngày mai không
    if (startDate.getTime() !== tomorrow.getTime()) {
      return {
        success: true,
        created: 0,
        message: 'Meal plan không bắt đầu vào ngày mai'
      };
    }

    // Lấy danh sách user cần notify
    let userIds = [mealPlan.userId._id];

    // Nếu có familyGroupId, thêm các member
    if (mealPlan.familyGroupId) {
      const familyGroup = await FamilyGroup.findById(mealPlan.familyGroupId)
        .populate('members.userId', 'email fullName');

      if (familyGroup) {
        const memberIds = familyGroup.members.map(member => member.userId._id);
        userIds = [...userIds, ...memberIds];
      }
    }

    // Loại bỏ duplicate
    userIds = [...new Set(userIds.map(id => id.toString()))];

    let createdCount = 0;
    const errors = [];

    for (const userId of userIds) {
      try {
        // Kiểm tra xem đã có notification chưa
        const existingNotification = await Notification.findOne({
          userId: userId,
          type: 'meal_reminder',
          relatedId: mealPlanId,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Trong 24h
        });

        if (existingNotification) {
          continue; // Đã có notification gần đây
        }

        await Notification.create({
          userId: userId,
          type: 'meal_reminder',
          title: 'Kế hoạch bữa ăn sắp bắt đầu',
          message: `Kế hoạch bữa ăn "${mealPlan.name}" sẽ bắt đầu vào ngày mai`,
          relatedId: mealPlanId,
          relatedType: 'MealPlan',
          isRead: false
        });

        createdCount++;
      } catch (error) {
        errors.push({
          userId: userId,
          error: error.message
        });
      }
    }

    return {
      success: true,
      created: createdCount,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    console.error('Error in notifyUpcomingMealPlan:', error);
    return {
      success: false,
      created: 0,
      errors: [{ error: error.message }]
    };
  }
};

/**
 * @desc    Kiểm tra và tạo thông báo cho tất cả meal plans sắp bắt đầu
 * @returns {Promise<Object>} Kết quả: { success, created, errors }
 */
exports.checkUpcomingMealPlans = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // Lấy tất cả meal plans bắt đầu vào ngày mai
    const upcomingMealPlans = await MealPlan.find({
      startDate: {
        $gte: tomorrow,
        $lte: tomorrowEnd
      }
    });

    let totalCreated = 0;
    const errors = [];

    for (const mealPlan of upcomingMealPlans) {
      const result = await exports.notifyUpcomingMealPlan(mealPlan._id);
      totalCreated += result.created;
      if (result.errors) {
        errors.push(...result.errors);
      }
    }

    return {
      success: true,
      created: totalCreated,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    console.error('Error in checkUpcomingMealPlans:', error);
    return {
      success: false,
      created: 0,
      errors: [{ error: error.message }]
    };
  }
};



