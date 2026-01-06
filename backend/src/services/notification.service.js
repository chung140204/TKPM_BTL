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

const DEFAULT_ACTION_LABEL = 'Nhấn vào đây để xem chi tiết';
const DEFAULT_CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const getFamilyGroupContext = async (familyGroupId) => {
  if (!familyGroupId) return null;
  const familyGroup = await FamilyGroup.findById(familyGroupId)
    .populate('members.userId', 'email fullName');
  if (!familyGroup) return null;
  const memberIds = familyGroup.members.map(member => member.userId._id);
  return {
    familyGroupId: familyGroup._id,
    familyGroupName: familyGroup.name,
    memberIds
  };
};

const createNotificationForUsers = async (userIds, payload) => {
  const notifications = [];
  for (const userId of userIds) {
    notifications.push({
      userId,
      ...payload
    });
  }
  if (notifications.length === 0) return [];
  return Notification.insertMany(notifications);
};

exports.getFamilyGroupContext = getFamilyGroupContext;
exports.createNotificationForUsers = createNotificationForUsers;
exports.DEFAULT_ACTION_LABEL = DEFAULT_ACTION_LABEL;
exports.DEFAULT_CLIENT_URL = DEFAULT_CLIENT_URL;

exports.sendNotificationEmail = async (notification, options = {}) => {
  try {
    const { userId, user, extraText, extraHtml } = options;
    let targetUser = user;
    if (!targetUser || !targetUser.email) {
      const lookupId = userId || notification.userId;
      targetUser = await User.findById(lookupId).select('email fullName');
    }

    if (!targetUser || !targetUser.email) {
      return;
    }

    const greetingName = targetUser.fullName || targetUser.email;
    const scopeLabel = notification.scope === 'family'
      ? (notification.familyGroupName ? `Gia đình ${notification.familyGroupName}` : 'Gia đình')
      : 'Cá nhân';
    const actionLabel = notification.actionLabel || DEFAULT_ACTION_LABEL;
    const actionUrl = notification.actionUrl
      ? (notification.actionUrl.startsWith('http')
        ? notification.actionUrl
        : `${DEFAULT_CLIENT_URL}${notification.actionUrl}`)
      : null;
    const actorLine = notification.actorName ? `Người thực hiện: ${notification.actorName}` : null;

    const textParts = [
      `Chào ${greetingName},`,
      '',
      `[${scopeLabel}] ${notification.title}`,
      notification.message
    ];

    if (actorLine) {
      textParts.push(actorLine);
    }

    if (extraText) {
      textParts.push(extraText);
    }

    if (actionUrl) {
      textParts.push(`${actionLabel}: ${actionUrl}`);
    }

    const text = textParts.join('\n');

    const htmlParts = [
      `<p>Chào ${greetingName},</p>`,
      `<p><strong>[${scopeLabel}] ${notification.title}</strong></p>`,
      `<p>${notification.message}</p>`
    ];

    if (actorLine) {
      htmlParts.push(`<p>${actorLine}</p>`);
    }

    if (extraHtml) {
      htmlParts.push(`<p>${extraHtml}</p>`);
    }

    if (actionUrl) {
      htmlParts.push(`<p><a href="${actionUrl}">${actionLabel}</a></p>`);
    }

    await sendExpiryEmail({
      to: targetUser.email,
      subject: notification.title,
      text,
      html: htmlParts.join('')
    });
  } catch (error) {
    console.error('[Email] Lỗi khi gửi email thông báo:', error);
  }
};

/**
 * @desc    Kiểm tra và tạo thông báo cho thực phẩm sắp hết hạn
 * @returns {Promise<Object>} Kết quả: { success, created, errors }
 */
