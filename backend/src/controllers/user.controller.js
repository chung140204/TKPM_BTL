/**
 * User Controller
 * Xử lý logic cho quản lý user
 */

const User = require('../models/User.model');

/**
 * @desc    Lấy thông tin profile
 * @route   GET /api/users/profile
 * @access  Private
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('familyGroupId', 'name members')
      .populate('preferences.favoriteRecipes', 'name image');

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật thông tin profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, avatar, preferences } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        fullName,
        phone,
        avatar,
        preferences
      },
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    res.json({
      success: true,
      message: 'Cập nhật profile thành công',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};



