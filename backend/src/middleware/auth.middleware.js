/**
 * Authentication Middleware
 * Xác thực JWT token và gán user vào request
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const jwtConfig = require('../config/jwt');

const auth = async (req, res, next) => {
  try {
    // Lấy token từ header
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không có token, truy cập bị từ chối'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, jwtConfig.secret);

    // Tìm user từ token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa'
      });
    }

    // Gán user vào request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ'
    });
  }
};

module.exports = auth;



