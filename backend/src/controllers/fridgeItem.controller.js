/**
 * FridgeItem Controller
 * Xử lý logic cho quản lý tủ lạnh
 */

const FridgeItem = require('../models/FridgeItem.model');
const FoodItem = require('../models/FoodItem.model');
const Unit = require('../models/Unit.model');
const Category = require('../models/Category.model');
// Require các models liên quan để Mongoose có thể populate
require('../models/FoodItem.model');
require('../models/Unit.model');

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
    const query = { userId: req.user.id };
    
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

    // Query thực phẩm sắp hết hạn (trong 3 ngày tới)
    let fridgeItems = await FridgeItem.find({
      userId: req.user.id,
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
    const fridgeItem = await FridgeItem.findById(req.params.id)
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

    const finalExpiryDate = expiryDate || new Date();
    
    // Kiểm tra đã tồn tại FridgeItem với cùng userId, foodItemId, expiryDate
    const existingItem = await FridgeItem.findOne({
      userId: req.user.id,
      foodItemId: foodItemId,
      expiryDate: finalExpiryDate,
      status: { $ne: 'used_up' } // Chỉ kiểm tra items chưa hết
    });

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
        userId: req.user.id
      });

      // Tự động cập nhật status dựa trên expiryDate
      fridgeItem.updateStatus();
      await fridgeItem.save();

      await fridgeItem.populate(['foodItemId', 'unitId']);
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

    // Kiểm tra quyền
    if (fridgeItem.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ chủ sở hữu mới được cập nhật thực phẩm này'
      });
    }

    // Cập nhật
    Object.assign(fridgeItem, req.body);
    
    // Tự động cập nhật status (luôn gọi để đảm bảo status chính xác)
    fridgeItem.updateStatus();
    
    await fridgeItem.save();
    await fridgeItem.populate(['foodItemId', 'unitId']);

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

    // Kiểm tra quyền (chỉ user sở hữu mới được dùng)
    if (fridgeItem.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ chủ sở hữu mới được sử dụng thực phẩm này'
      });
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

    // Kiểm tra quyền (chỉ owner mới được xóa)
    if (fridgeItem.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ chủ sở hữu mới được xóa thực phẩm này'
      });
    }

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
    const { name, category, quantity, expiryDate, storageLocation, price } = req.body;
    
    if (!name || !category || !quantity || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'name, category, quantity, và expiryDate là bắt buộc'
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
      foodItemDoc = await FoodItem.create({
        name: name,
        categoryId: categoryDoc._id,
        defaultUnit: unitDoc._id,
        description: `Auto-created from fridge: ${name}`,
        createdBy: req.user.id
      });
    }

    // 4. Tạo FridgeItem
    const fridgeItem = await FridgeItem.create({
      userId: req.user.id,
      foodItemId: foodItemDoc._id,
      unitId: unitDoc._id,
      quantity: quantityValue,
      expiryDate: new Date(expiryDate),
      storageLocation: storageLocation || 'Ngăn mát',
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

    res.status(201).json({
      success: true,
      message: 'Thêm thực phẩm vào tủ lạnh thành công',
      data: { fridgeItem }
    });
  } catch (error) {
    next(error);
  }
};

