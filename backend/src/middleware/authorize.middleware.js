/**
 * Authorization Middleware
 * Kiểm tra quyền truy cập dựa trên role
 */

const { ROLES } = require('../config/roles');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực'
      });
    }

    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Người dùng với role ${req.user.role} không có quyền truy cập tài nguyên này`
      });
    }

    next();
  };
};

module.exports = authorize;



