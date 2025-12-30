const User = require('../models/User.model');
const Recipe = require('../models/Recipe.model');
const ShoppingList = require('../models/ShoppingList.model');
const FridgeItem = require('../models/FridgeItem.model');

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: { users }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    res.json({
      success: true,
      message: `Đã ${isActive ? 'mở khóa' : 'khóa'} tài khoản thành công`,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

exports.getPendingRecipes = async (req, res, next) => {
  try {
    const recipes = await Recipe.find({ isApproved: false })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: recipes.length,
      data: { recipes }
    });
  } catch (error) {
    next(error);
  }
};

exports.approveRecipe = async (req, res, next) => {
  try {
    const recipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      {
        isApproved: true,
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      { new: true }
    );

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công thức'
      });
    }

    res.json({
      success: true,
      message: 'Phê duyệt công thức thành công',
      data: { recipe }
    });
  } catch (error) {
    next(error);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalRecipes = await Recipe.countDocuments({ isApproved: true });
    const totalShoppingLists = await ShoppingList.countDocuments();
    const totalFridgeItems = await FridgeItem.countDocuments();

    res.json({
      success: true,
      data: {
        totalUsers,
        totalRecipes,
        totalShoppingLists,
        totalFridgeItems
      }
    });
  } catch (error) {
    next(error);
  }
};



