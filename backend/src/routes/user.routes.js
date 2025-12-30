/**
 * User Routes
 * Các endpoint cho quản lý user
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth.middleware');

/**
 * @route   GET /api/users/profile
 * @desc    Lấy thông tin profile
 * @access  Private
 */
router.get('/profile', auth, userController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Cập nhật thông tin profile
 * @access  Private
 */
router.put('/profile', auth, userController.updateProfile);

module.exports = router;



