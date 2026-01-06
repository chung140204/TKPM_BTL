/**
 * FridgeItem Controller
 * Xử lý logic cho quản lý tủ lạnh
 */

const FridgeItem = require('../models/FridgeItem.model');
const FoodItem = require('../models/FoodItem.model');
const Unit = require('../models/Unit.model');
const Category = require('../models/Category.model');
const ConsumptionLog = require('../models/ConsumptionLog.model');
const Notification = require('../models/Notification.model');
const notificationService = require('../services/notification.service');
const { ROLES } = require('../config/roles');
const { buildViewFilter, resolveFamilyGroupId } = require('../utils/view');
// Require các models liên quan để Mongoose có thể populate
require('../models/FoodItem.model');
require('../models/Unit.model');

const normalizeDate = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Helper function: Check and create notification for a single FridgeItem
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

    // Ensure status is explicitly set based on daysLeft (as per requirements)
    // If daysLeft <= 3 and >= 0, set status to 'expiring_soon'
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
    // Priority: expired first, then expiring_soon
    if (daysLeft < 0) {
      // Item is expired
      // Check if notification already exists for this specific fridgeItem
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

      console.log(`[Notification] ✅ Created expired notification for: ${foodItemName} (expiryDate: ${expiryDateStr})`);
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

      console.log(`[Notification] ✅ Created expiring_soon notification for: ${foodItemName} (${daysLeft} days left, expiryDate: ${expiryDateStr})`);
    } else {
      console.log(`[Notification] ⏭️  Skipping notification for ${foodItemName}: daysLeft=${daysLeft} (not expiring soon or expired)`);
    }
  } catch (error) {
    console.error('[Notification] Error in checkAndCreateNotificationForItem:', error);
    throw error;
  }
};

/**
 * @desc    Lấy danh sách thực phẩm trong tủ lạnh
 * @route   GET /api/fridge-items
 * @access  Private
 * 
 * Query params:
 * - status: available, expiring_soon, expired, used_up
 * - categoryId: filter theo danh mục
 * - storageLocation: filter theo vị trí lưu trữ
 */
exports.getFridgeItems = async (req, res, next) => {
  try {
    const { status, categoryId, storageLocation } = req.query;
    const query = buildViewFilter(req);
    
    if (status) query.status = status;
    if (storageLocation) query.storageLocation = storageLocation;
    
    let fridgeItems = await FridgeItem.find(query)
      .populate({
        path: 'foodItemId',
        select: 'name categoryId image',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      })
      .populate('unitId', 'name abbreviation')
      .sort({ expiryDate: 1 });

    // Filter theo categoryId nếu có (sau khi populate)
    if (categoryId) {
      fridgeItems = fridgeItems.filter(item => 
        item.foodItemId?.categoryId?.toString() === categoryId
      );
    }

    // Tự động cập nhật status dựa trên expiryDate
    for (const item of fridgeItems) {
      const oldStatus = item.status;
      item.updateStatus();
      
      // Chỉ lưu nếu status thay đổi
      if (item.status !== oldStatus) {
        await item.save();
      }
    }

    res.json({
      success: true,
      count: fridgeItems.length,
      data: { fridgeItems }
    });
  } catch (error) {
    next(error);
  }
};