exports.checkExpiringFridgeItems = async (options = {}) => {
  try {
    const { sendEmail = true } = options;
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

    const familyContextCache = new Map();
    const resolveFamilyContext = async (familyGroupId) => {
      if (!familyGroupId) return null;
      const key = familyGroupId.toString();
      if (familyContextCache.has(key)) {
        return familyContextCache.get(key);
      }
      const context = await getFamilyGroupContext(familyGroupId);
      familyContextCache.set(key, context);
      return context;
    };

    const createScopedNotifications = async ({ item, type, title, message }) => {
      const familyContext = await resolveFamilyContext(item.familyGroupId);
      const recipientIds = familyContext ? familyContext.memberIds : [item.userId._id || item.userId];
      const scope = familyContext ? 'family' : 'personal';
      const familyGroupName = familyContext?.familyGroupName || null;

      for (const recipientId of recipientIds) {
        const existingNotification = await Notification.findOne({
          userId: recipientId,
          type,
          relatedId: item._id,
          relatedType: 'FridgeItem'
        });

        if (existingNotification) {
          continue;
        }

        const notification = await Notification.create({
          userId: recipientId,
          type,
          title,
          message,
          relatedId: item._id,
          relatedType: 'FridgeItem',
          scope,
          familyGroupId: familyContext?.familyGroupId || null,
          familyGroupName,
          actionUrl: '/fridge',
          actionLabel: DEFAULT_ACTION_LABEL,
          isRead: false
        });

        createdCount++;

        if (sendEmail) {
          await exports.sendNotificationEmail(notification, { userId: recipientId });
        }
      }
    };

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
        const daysText = daysLeft === 0
          ? 'hôm nay'
          : daysLeft === 1
            ? 'còn 1 ngày nữa'
            : `còn ${daysLeft} ngày nữa`;

        await createScopedNotifications({
          item,
          type: 'expiring_soon',
          title: 'Thực phẩm sắp hết hạn',
          message: `${foodItemName} – ${daysText} sẽ hết hạn`
        });

        console.log(`[Notification Service] ✅ Đã tạo notification cho ${foodItemName} (${daysLeft} ngày)`);
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
        const foodItemName = item.foodItemId.name || 'Thực phẩm';
        await createScopedNotifications({
          item,
          type: 'expired',
          title: 'Thực phẩm đã hết hạn',
          message: `Thực phẩm "${foodItemName}" đã hết hạn. Vui lòng xử lý.`
        });
      } catch (error) {
        errors.push({
          itemId: item._id.toString(),
          error: error.message
        });
      }
    }

    if (sendEmail) {
      // 6. Gửi email nhac hang ngay luc 08:00
      const dailyExpiringItems = await FridgeItem.find({
        status: 'expiring_soon',
        quantity: { $gt: 0 }
      })
        .populate('foodItemId', 'name')
        .populate('userId', 'email fullName');

      const dailyExpiredItems = await FridgeItem.find({
        status: 'expired',
        quantity: { $gt: 0 }
      })
        .populate('foodItemId', 'name')
        .populate('userId', 'email fullName');

      const userItemMap = new Map();
      const familyEmailCache = new Map();

      const getFamilyEmailContext = async (familyGroupId) => {
        if (!familyGroupId) return null;
        const key = familyGroupId.toString();
        if (familyEmailCache.has(key)) {
          return familyEmailCache.get(key);
        }
        const familyGroup = await FamilyGroup.findById(familyGroupId)
          .populate('members.userId', 'email fullName');
        if (!familyGroup) {
          familyEmailCache.set(key, null);
          return null;
        }
        const context = {
          name: familyGroup.name,
          members: familyGroup.members.map(member => ({
            id: member.userId._id,
            email: member.userId.email,
            fullName: member.userId.fullName
          }))
        };
        familyEmailCache.set(key, context);
        return context;
      };

      const addItemForUser = (userId, item, groupKey, familyGroupName) => {
        if (!userId) return;
        const userKey = userId.toString();
        if (!userItemMap.has(userKey)) {
          userItemMap.set(userKey, {
            expiring: [],
            expired: [],
            expiringSet: new Set(),
            expiredSet: new Set()
          });
        }

        const entry = userItemMap.get(userKey);
        const itemKey = item._id.toString();
        const setKey = groupKey === 'expiring' ? 'expiringSet' : 'expiredSet';
        if (entry[setKey].has(itemKey)) {
          return;
        }

        entry[setKey].add(itemKey);
        entry[groupKey].push({ item, familyGroupName });
      };

      for (const item of dailyExpiringItems) {
        if (item.familyGroupId) {
          const familyContext = await getFamilyEmailContext(item.familyGroupId);
          if (familyContext) {
            familyContext.members.forEach(member => addItemForUser(member.id, item, 'expiring', familyContext.name));
          }
        } else {
          addItemForUser(item.userId?._id || item.userId, item, 'expiring', null);
        }
      }

      for (const item of dailyExpiredItems) {
        if (item.familyGroupId) {
          const familyContext = await getFamilyEmailContext(item.familyGroupId);
          if (familyContext) {
            familyContext.members.forEach(member => addItemForUser(member.id, item, 'expired', familyContext.name));
          }
        } else {
          addItemForUser(item.userId?._id || item.userId, item, 'expired', null);
        }
      }

      const recipientIds = Array.from(userItemMap.keys());
      const users = await User.find({ _id: { $in: recipientIds } }).select('email fullName');
      const userMap = new Map(users.map(user => [user._id.toString(), user]));

      for (const [userId, entry] of userItemMap.entries()) {
        const user = userMap.get(userId);
        if (!user || !user.email) {
          continue;
        }

        const { expiring, expired } = entry;
        if (expiring.length === 0 && expired.length === 0) {
          continue;
        }

        const todayText = new Date().toLocaleDateString('vi-VN');
        const greetingName = user.fullName || user.email;
        const subject = 'Thong bao thuc pham hang ngay';

        const expiringLines = expiring.map(({ item, familyGroupName }) => {
          const foodName = item.foodItemId?.name || 'Thuc pham';
          const expiryDate = new Date(item.expiryDate).toLocaleDateString('vi-VN');
          const daysLeft = typeof item.getDaysLeft === 'function' ? item.getDaysLeft() : null;
          const daysText = Number.isFinite(daysLeft) ? `con ${daysLeft} ngay` : 'sap het han';
          const groupLabel = familyGroupName ? ` (Nhom: ${familyGroupName})` : '';
          return `- ${foodName} (HSD: ${expiryDate}, ${daysText})${groupLabel}`;
        });

        const expiredLines = expired.map(({ item, familyGroupName }) => {
          const foodName = item.foodItemId?.name || 'Thuc pham';
          const expiryDate = new Date(item.expiryDate).toLocaleDateString('vi-VN');
          const groupLabel = familyGroupName ? ` (Nhom: ${familyGroupName})` : '';
          return `- ${foodName} (HSD: ${expiryDate})${groupLabel}`;
        });

        const textParts = [
          `Chao ${greetingName},`,
          '',
          `Thong bao thuc pham ngay ${todayText}:`
        ];

        if (expiringLines.length > 0) {
          textParts.push('', 'Thuc pham sap het han (0-3 ngay):', ...expiringLines);
        }

        if (expiredLines.length > 0) {
          textParts.push('', 'Thuc pham da het han:', ...expiredLines);
        }

        textParts.push('', 'Vui long kiem tra tu lanh va xu ly kip thoi.');

        const text = textParts.join('\n');

        const expiringHtml = expiringLines.length
          ? `<p><strong>Thuc pham sap het han (0-3 ngay):</strong></p><ul>${expiringLines.map(line => `<li>${line.slice(2)}</li>`).join('')}</ul>`
          : '';
        const expiredHtml = expiredLines.length
          ? `<p><strong>Thuc pham da het han:</strong></p><ul>${expiredLines.map(line => `<li>${line.slice(2)}</li>`).join('')}</ul>`
          : '';

        const html = `
          <p>Chao ${greetingName},</p>
          <p>Thong bao thuc pham ngay ${todayText}:</p>
          ${expiringHtml}
          ${expiredHtml}
          <p>Vui long kiem tra tu lanh va xu ly kip thoi.</p>
        `;

        try {
          await sendExpiryEmail({
            to: user.email,
            subject,
            text,
            html
          });
        } catch (emailError) {
          console.error('[Email] Loi khi gui email hang ngay:', emailError);
        }
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

    // Lấy danh sách member IDs (bao gồm cả creator)
    const memberIds = familyGroup.members.map(member => member.userId._id);

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

        const notification = await Notification.create({
          userId: memberId,
          type: 'shopping_update',
          title: 'Danh sách mua sắm mới',
          message: `${shoppingList.userId.fullName || shoppingList.userId.email} đã tạo danh sách mua sắm "${shoppingList.name}"`,
          relatedId: shoppingListId,
          relatedType: 'ShoppingList',
          scope: 'family',
          familyGroupId: familyGroup._id,
          familyGroupName: familyGroup.name,
          actorId: shoppingList.userId._id,
          actorName: shoppingList.userId.fullName || shoppingList.userId.email,
          actionUrl: '/shopping',
          actionLabel: DEFAULT_ACTION_LABEL,
          isRead: false
        });

        createdCount++;

        await exports.sendNotificationEmail(notification, { userId: memberId });
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

    const familyGroupContext = mealPlan.familyGroupId
      ? await getFamilyGroupContext(mealPlan.familyGroupId)
      : null;
    const scope = familyGroupContext ? 'family' : 'personal';
    const familyGroupName = familyGroupContext?.familyGroupName || null;

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

        const notification = await Notification.create({
          userId: userId,
          type: 'meal_reminder',
          title: 'Kế hoạch bữa ăn sắp bắt đầu',
          message: `Kế hoạch bữa ăn "${mealPlan.name}" sẽ bắt đầu vào ngày mai`,
          relatedId: mealPlanId,
          relatedType: 'MealPlan',
          scope,
          familyGroupId: familyGroupContext?.familyGroupId || null,
          familyGroupName,
          actionUrl: '/meal-planner',
          actionLabel: DEFAULT_ACTION_LABEL,
          isRead: false
        });

        createdCount++;

        await exports.sendNotificationEmail(notification, { userId });
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
