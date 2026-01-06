const User = require('../models/User.model');
const Recipe = require('../models/Recipe.model');
const FamilyGroup = require('../models/FamilyGroup.model');

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

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { email, password, fullName, phone, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    const normalizedRole = role ? role.toLowerCase() : ROLES.USER;
    if (![ROLES.USER, ROLES.HOMEMAKER, ROLES.ADMIN].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Role không hợp lệ'
      });
    }

    const user = await User.create({
      email,
      password,
      fullName,
      phone: phone || null,
      role: normalizedRole
    });

    res.status(201).json({
      success: true,
      message: 'Tạo người dùng thành công',
      data: { user: await User.findById(user._id).select('-password') }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { fullName, phone, role, isActive } = req.body;
    const updates = {};

    if (fullName !== undefined) updates.fullName = fullName;
    if (phone !== undefined) updates.phone = phone;
    if (isActive !== undefined) updates.isActive = isActive;

    if (role !== undefined) {
      const normalizedRole = role.toLowerCase();
      if (![ROLES.USER, ROLES.HOMEMAKER, ROLES.ADMIN].includes(normalizedRole)) {
        return res.status(400).json({
          success: false,
          message: 'Role không hợp lệ'
        });
      }
      updates.role = normalizedRole;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
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
      message: 'Cập nhật người dùng thành công',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    if (user.familyGroupId) {
      await FamilyGroup.updateOne(
        { _id: user.familyGroupId },
        { $pull: { members: { userId: user._id } } }
      );
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: 'Xóa người dùng thành công'
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
    const recipes = await Recipe.find({
      isApproved: false,
      $or: [
        { visibility: 'public' },
        { visibility: { $exists: false } }
      ]
    })
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
        visibility: 'public',
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
    const totalFamilyGroups = await FamilyGroup.countDocuments();
    const totalRecipes = await Recipe.countDocuments({
      isApproved: true,
      $or: [
        { visibility: 'public' },
        { visibility: { $exists: false } }
      ]
    });

    const now = new Date();
    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: startOfWeek }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalRecipes,
        totalFamilyGroups,
        newUsersThisWeek
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getPublicRecipes = async (req, res, next) => {
  try {
    const recipes = await Recipe.find({
      isApproved: true,
      $or: [
        { visibility: 'public' },
        { visibility: { $exists: false } }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: recipes.length,
      data: { recipes }
    });
  } catch (error) {
    next(error);
  }
};

exports.createPublicRecipe = async (req, res, next) => {
  try {
    const recipe = await Recipe.create({
      ...req.body,
      createdBy: req.user.id,
      visibility: 'public',
      isApproved: true,
      approvedBy: req.user.id,
      approvedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Tạo công thức thành công',
      data: { recipe }
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePublicRecipe = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates.createdBy;
    delete updates.visibility;
    delete updates.isApproved;
    delete updates.approvedBy;
    delete updates.approvedAt;

    const recipe = await Recipe.findOneAndUpdate(
      {
        _id: req.params.id,
        isApproved: true,
        $or: [
          { visibility: 'public' },
          { visibility: { $exists: false } }
        ]
      },
      updates,
      { new: true, runValidators: true }
    );

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công thức'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật công thức thành công',
      data: { recipe }
    });
  } catch (error) {
    next(error);
  }
};

exports.deletePublicRecipe = async (req, res, next) => {
  try {
    const recipe = await Recipe.findOneAndDelete({
      _id: req.params.id,
      isApproved: true,
      $or: [
        { visibility: 'public' },
        { visibility: { $exists: false } }
      ]
    });

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công thức'
      });
    }

    res.json({
      success: true,
      message: 'Xóa công thức thành công'
    });
  } catch (error) {
    next(error);
  }
};



