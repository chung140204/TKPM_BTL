const Unit = require('../models/Unit.model');

exports.getUnits = async (req, res, next) => {
  try {
    const units = await Unit.find().sort({ name: 1 });

    res.json({
      success: true,
      count: units.length,
      data: { units }
    });
  } catch (error) {
    next(error);
  }
};

exports.getUnitById = async (req, res, next) => {
  try {
    const unit = await Unit.findById(req.params.id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn vị'
      });
    }

    res.json({
      success: true,
      data: { unit }
    });
  } catch (error) {
    next(error);
  }
};

exports.createUnit = async (req, res, next) => {
  try {
    const unit = await Unit.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Tạo đơn vị thành công',
      data: { unit }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUnit = async (req, res, next) => {
  try {
    const unit = await Unit.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn vị'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật đơn vị thành công',
      data: { unit }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUnit = async (req, res, next) => {
  try {
    const unit = await Unit.findById(req.params.id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn vị'
      });
    }

    await unit.deleteOne();

    res.json({
      success: true,
      message: 'Xóa đơn vị thành công'
    });
  } catch (error) {
    next(error);
  }
};



