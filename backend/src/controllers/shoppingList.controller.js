/**
 * ShoppingList Controller
 * Xử lý logic cho quản lý danh sách mua sắm
 */

const ShoppingList = require('../models/ShoppingList.model');
const FridgeItem = require('../models/FridgeItem.model');
const Notification = require('../models/Notification.model');
const notificationService = require('../services/notification.service');
const { ROLES } = require('../config/roles');
const { buildViewFilter, resolveFamilyGroupId } = require('../utils/view');
// Require các models liên quan để Mongoose có thể populate
require('../models/FoodItem.model');
require('../models/Unit.model');

/**
 * Helper function: Check and create notification for a single FridgeItem
 * Creates notification immediately when item is expiring soon (0-3 days) or expired
 * @param {FridgeItem} fridgeItem - FridgeItem instance (must be populated with foodItemId)
 */
const checkAndCreateNotificationForItem = async (fridgeItem) => {
  try {
    if (!fridgeItem || !fridgeItem.foodItemId || fridgeItem.quantity <= 0) {
      console.log('[Notification] Skipping: invalid item or quantity <= 0');
      return;
    }

    // Ensure foodItemId is populated
    if (!fridgeItem.foodItemId.name) {
      await fridgeItem.populate('foodItemId', 'name');
    }

    // Ensure status is up to date using updateStatus method
    fridgeItem.updateStatus();
    
    // Calculate daysLeft - use method if available, otherwise calculate manually
    let daysLeft;
    if (typeof fridgeItem.getDaysLeft === 'function') {
      daysLeft = fridgeItem.getDaysLeft();
    } else {
      // Manual calculation fallback
      const now = new Date();
      const expiryDate = new Date(fridgeItem.expiryDate);
      const diffTime = expiryDate - now;
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // Ensure userId is ObjectId (not populated object)
    const userId = fridgeItem.userId._id || fridgeItem.userId;
    const familyContext = await notificationService.getFamilyGroupContext(fridgeItem.familyGroupId);
    const recipientIds = familyContext ? familyContext.memberIds : [userId];
    const scope = familyContext ? 'family' : 'personal';
    const familyGroupName = familyContext?.familyGroupName || null;
    const foodItemName = fridgeItem.foodItemId.name || 'Thực phẩm';
    const status = fridgeItem.status;

    // Ensure status is explicitly set based on daysLeft
    if (daysLeft >= 0 && daysLeft <= 3 && status !== 'expiring_soon') {
      fridgeItem.status = 'expiring_soon';
    } else if (daysLeft < 0 && status !== 'expired') {
      fridgeItem.status = 'expired';
    }
    
    // Save status if modified
    if (fridgeItem.isModified('status')) {
      await fridgeItem.save();
    }

    console.log(`[Notification] Checking item: ${foodItemName}, status: ${fridgeItem.status}, daysLeft: ${daysLeft}, expiryDate: ${fridgeItem.expiryDate}`);

    // Check if item is expiring soon (0-3 days) or expired
    if (daysLeft < 0) {
      // Item is expired
      const expiryDateStr = new Date(fridgeItem.expiryDate).toLocaleDateString('vi-VN');
      const message = `Thực phẩm "${foodItemName}" đã hết hạn (HSD: ${expiryDateStr}). Vui lòng xử lý.`;

      for (const recipientId of recipientIds) {
        const existingNotification = await Notification.findOne({
          userId: recipientId,
          type: 'expired',
          relatedId: fridgeItem._id,
          relatedType: 'FridgeItem'
        });

        if (existingNotification) {
          continue;
        }

        const notification = await Notification.create({
          userId: recipientId,
          type: 'expired',
          title: 'Thực phẩm đã hết hạn',
          message,
          relatedId: fridgeItem._id,
          relatedType: 'FridgeItem',
          scope,
          familyGroupId: familyContext?.familyGroupId || null,
          familyGroupName,
          actionUrl: '/fridge',
          actionLabel: notificationService.DEFAULT_ACTION_LABEL,
          isRead: false
        });
        await notificationService.sendNotificationEmail(notification, { userId: recipientId });
      }
    } else if (daysLeft >= 0 && daysLeft <= 3) {
      // Item is expiring soon (0-3 days)
      const expiryDateStr = new Date(fridgeItem.expiryDate).toLocaleDateString('vi-VN');
      let message;
      if (daysLeft === 0) {
        message = `Thực phẩm "${foodItemName}" sẽ hết hạn hôm nay (HSD: ${expiryDateStr}).`;
      } else if (daysLeft === 1) {
        message = `Thực phẩm "${foodItemName}" sẽ hết hạn trong 1 ngày (HSD: ${expiryDateStr}).`;
      } else {
        message = `Thực phẩm "${foodItemName}" sẽ hết hạn trong ${daysLeft} ngày (HSD: ${expiryDateStr}).`;
      }

      for (const recipientId of recipientIds) {
        const existingNotification = await Notification.findOne({
          userId: recipientId,
          type: 'expiring_soon',
          relatedId: fridgeItem._id,
          relatedType: 'FridgeItem'
        });

        if (existingNotification) {
          continue;
        }

        const notification = await Notification.create({
          userId: recipientId,
          type: 'expiring_soon',
          title: 'Thực phẩm sắp hết hạn',
          message,
          relatedId: fridgeItem._id,
          relatedType: 'FridgeItem',
          scope,
          familyGroupId: familyContext?.familyGroupId || null,
          familyGroupName,
          actionUrl: '/fridge',
          actionLabel: notificationService.DEFAULT_ACTION_LABEL,
          isRead: false
        });
        await notificationService.sendNotificationEmail(notification, {
          userId: recipientId,
          extraText: 'Vui long kiem tra tu lanh va su dung thuc pham nay som de tranh lang phi.',
          extraHtml: 'Vui long kiem tra tu lanh va su dung thuc pham nay som de tranh lang phi.'
        });
      }
    }
  } catch (error) {
    console.error('[Notification] Error in checkAndCreateNotificationForItem:', error);
    // Don't throw - notification failure shouldn't break shopping list completion
  }
};

/**
 * @desc    Tạo danh sách mua sắm tự động từ FridgeItem
 * @route   POST /api/shopping-lists/auto
 * @access  Private
 * 
 * Luồng nghiệp vụ:
 * 1. Lấy FridgeItem của user với status: expired, used_up, expiring_soon
 * 2. Nếu user đã có shopping list status = "draft" → update lại items
 * 3. Nếu chưa có → tạo mới
 * 4. Nếu không có item phù hợp → trả message
 */
exports.createAutoShoppingList = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (req.view === 'family' && req.user.role === ROLES.USER) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tạo danh sách mua sắm gia đình tự động'
      });
    }

    // Lấy FridgeItem của user với các status cần thiết
    const viewFilter = buildViewFilter(req);
    const fridgeItems = await FridgeItem.find({
      ...viewFilter,
      status: { $in: ['expired', 'used_up', 'expiring_soon'] }
    })
      .populate('foodItemId', 'name categoryId')
      .populate('unitId', 'name abbreviation');

    // Chuyển đổi FridgeItem thành ShoppingListItem
    // Filter và map, chỉ lấy items có foodItemId và unitId hợp lệ
    const items = fridgeItems
      .filter(fridgeItem => fridgeItem.foodItemId && fridgeItem.unitId)
      .map(fridgeItem => ({
        foodItemId: fridgeItem.foodItemId._id,
        unitId: fridgeItem.unitId._id,
        quantity: 1, // Default quantity = 1
        reason: fridgeItem.status, // expired, used_up, hoặc expiring_soon
        isBought: false,
        categoryId: fridgeItem.foodItemId?.categoryId || null
      }));

    // Nếu không có item phù hợp sau khi filter
    if (items.length === 0) {
      return res.json({
        success: true,
        message: 'Không có thực phẩm nào cần mua. Tủ lạnh của bạn đang ổn!',
        data: {
          shoppingList: null,
          itemsCount: 0
        }
      });
    }

    // Kiểm tra xem user đã có shopping list status = "draft" chưa
    let shoppingList = await ShoppingList.findOne({
      ...viewFilter,
      status: 'draft',
      isAutoGenerated: true
    });

    if (shoppingList) {
      // Update lại items
      shoppingList.items = items;
      shoppingList.name = `Danh sách đi chợ tự động - ${new Date().toLocaleDateString('vi-VN')}`;
      await shoppingList.save();
      
      await shoppingList.populate([
        {
          path: 'items.foodItemId',
          select: 'name categoryId image',
          populate: {
            path: 'categoryId',
            select: 'name'
          }
        },
        { path: 'items.unitId', select: 'name abbreviation' },
        { path: 'items.categoryId', select: 'name' }
      ]);

      return res.json({
        success: true,
        message: 'Đã cập nhật danh sách đi chợ tự động',
        data: {
          shoppingList,
          itemsCount: items.length,
          isUpdated: true
        }
      });
    } else {
      // Tạo mới
      shoppingList = await ShoppingList.create({
        userId: userId,
        familyGroupId: resolveFamilyGroupId(req),
        name: `Danh sách đi chợ tự động - ${new Date().toLocaleDateString('vi-VN')}`,
        items: items,
        status: 'draft',
        isAutoGenerated: true
      });

      await shoppingList.populate([
        {
          path: 'items.foodItemId',
          select: 'name categoryId image',
          populate: {
            path: 'categoryId',
            select: 'name'
          }
        },
        { path: 'items.unitId', select: 'name abbreviation' },
        { path: 'items.categoryId', select: 'name' }
      ]);

      return res.status(201).json({
        success: true,
        message: 'Đã tạo danh sách đi chợ tự động thành công',
        data: {
          shoppingList,
          itemsCount: items.length,
          isUpdated: false
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy danh sách mua sắm của user
 * @route   GET /api/shopping-lists
 * @access  Private
 * 
 * Luồng nghiệp vụ:
 * 1. Lấy userId từ req.user (từ auth middleware)
 * 2. Query ShoppingList của user
 * 3. Populate thông tin FoodItem (name)
 * 4. Sort mới nhất trước
 * 5. Trả về danh sách
 */
exports.getShoppingLists = async (req, res, next) => {
  try {
    const viewFilter = buildViewFilter(req);
    const shoppingLists = await ShoppingList.find(viewFilter)
      .populate({
        path: 'items.foodItemId',
        select: 'name image categoryId',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      })
      .populate('items.unitId', 'name abbreviation')
      .populate('items.categoryId', 'name')
      .sort({ createdAt: -1 }); // Mới nhất trước

    res.json({
      success: true,
      count: shoppingLists.length,
      data: {
        shoppingLists
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy chi tiết danh sách mua sắm
 * @route   GET /api/shopping-lists/:id
 * @access  Private
 */
exports.getShoppingListById = async (req, res, next) => {
  try {
    const viewFilter = buildViewFilter(req);
    const shoppingList = await ShoppingList.findOne({
      _id: req.params.id,
      ...viewFilter
    })
      .populate({
        path: 'items.foodItemId',
        select: 'name categoryId image',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      })
      .populate('items.unitId', 'name abbreviation')
      .populate('items.categoryId', 'name');

    if (!shoppingList) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh sách mua sắm'
      });
    }

    res.json({
      success: true,
      data: {
        shoppingList
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật item trong shopping list (quantity hoặc isBought)
 * @route   PUT /api/shopping-lists/:id/item/:itemId
 * @access  Private
 * 
 * Luồng nghiệp vụ:
 * 1. Tìm shopping list của user
 * 2. Tìm item trong items array
 * 3. Update quantity hoặc isBought
 * 4. Lưu và trả về
 */
exports.updateShoppingListItem = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { quantity, isBought } = req.body;

    // Tìm shopping list
    const viewFilter = buildViewFilter(req);
    const shoppingList = await ShoppingList.findOne({
      _id: id,
      ...viewFilter
    });

    if (!shoppingList) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh sách mua sắm'
      });
    }

    if (req.view === 'family' && req.user.role === ROLES.USER) {
      const onlyUpdatingBought = typeof isBought === 'boolean' && (quantity === undefined || quantity === null);
      if (!onlyUpdatingBought) {
        return res.status(403).json({
          success: false,
          message: 'Bạn chỉ có thể cập nhật trạng thái mua sắm trong nhóm gia đình'
        });
      }
    }

    // Tìm item trong array
    const item = shoppingList.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy item trong danh sách'
      });
    }

    // Update fields
    if (quantity !== undefined) {
      item.quantity = quantity;
    }
    if (isBought !== undefined) {
      item.isBought = isBought;
      item.purchasedBy = isBought ? req.user.id : null;
      item.purchasedAt = isBought ? new Date() : null;
    }

    await shoppingList.save();

    // Populate để trả về đầy đủ thông tin
    await shoppingList.populate([
      {
        path: 'items.foodItemId',
        select: 'name categoryId image',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      },
      { path: 'items.unitId', select: 'name abbreviation' },
      { path: 'items.categoryId', select: 'name' }
    ]);

    res.json({
      success: true,
      message: 'Đã cập nhật item thành công',
      data: {
        shoppingList,
        updatedItem: item
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Hoàn thành danh sách mua sắm
 * @route   PUT /api/shopping-lists/:id/complete
 * @access  Private
 * 
 * Luồng nghiệp vụ:
 * 1. Tìm shopping list của user
 * 2. Với mỗi item có isBought = true:
 *    - Kiểm tra xem đã có FridgeItem với cùng userId, foodItemId, expiryDate chưa
 *    - Nếu có: tăng quantity
 *    - Nếu chưa: tạo mới FridgeItem với source = "shopping_list"
 *    - Tự động cập nhật status dựa trên expiryDate
 * 3. Chuyển status shopping list sang "completed"
 * 4. Set completedAt = hiện tại
 * 5. Lưu và trả về
 */
exports.completeShoppingList = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const viewFilter = buildViewFilter(req);

    if (req.view === 'family' && req.user.role === ROLES.USER) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hoàn thành danh sách mua sắm gia đình'
      });
    }

    // Tìm shopping list của user
    const shoppingList = await ShoppingList.findOne({
      _id: req.params.id,
      ...viewFilter
    })
      .populate('items.foodItemId', 'name averageExpiryDays')
      .populate('items.unitId', 'name');

    if (!shoppingList) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh sách mua sắm'
      });
    }

    if (shoppingList.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Danh sách đã được hoàn thành rồi'
      });
    }

    // Lọc các items đã mua (isBought = true)
    const boughtItems = shoppingList.items.filter(item => item.isBought === true);

    if (boughtItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Chưa có item nào được đánh dấu là đã mua. Vui lòng đánh dấu các item đã mua trước khi hoàn thành.'
      });
    }

    // Xử lý từng item đã mua
    const fridgeItemsCreated = [];
    const fridgeItemsUpdated = [];

    for (const item of boughtItems) {
      // Validate item có foodItemId và unitId hợp lệ
      if (!item.foodItemId || !item.unitId) {
        console.warn(`Skipping item with invalid foodItemId or unitId: ${item._id}`);
        continue;
      }

      // Tính expiryDate: dùng expiryDate nếu có, nếu không thì dùng averageExpiryDays hoặc mặc định 7 ngày
      let expiryDate;
      if (item.expiryDate) {
        expiryDate = new Date(item.expiryDate);
      } else {
        const averageExpiryDays = item.foodItemId?.averageExpiryDays;
        const fallbackDays = averageExpiryDays && averageExpiryDays > 0 ? averageExpiryDays : 7;
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + fallbackDays);
      }

      const expiryDateStart = new Date(expiryDate);
      expiryDateStart.setHours(0, 0, 0, 0);
      const expiryDateEnd = new Date(expiryDateStart);
      expiryDateEnd.setDate(expiryDateEnd.getDate() + 1);

      // Kiểm tra xem đã có FridgeItem với cùng userId, foodItemId, expiryDate chưa
      // (và status không phải 'used_up')
      const storageLocationValue = item.foodItemId?.defaultStorageLocation || 'Ngăn mát';

      const familyGroupIdValue = resolveFamilyGroupId(req);
      const existingFridgeItemQuery = {
        foodItemId: item.foodItemId._id,
        unitId: item.unitId._id,
        expiryDate: { $gte: expiryDateStart, $lt: expiryDateEnd },
        storageLocation: storageLocationValue,
        familyGroupId: familyGroupIdValue,
        status: { $ne: 'used_up' }
      };

      if (req.view !== 'family') {
        existingFridgeItemQuery.userId = userId;
      }

      const existingFridgeItem = await FridgeItem.findOne(existingFridgeItemQuery)
        .populate('foodItemId', 'name')
        .populate('unitId', 'name abbreviation');

      if (existingFridgeItem) {
        // Tăng quantity
        existingFridgeItem.quantity += item.quantity;
        // Cập nhật status tự động dựa trên expiryDate
        existingFridgeItem.updateStatus();
        await existingFridgeItem.save();
        
        // Populate để có thể tạo notification
        await existingFridgeItem.populate('foodItemId', 'name');
        await existingFridgeItem.populate('unitId', 'name abbreviation');
        
        // Check and create notification for expiring/expired items (realtime)
        try {
          console.log(`[Notification] Attempting to create notification for updated fridgeItem from shopping list: ${existingFridgeItem._id}`);
          await checkAndCreateNotificationForItem(existingFridgeItem);
          console.log(`[Notification] Completed notification check for updated fridgeItem: ${existingFridgeItem._id}`);
        } catch (notifError) {
          console.error('[Notification] ❌ Error creating notification for updated fridge item:', notifError);
        }
        
        fridgeItemsUpdated.push({
          fridgeItemId: existingFridgeItem._id,
          foodItemId: existingFridgeItem.foodItemId._id,
          foodItemName: existingFridgeItem.foodItemId.name,
          unitId: existingFridgeItem.unitId._id,
          unitName: existingFridgeItem.unitId.name,
          newQuantity: existingFridgeItem.quantity,
          status: existingFridgeItem.status
        });
      } else {
        // Tạo mới FridgeItem
        const newFridgeItem = await FridgeItem.create({
          userId: userId,
          familyGroupId: resolveFamilyGroupId(req),
          foodItemId: item.foodItemId._id,
          quantity: item.quantity,
          unitId: item.unitId._id,
          expiryDate: expiryDateStart,
          storageLocation: storageLocationValue,
          source: 'shopping_list',
          sourceShoppingListId: shoppingList._id,
          purchaseDate: new Date(),
          // Status sẽ được tự động cập nhật bởi updateStatus()
        });

        // Cập nhật status tự động
        newFridgeItem.updateStatus();
        await newFridgeItem.save();

        // Populate để lấy tên
        await newFridgeItem.populate('foodItemId', 'name');
        await newFridgeItem.populate('unitId', 'name abbreviation');

        // Check and create notification for expiring/expired items (realtime)
        try {
          console.log(`[Notification] Attempting to create notification for new fridgeItem from shopping list: ${newFridgeItem._id}`);
          await checkAndCreateNotificationForItem(newFridgeItem);
          console.log(`[Notification] Completed notification check for new fridgeItem: ${newFridgeItem._id}`);
        } catch (notifError) {
          console.error('[Notification] ❌ Error creating notification for new fridge item:', notifError);
        }

        fridgeItemsCreated.push({
          fridgeItemId: newFridgeItem._id,
          foodItemId: newFridgeItem.foodItemId._id,
          foodItemName: newFridgeItem.foodItemId.name,
          unitId: newFridgeItem.unitId._id,
          unitName: newFridgeItem.unitId.name,
          quantity: newFridgeItem.quantity,
          status: newFridgeItem.status
        });
      }
    }

    // Chuyển status shopping list sang completed
    shoppingList.status = 'completed';
    shoppingList.completedAt = new Date();
    await shoppingList.save();

    // Populate để trả về đầy đủ thông tin
    await shoppingList.populate([
      {
        path: 'items.foodItemId',
        select: 'name categoryId image',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      },
      { path: 'items.unitId', select: 'name abbreviation' },
      { path: 'items.categoryId', select: 'name' }
    ]);

    res.json({
      success: true,
      message: 'Đã hoàn thành danh sách mua sắm và thêm thực phẩm vào tủ lạnh',
      data: {
        shoppingList,
        fridgeItemsCreated: fridgeItemsCreated.length,
        fridgeItemsUpdated: fridgeItemsUpdated.length,
        details: {
          created: fridgeItemsCreated,
          updated: fridgeItemsUpdated
        }
      }
    });
  } catch (error) {
    console.error('Error in completeShoppingList:', error);
    next(error);
  }
};

