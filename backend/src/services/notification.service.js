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
const { sendExpiryEmail } = require('./email.service');

/**
 * @desc    Kiểm tra và tạo thông báo cho thực phẩm sắp hết hạn
 * @returns {Promise<Object>} Kết quả: { success, created, errors }
 */
exports.checkExpiringFridgeItems = async () => {
  try {
    // Use start of day for proper timezone handling
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    // Calculate 3 days from today (inclusive)
    const threeDaysLater = new Date(startOfToday);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    threeDaysLater.setHours(23, 59, 59, 999);

    // 1. Update status to 'expiring_soon' for items expiring within 3 days
    const expiringItems = await FridgeItem.find({
      status: 'available',
      expiryDate: {
        $gte: startOfToday,
        $lte: threeDaysLater
      },
      quantity: { $gt: 0 }
    })
      .populate('foodItemId', 'name')
      .populate('userId', 'email fullName');

    console.log(`[Notification Service] Tìm thấy ${expiringItems.length} items với status 'available' và expiryDate trong 0-3 ngày`);

    // Update status to expiring_soon
    const itemIdsToUpdate = expiringItems.map(item => item._id);
    if (itemIdsToUpdate.length > 0) {
      await FridgeItem.updateMany(
        { _id: { $in: itemIdsToUpdate } },
        { status: 'expiring_soon' }
      );
      console.log(`[Notification Service] Đã update ${itemIdsToUpdate.length} items thành status 'expiring_soon'`);
      // Refresh items after update
      for (const item of expiringItems) {
        item.status = 'expiring_soon';
      }
    }

    // 2. Handle expired items (expiryDate < today)
    const expiredItems = await FridgeItem.find({
      status: { $in: ['available', 'expiring_soon'] },
      expiryDate: { $lt: startOfToday },
      quantity: { $gt: 0 }
    })
      .populate('foodItemId', 'name')
      .populate('userId', 'email fullName');

    // Update expired items status
    const expiredIds = expiredItems.map(item => item._id);
    if (expiredIds.length > 0) {
      await FridgeItem.updateMany(
        { _id: { $in: expiredIds } },
        { status: 'expired' }
      );
    }

    // 3. Get all items in expiring_soon status (including newly updated ones)
    const allExpiringItems = await FridgeItem.find({
      status: 'expiring_soon',
      quantity: { $gt: 0 }
    })
      .populate('foodItemId', 'name')
      .populate('userId', 'email fullName');

    console.log(`[Notification Service] Tìm thấy ${allExpiringItems.length} items với status 'expiring_soon'`);

    let createdCount = 0;
    const errors = [];

    // 4. Create notifications for expiring items (no duplicates)
    for (const item of allExpiringItems) {
      if (!item.foodItemId || !item.userId) {
        console.log(`[Notification Service] Bỏ qua item ${item._id}: thiếu foodItemId hoặc userId`);
        continue;
      }

      const userId = item.userId._id || item.userId;
      const daysLeft = item.getDaysLeft();
      const foodItemName = item.foodItemId.name || 'Thực phẩm';

      console.log(`[Notification Service] Kiểm tra item: ${foodItemName}, daysLeft=${daysLeft}, userId=${userId}`);

      // Only create notifications for items within 0-3 days
      if (daysLeft < 0 || daysLeft > 3) {
        console.log(`[Notification Service] Bỏ qua ${foodItemName}: daysLeft=${daysLeft} (không trong khoảng 0-3)`);
        continue;
      }

      try {
        // Check if notification already exists for this item while in expiring_soon status
        const existingNotification = await Notification.findOne({
          userId: userId,
          type: 'expiring_soon',
          relatedId: item._id,
          relatedType: 'FridgeItem'
        });

        if (existingNotification) {
          continue; // Already has notification, skip
        }

        // Create notification
        const foodItemName = item.foodItemId.name || 'Thực phẩm';
        const daysText = daysLeft === 0 
          ? 'hôm nay' 
          : daysLeft === 1 
            ? 'còn 1 ngày nữa' 
            : `còn ${daysLeft} ngày nữa`;

        const notification = await Notification.create({
          userId: userId,
          type: 'expiring_soon',
          title: 'Thực phẩm sắp hết hạn',
          message: `${foodItemName} – ${daysText} sẽ hết hạn`,
          relatedId: item._id,
          relatedType: 'FridgeItem',
          isRead: false
        });

        console.log(`[Notification Service] ✅ Đã tạo notification cho ${foodItemName} (${daysLeft} ngày)`);
        createdCount++;

        // Gửi email thông báo sắp hết hạn (nếu cấu hình email)
        try {
          const userEmail = item.userId?.email;
          const userFullName = item.userId?.fullName;
          if (userEmail) {
            await sendExpiryEmail({
              to: userEmail,
              subject: notification.title,
              text: notification.message,
              html: `<p>Chào ${userFullName || ''},</p><p>${notification.message}</p><p>Vui lòng kiểm tra tủ lạnh và sử dụng thực phẩm này sớm để tránh lãng phí.</p>`
            });
          }
        } catch (emailError) {
          console.error('[Email] Lỗi khi gửi email sắp hết hạn:', emailError);
        }
      } catch (error) {
        errors.push({
          itemId: item._id.toString(),
          error: error.message
        });
      }
    }

    // 5. Create notifications for expired items (optional, one per item)
    for (const item of expiredItems) {
      if (!item.foodItemId || !item.userId) continue;

      const userId = item.userId._id;

      try {
        // Check if notification already exists
        const existingNotification = await Notification.findOne({
          userId: userId,
          type: 'expired',
          relatedId: item._id,
          relatedType: 'FridgeItem'
        });

        if (existingNotification) {
          continue; // Already has notification
        }

        // Create expired notification
        const foodItemName = item.foodItemId.name || 'Thực phẩm';
        const notification = await Notification.create({
          userId: userId,
          type: 'expired',
          title: 'Thực phẩm đã hết hạn',
          message: `Thực phẩm "${foodItemName}" đã hết hạn. Vui lòng xử lý.`,
          relatedId: item._id,
          relatedType: 'FridgeItem',
          isRead: false
        });

        createdCount++;

        // Gửi email thông báo hết hạn (nếu cấu hình email)
        try {
          const userEmail = item.userId?.email;
          const userFullName = item.userId?.fullName;
          if (userEmail) {
            await sendExpiryEmail({
              to: userEmail,
              subject: notification.title,
              text: notification.message,
              html: `<p>Chào ${userFullName || ''},</p><p>${notification.message}</p>`
            });
          }
        } catch (emailError) {
          console.error('[Email] Lỗi khi gửi email hết hạn:', emailError);
        }
      } catch (error) {
        errors.push({
          itemId: item._id.toString(),
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



