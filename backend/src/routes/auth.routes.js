/**
 * Authentication Routes
 * Các endpoint cho đăng ký, đăng nhập, đăng xuất
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');

/**
 * @route   POST /api/auth/register
 * @desc    Đăng ký tài khoản mới
 * @access  Public
 */
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Email không hợp lệ'),
    body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
    body('fullName').notEmpty().withMessage('Họ tên là bắt buộc')
  ],
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email không hợp lệ'),
    body('password').notEmpty().withMessage('Mật khẩu là bắt buộc')
  ],
  authController.login
);

/**
 * @route   GET /api/auth/me
 * @desc    Lấy thông tin user hiện tại
 * @access  Private
 */
router.get('/me', auth, authController.getMe);

/**
 * @route   POST /api/auth/logout
 * @desc    Đăng xuất (client sẽ xóa token)
 * @access  Private
 */
router.post('/logout', auth, authController.logout);

module.exports = router;



