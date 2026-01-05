const FoodItem = require('../models/FoodItem.model');

exports.getFoodItems = async (req, res, next) => {
  try {
    const { search, includeInactive } = req.query;
    const query = {};

    if (search) {
      query.name = { $regex: new RegExp(search, 'i') };
    }
    if (includeInactive !== 'true') {
      query.isActive = { $ne: false };
    }

    const foodItems = await FoodItem.find(query)
      .populate('categoryId', 'name')
      .populate('defaultUnit', 'name abbreviation')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: foodItems.length,
      data: { foodItems }
    });
  } catch (error) {
    next(error);
  }
};

exports.getFoodItemById = async (req, res, next) => {
  try {
    const foodItem = await FoodItem.findById(req.params.id);

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thực phẩm'
      });
    }

    res.json({
      success: true,
      data: { foodItem }
    });
  } catch (error) {
    next(error);
  }
};

exports.createFoodItem = async (req, res, next) => {
  try {
    const { name, categoryId, defaultUnit } = req.body;

    if (!name || !categoryId || !defaultUnit) {
      return res.status(400).json({
        success: false,
        message: 'name, categoryId và defaultUnit là bắt buộc'
      });
    }

    const existing = await FoodItem.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Tên thực phẩm đã tồn tại'
      });
    }

    const foodItem = await FoodItem.create({
      ...req.body,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Tạo thực phẩm thành công',
      data: { foodItem }
    });
  } catch (error) {
    next(error);
  }
};
