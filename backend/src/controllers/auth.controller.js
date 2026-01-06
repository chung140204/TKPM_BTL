/**
 * Auth Controller
 * Xử lý logic cho authentication: đăng ký, đăng nhập, đăng xuất
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const jwtConfig = require('../config/jwt');
const { validationResult } = require('express-validator');

/**
 * Generate JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn
  });
};

/**
 * @desc    Đăng ký tài khoản mới
 * @route   POST /api/auth/register
 * @access  Public
 * 
 * Luồng nghiệp vụ:
 * 1. Validate input (email, password, fullName)
 * 2. Kiểm tra email đã tồn tại chưa
 * 3. Hash password
 * 4. Tạo user mới trong database
 * 5. Generate JWT token
 * 6. Trả về token và thông tin user
 */
exports.register = async (req, res, next) => {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { email, password, fullName, phone } = req.body;

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    // Tạo user mới
    const user = await User.create({
      email,
      password,
      fullName,
      phone: phone || null
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đăng nhập
 * @route   POST /api/auth/login
 * @access  Public
 * 
 * Luồng nghiệp vụ:
 * 1. Validate input (email, password)
 * 2. Tìm user theo email (có password)
 * 3. Kiểm tra user tồn tại và active
 * 4. So sánh password
 * 5. Generate JWT token
 * 6. Trả về token và thông tin user
 */
exports.login = async (req, res, next) => {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Tìm user và lấy password (vì select: false)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Kiểm tra tài khoản có bị khóa không
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa'
      });
    }

    // So sánh password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          familyGroupId: user.familyGroupId
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy thông tin user hiện tại
 * @route   GET /api/auth/me
 * @access  Private
 * 
 * Luồng nghiệp vụ:
 * 1. Middleware auth đã verify token và gán req.user
 * 2. Populate các thông tin liên quan (familyGroup, preferences)
 * 3. Trả về thông tin user
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('familyGroupId', 'name members')
      .populate('preferences.favoriteRecipes', 'name image');

    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đăng xuất
 * @route   POST /api/auth/logout
 * @access  Private
 * 
 * Luồng nghiệp vụ:
 * 1. Client sẽ xóa token ở phía client
 * 2. Server có thể lưu token vào blacklist nếu cần
 * 3. Hiện tại chỉ trả về success message
 */
exports.logout = async (req, res, next) => {
  try {
    // Trong tương lai có thể implement token blacklist
    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đổi mật khẩu
 * @route   POST /api/auth/change-password
 * @access  Private
 *
 * Luồng nghiệp vụ:
 * 1. Validate input (currentPassword, newPassword)
 * 2. Lấy user hiện tại (kèm password)
 * 3. Kiểm tra mật khẩu hiện tại
 * 4. Cập nhật mật khẩu mới (hash qua hook của User model)
 * 5. Trả về thông báo thành công
 */
exports.changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Lấy user hiện tại kèm password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    // Cập nhật mật khẩu mới (hook pre('save') sẽ tự hash)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    next(error);
  }
};