/**
 * @desc    Tạo danh sách mua sắm mới (manual)
 * @route   POST /api/shopping-lists
 * @access  Private
 */
exports.createShoppingList = async (req, res, next) => {
  try {
    const { name, items, plannedDate } = req.body;

    if (req.view === 'family' && req.user.role === ROLES.USER) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tạo danh sách mua sắm gia đình'
      });
    }

    const shoppingList = await ShoppingList.create({
      userId: req.user.id,
      familyGroupId: resolveFamilyGroupId(req),
      name: name || `Danh sách mua sắm - ${new Date().toLocaleDateString('vi-VN')}`,
      items: items || [],
      plannedDate: plannedDate || new Date(),
      status: 'draft',
      isAutoGenerated: false
    });

    await shoppingList.populate([
      {
        path: 'items.foodItemId',
        select: 'name categoryId image',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      },
      { path: 'items.unitId', select: 'name abbreviation' },
      { path: 'items.categoryId', select: 'name' }
    ]);

    // Tự động tạo notification cho family members (nếu có familyGroupId)
    if (shoppingList.familyGroupId) {
      try {
        await notificationService.notifyNewShoppingList(shoppingList._id);
      } catch (error) {
        // Log error nhưng không fail request
        console.error('Error notifying family members:', error);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Tạo danh sách mua sắm thành công',
      data: {
        shoppingList
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật danh sách mua sắm
 * @route   PUT /api/shopping-lists/:id
 * @access  Private
 */
exports.updateShoppingList = async (req, res, next) => {
  try {
    const viewFilter = buildViewFilter(req);
    const shoppingList = await ShoppingList.findOne({
      _id: req.params.id,
      ...viewFilter
    });

    if (!shoppingList) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh sách mua sắm'
      });
    }

    if (req.view === 'family' && req.user.role === ROLES.USER) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật danh sách mua sắm gia đình'
      });
    }

    const { name, items, plannedDate, status } = req.body;

    if (name) shoppingList.name = name;
    if (items) shoppingList.items = items;
    if (plannedDate) shoppingList.plannedDate = plannedDate;
    if (status) shoppingList.status = status;

    await shoppingList.save();

    await shoppingList.populate([
      {
        path: 'items.foodItemId',
        select: 'name categoryId image',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      },
      { path: 'items.unitId', select: 'name abbreviation' },
      { path: 'items.categoryId', select: 'name' }
    ]);

    res.json({
      success: true,
      message: 'Cập nhật danh sách mua sắm thành công',
      data: {
        shoppingList
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa danh sách mua sắm
 * @route   DELETE /api/shopping-lists/:id
 * @access  Private
 */
exports.deleteShoppingList = async (req, res, next) => {
  try {
    if (req.view === 'family' && req.user.role === ROLES.USER) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa danh sách mua sắm gia đình'
      });
    }

    const viewFilter = buildViewFilter(req);
    const shoppingList = await ShoppingList.findOneAndDelete({
      _id: req.params.id,
      ...viewFilter
    });

    if (!shoppingList) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh sách mua sắm'
      });
    }

    res.json({
      success: true,
      message: 'Xóa danh sách mua sắm thành công'
    });
  } catch (error) {
    next(error);
  }
};