exports.getExpiringItems = async (req, res, next) => {
  try {
    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const viewFilter = buildViewFilter(req);
    // Query thực phẩm sắp hết hạn (trong 3 ngày tới)
    let fridgeItems = await FridgeItem.find({
      ...viewFilter,
      expiryDate: {
        $gte: now,           // Chưa hết hạn
        $lte: threeDaysLater // Trong 3 ngày tới
      },
      status: { $in: ['available', 'expiring_soon'] }
    })
      .populate('foodItemId', 'name categoryId image averageExpiryDays')
      .populate('unitId', 'name abbreviation')
      .sort({ expiryDate: 1 });

    // Cập nhật status cho các items (sử dụng method updateStatus)
    for (const item of fridgeItems) {
      const oldStatus = item.status;
      item.updateStatus();
      
      // Chỉ lưu nếu status thay đổi
      if (item.status !== oldStatus) {
        await item.save();
      }
    }

    // Tính số ngày còn lại cho mỗi item (sử dụng method getDaysLeft)
    const itemsWithDaysLeft = fridgeItems.map(item => {
      const daysLeft = item.getDaysLeft();
      
      return {
        ...item.toObject(),
        daysLeft: daysLeft
      };
    });

    res.json({
      success: true,
      count: itemsWithDaysLeft.length,
      data: { 
        fridgeItems: itemsWithDaysLeft,
        message: `Có ${itemsWithDaysLeft.length} thực phẩm sắp hết hạn trong 3 ngày tới`
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getFridgeItemById = async (req, res, next) => {
  try {
    const viewFilter = buildViewFilter(req);
    const fridgeItem = await FridgeItem.findOne({
      _id: req.params.id,
      ...viewFilter
    })
      .populate({
        path: 'foodItemId',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      })
      .populate('unitId');

    if (!fridgeItem) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thực phẩm'
      });
    }

    res.json({
      success: true,
      data: { fridgeItem }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Thêm thực phẩm vào tủ lạnh
 * @route   POST /api/fridge-items
 * @access  Private
 * 
 * Luồng nghiệp vụ:
 * 1. Validate input
 * 2. Kiểm tra đã tồn tại FridgeItem với cùng userId, foodItemId, expiryDate chưa
 * 3. Nếu tồn tại: Cộng quantity vào item cũ
 * 4. Nếu chưa tồn tại: Tạo FridgeItem mới với userId từ req.user
 * 5. Tự động tính status dựa trên expiryDate
 * 6. Trả về FridgeItem đã tạo hoặc đã cập nhật
 */
exports.createFridgeItem = async (req, res, next) => {
  try {
    const { expiryDate, foodItemId, quantity, ...otherData } = req.body;

    
    // Validate required fields
    if (!foodItemId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'foodItemId và quantity là bắt buộc'
      });
    }

    const finalExpiryDate = normalizeDate(expiryDate || new Date());
    if (!finalExpiryDate) {
      return res.status(400).json({
        success: false,
        message: 'expiryDate không hợp lệ'
      });
    }
    const expiryDateStart = new Date(finalExpiryDate);
    const expiryDateEnd = new Date(finalExpiryDate);
    expiryDateEnd.setDate(expiryDateEnd.getDate() + 1);
    const storageLocationValue = otherData.storageLocation || 'Ngăn mát';
    const familyGroupIdValue = resolveFamilyGroupId(req);
    
    // Kiểm tra đã tồn tại FridgeItem với cùng foodItemId, expiryDate
    const existingItemQuery = {
      foodItemId: foodItemId,
      unitId: otherData.unitId,
      expiryDate: { $gte: expiryDateStart, $lt: expiryDateEnd },
      storageLocation: storageLocationValue,
      familyGroupId: familyGroupIdValue,
      status: { $ne: 'used_up' } // Chỉ kiểm tra items chưa hết
    };

    if (req.view !== 'family') {
      existingItemQuery.userId = req.user.id;
    }

    const existingItem = await FridgeItem.findOne(existingItemQuery);

    let fridgeItem;
    let isNewItem = false;

    if (existingItem) {
      // Nếu đã tồn tại: Cộng quantity vào item cũ
      existingItem.quantity += quantity;
      
      // Tự động cập nhật status dựa trên expiryDate
      existingItem.updateStatus();
      await existingItem.save();
      
      await existingItem.populate(['foodItemId', 'unitId']);
      fridgeItem = existingItem;
    } else {
      // Nếu chưa tồn tại: Tạo FridgeItem mới
      isNewItem = true;
      fridgeItem = await FridgeItem.create({
        ...otherData,
        foodItemId,
        quantity,
        expiryDate: finalExpiryDate,
        storageLocation: storageLocationValue,
        familyGroupId: familyGroupIdValue,
        userId: req.user.id
      });

      // Tự động cập nhật status dựa trên expiryDate
      fridgeItem.updateStatus();
      await fridgeItem.save();

      await fridgeItem.populate(['foodItemId', 'unitId']);
    }

    // Ensure status is up to date before checking notification
    fridgeItem.updateStatus();
    if (fridgeItem.isModified('status')) {
      await fridgeItem.save();
    }

    // Check and create notification for expiring/expired items (realtime)
    try {
      console.log(`[Notification] Attempting to create notification for fridgeItem: ${fridgeItem._id}`);
      await checkAndCreateNotificationForItem(fridgeItem);
      console.log(`[Notification] Completed notification check for fridgeItem: ${fridgeItem._id}`);
    } catch (notifError) {
      console.error('[Notification] ❌ Error creating notification for fridge item:', notifError);
      console.error('[Notification] Error stack:', notifError.stack);
      // Don't fail the request if notification creation fails
    }

    res.status(isNewItem ? 201 : 200).json({
      success: true,
      message: isNewItem 
        ? 'Thêm thực phẩm vào tủ lạnh thành công'
        : 'Đã cộng thêm số lượng vào thực phẩm hiện có',
      data: { 
        fridgeItem,
        isNewItem 
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật thực phẩm trong tủ lạnh
 * @route   PUT /api/fridge-items/:id
 * @access  Private
 * 
 * Luồng nghiệp vụ:
 * 1. Kiểm tra quyền (chỉ owner mới được sửa)
 * 2. Cập nhật FridgeItem
 * 3. Tự động cập nhật status nếu expiryDate thay đổi
 * 4. Trả về FridgeItem đã cập nhật
 */
exports.updateFridgeItem = async (req, res, next) => {
  try {
    let fridgeItem = await FridgeItem.findById(req.params.id);

    if (!fridgeItem) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thực phẩm'
      });
    }

    if (req.view === 'family') {
      if (!fridgeItem.familyGroupId || !req.familyGroup || fridgeItem.familyGroupId.toString() !== req.familyGroup._id.toString()) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thực phẩm trong nhóm gia đình'
        });
      }

      if (req.user.role === ROLES.USER) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền cập nhật thực phẩm trong nhóm gia đình'
        });
      }
    } else {
      // Kiểm tra quyền
      if (fridgeItem.userId.toString() !== req.user.id.toString() || fridgeItem.familyGroupId) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ chủ sở hữu mới được cập nhật thực phẩm này'
        });
      }
    }

    // Cập nhật
    const updates = { ...req.body };
    delete updates.userId;
    delete updates.familyGroupId;
    Object.assign(fridgeItem, updates);
    
    // Tự động cập nhật status (luôn gọi để đảm bảo status chính xác)
    fridgeItem.updateStatus();
    
    await fridgeItem.save();
    await fridgeItem.populate(['foodItemId', 'unitId']);

    // Ensure status is up to date
    fridgeItem.updateStatus();
    if (fridgeItem.isModified('status')) {
      await fridgeItem.save();
    }

    // Check and create notification for expiring/expired items (realtime)
    try {
      console.log(`[Notification] Attempting to create notification for updated fridgeItem: ${fridgeItem._id}`);
      await checkAndCreateNotificationForItem(fridgeItem);
      console.log(`[Notification] Completed notification check for updated fridgeItem: ${fridgeItem._id}`);
    } catch (notifError) {
      console.error('[Notification] ❌ Error creating notification for updated fridge item:', notifError);
      console.error('[Notification] Error stack:', notifError.stack);
      // Don't fail the request if notification creation fails
    }

    res.json({
      success: true,
      message: 'Cập nhật thực phẩm thành công',
      data: { fridgeItem }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Sử dụng thực phẩm (trừ số lượng)
 * @route   PUT /api/fridge-items/:id/use
 * @access  Private
 * 
 * Luồng nghiệp vụ:
 * 1. Kiểm tra quyền (chỉ owner mới được sử dụng)
 * 2. Lấy usedQuantity từ req.body
 * 3. Trừ usedQuantity khỏi fridgeItem.quantity
 * 4. Nếu quantity <= 0:
 *    - Set quantity = 0
 *    - Set status = 'used_up'
 * 5. Lưu và trả về FridgeItem đã cập nhật
 */
exports.useFridgeItem = async (req, res, next) => {
  try {
    const { usedQuantity } = req.body;

    // Validate usedQuantity
    if (!usedQuantity || usedQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng sử dụng phải lớn hơn 0'
      });
    }

    // Tìm FridgeItem
    const fridgeItem = await FridgeItem.findById(req.params.id);

    if (!fridgeItem) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thực phẩm'
      });
    }

    if (req.view === 'family') {
      if (!fridgeItem.familyGroupId || !req.familyGroup || fridgeItem.familyGroupId.toString() !== req.familyGroup._id.toString()) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thực phẩm trong nhóm gia đình'
        });
      }

      if (req.user.role === ROLES.USER) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền sử dụng thực phẩm trong nhóm gia đình'
        });
      }
    } else {
      // Kiểm tra quyền (chỉ user sở hữu mới được dùng)
      if (fridgeItem.userId.toString() !== req.user.id.toString() || fridgeItem.familyGroupId) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ chủ sở hữu mới được sử dụng thực phẩm này'
        });
      }
    }

    // Kiểm tra số lượng hiện có
    if (fridgeItem.quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Thực phẩm đã hết, không thể sử dụng thêm'
      });
    }

    // Trừ usedQuantity khỏi quantity
    const newQuantity = fridgeItem.quantity - usedQuantity;

    // Nếu quantity <= 0
    if (newQuantity <= 0) {
      fridgeItem.quantity = 0;
      fridgeItem.status = 'used_up';
    } else {
      fridgeItem.quantity = newQuantity;
    }

    // Lưu thay đổi
    await fridgeItem.save();

    try {
      await ConsumptionLog.create({
        userId: req.user.id,
        familyGroupId: req.view === 'family' && req.familyGroup ? req.familyGroup._id : null,
        foodItemId: fridgeItem.foodItemId,
        unitId: fridgeItem.unitId,
        fridgeItemId: fridgeItem._id,
        quantity: usedQuantity,
        source: 'manual'
      });
    } catch (logError) {
      console.error('Error logging consumption:', logError);
    }
    await fridgeItem.populate(['foodItemId', 'unitId']);

    res.json({
      success: true,
      message: 'Sử dụng thực phẩm thành công',
      data: { 
        fridgeItem,
        usedQuantity: usedQuantity,
        remainingQuantity: fridgeItem.quantity
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteFridgeItem = async (req, res, next) => {
  try {
    const fridgeItem = await FridgeItem.findById(req.params.id);

    if (!fridgeItem) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thực phẩm'
      });
    }

    if (req.view === 'family') {
      if (!fridgeItem.familyGroupId || !req.familyGroup || fridgeItem.familyGroupId.toString() !== req.familyGroup._id.toString()) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thực phẩm trong nhóm gia đình'
        });
      }

      if (req.user.role === ROLES.USER) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa thực phẩm trong nhóm gia đình'
        });
      }
    } else {
      // Kiểm tra quyền (chỉ owner mới được xóa)
      if (fridgeItem.userId.toString() !== req.user.id.toString() || fridgeItem.familyGroupId) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ chủ sở hữu mới được xóa thực phẩm này'
        });
      }
    }

    const fridgeItemId = fridgeItem._id;

    // Xóa các notification liên quan đến thực phẩm này
    try {
      const notifResult = await Notification.deleteMany({
        userId: req.user.id,
        relatedId: fridgeItemId,
        relatedType: 'FridgeItem'
      });
      console.log(`✅ Đã xóa ${notifResult.deletedCount} notification liên quan đến FridgeItem ${fridgeItemId}`);
    } catch (notifError) {
      console.error('⚠ Lỗi khi xóa notification liên quan:', notifError);
      // Không fail request nếu xóa notification thất bại
    }

    // Xóa các consumption logs liên quan đến thực phẩm này
    try {
      const logResult = await ConsumptionLog.deleteMany({
        fridgeItemId: fridgeItemId
      });
      console.log(`✅ Đã xóa ${logResult.deletedCount} consumption log liên quan đến FridgeItem ${fridgeItemId}`);
    } catch (logError) {
      console.error('⚠ Lỗi khi xóa consumption log liên quan:', logError);
      // Không fail request nếu xóa log thất bại
    }

    // Xóa thực phẩm
    await fridgeItem.deleteOne();

    res.json({
      success: true,
      message: 'Xóa thực phẩm thành công'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Thêm thực phẩm vào tủ lạnh (format đơn giản từ frontend)
 * @route   POST /api/fridge-items/simple
 * @access  Private
 * 
 * Nhận format đơn giản: { name, category, quantity (string), expiryDate, storageLocation }
 * Tự động tìm/tạo FoodItem và Unit
 */
exports.createFridgeItemSimple = async (req, res, next) => {
  try {
    const {
      name,
      category,
      quantity,
      expiryDate,
      purchaseDate,
      storageLocation,
      price,
      shelfLifeDays,
      saveToCatalog
    } = req.body;

    if (!name || !category || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'name, category, và quantity là bắt buộc'
      });
    }

    // Parse quantity string (e.g., "1.8 kg" -> { quantity: 1.8, unit: "kg" })
    const quantityMatch = String(quantity).match(/^([\d.]+)\s*(.+)?$/);
    const quantityValue = quantityMatch ? parseFloat(quantityMatch[1]) : parseFloat(quantity);
    const unitString = quantityMatch?.[2]?.trim() || 'cái';

    // 1. Tìm hoặc tạo Category
    let categoryDoc = await Category.findOne({ name: category });
    if (!categoryDoc) {
      categoryDoc = await Category.create({
        name: category,
        description: `Auto-created category: ${category}`,
        createdBy: req.user.id
      });
    }

    // 2. Tìm hoặc tạo Unit
    let unitDoc = await Unit.findOne({
      $or: [
        { name: unitString },
        { abbreviation: unitString }
      ]
    });
    if (!unitDoc) {
      unitDoc = await Unit.create({
        name: unitString,
        abbreviation: unitString,
        type: 'count'
      });
    }

    // 3. Tìm hoặc tạo FoodItem
    let foodItemDoc = await FoodItem.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });
    if (!foodItemDoc) {
      const normalizedShelfLife = shelfLifeDays !== undefined && shelfLifeDays !== null
        ? Number(shelfLifeDays)
        : null;

      if (!expiryDate && !(normalizedShelfLife && normalizedShelfLife > 0)) {
        return res.status(400).json({
          success: false,
          message: 'Cần nhập shelfLifeDays hoặc expiryDate cho thực phẩm mới'
        });
      }

      foodItemDoc = await FoodItem.create({
        name: name,
        categoryId: categoryDoc._id,
        defaultUnit: unitDoc._id,
        description: `Auto-created from fridge: ${name}`,
        averageExpiryDays: normalizedShelfLife && normalizedShelfLife > 0 ? normalizedShelfLife : null,
        defaultStorageLocation: storageLocation || 'Ngăn mát',
        createdBy: req.user.id,
        isActive: saveToCatalog === false ? false : true
      });
    }

    const purchaseDateValue = purchaseDate ? new Date(purchaseDate) : new Date();
    if (Number.isNaN(purchaseDateValue.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'purchaseDate không hợp lệ'
      });
    }

    let finalExpiryDate = expiryDate ? normalizeDate(expiryDate) : null;
    if (finalExpiryDate && Number.isNaN(finalExpiryDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'expiryDate không hợp lệ'
      });
    }

    let effectiveShelfLife = shelfLifeDays !== undefined && shelfLifeDays !== null
      ? Number(shelfLifeDays)
      : foodItemDoc.averageExpiryDays;

    if (!finalExpiryDate && effectiveShelfLife && effectiveShelfLife > 0) {
      finalExpiryDate = new Date(purchaseDateValue);
      finalExpiryDate.setDate(finalExpiryDate.getDate() + effectiveShelfLife);
      finalExpiryDate = normalizeDate(finalExpiryDate);
    }

    if (!finalExpiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Không thể tính expiryDate, vui lòng nhập thủ công'
      });
    }

    // 4. Tạo FridgeItem
    const expiryDateStart = new Date(finalExpiryDate);
    const expiryDateEnd = new Date(finalExpiryDate);
    expiryDateEnd.setDate(expiryDateEnd.getDate() + 1);

    const familyGroupIdValue = resolveFamilyGroupId(req);
    const existingItemQuery = {
      foodItemId: foodItemDoc._id,
      unitId: unitDoc._id,
      expiryDate: { $gte: expiryDateStart, $lt: expiryDateEnd },
      storageLocation: storageLocation || foodItemDoc.defaultStorageLocation || 'Ngăn mát',
      familyGroupId: familyGroupIdValue,
      status: { $ne: 'used_up' }
    };

    if (req.view !== 'family') {
      existingItemQuery.userId = req.user.id;
    }

    const existingItem = await FridgeItem.findOne(existingItemQuery);

    if (existingItem) {
      existingItem.quantity += quantityValue;
      existingItem.updateStatus();
      await existingItem.save();
      await existingItem.populate([
        {
          path: 'foodItemId',
          populate: {
            path: 'categoryId',
            select: 'name'
          }
        },
        'unitId'
      ]);

      // Ensure status is up to date
      existingItem.updateStatus();
      if (existingItem.isModified('status')) {
        await existingItem.save();
      }

      // Check and create notification (realtime)
      try {
        console.log(`[Notification] Attempting to create notification for existingItem: ${existingItem._id}`);
        await checkAndCreateNotificationForItem(existingItem);
        console.log(`[Notification] Completed notification check for existingItem: ${existingItem._id}`);
      } catch (notifError) {
        console.error('[Notification] ❌ Error creating notification for existing item:', notifError);
        console.error('[Notification] Error stack:', notifError.stack);
      }

      return res.status(200).json({
        success: true,
        message: 'Đã cộng thêm số lượng vào thực phẩm hiện có',
        data: { fridgeItem: existingItem }
      });
    }

    const fridgeItem = await FridgeItem.create({
      userId: req.user.id,
      familyGroupId: familyGroupIdValue,
      foodItemId: foodItemDoc._id,
      unitId: unitDoc._id,
      quantity: quantityValue,
      expiryDate: finalExpiryDate,
      purchaseDate: purchaseDateValue,
      storageLocation: storageLocation || foodItemDoc.defaultStorageLocation || 'Ngăn mát',
      price: price || 0,
      source: 'manual'
    });

    // Tự động cập nhật status
    fridgeItem.updateStatus();
    await fridgeItem.save();

    await fridgeItem.populate([
      {
        path: 'foodItemId',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      },
      'unitId'
    ]);

    // Ensure status is up to date
    fridgeItem.updateStatus();
    if (fridgeItem.isModified('status')) {
      await fridgeItem.save();
    }

    // Check and create notification (realtime)
    try {
      console.log(`[Notification] Attempting to create notification for new fridgeItem: ${fridgeItem._id}`);
      await checkAndCreateNotificationForItem(fridgeItem);
      console.log(`[Notification] Completed notification check for new fridgeItem: ${fridgeItem._id}`);
    } catch (notifError) {
      console.error('[Notification] ❌ Error creating notification for new fridge item:', notifError);
      console.error('[Notification] Error stack:', notifError.stack);
    }

    res.status(201).json({
      success: true,
      message: 'Thêm thực phẩm vào tủ lạnh thành công',
      data: { fridgeItem }
    });
  } catch (error) {
    next(error);
  }
};
