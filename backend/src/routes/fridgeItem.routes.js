/**
 * FridgeItem Routes
 * Các endpoint cho quản lý tủ lạnh
 */

const express = require('express');
const router = express.Router();
const fridgeItemController = require('../controllers/fridgeItem.controller');
const auth = require('../middleware/auth.middleware');

router.use(auth);

/**
 * @route   GET /api/fridge-items/expiring
 * @desc    Lấy thực phẩm sắp hết hạn (trong 3 ngày tới)
 * @access  Private
 */
router.get('/expiring', fridgeItemController.getExpiringItems);

/**
 * @route   GET /api/fridge-items
 * @desc    Lấy danh sách thực phẩm trong tủ lạnh
 * @access  Private
 */
router.get('/', fridgeItemController.getFridgeItems);

/**
 * @route   GET /api/fridge-items/:id
 * @desc    Lấy chi tiết thực phẩm
 * @access  Private
 */
router.get('/:id', fridgeItemController.getFridgeItemById);

/**
 * @route   POST /api/fridge-items/simple
 * @desc    Thêm thực phẩm vào tủ lạnh (format đơn giản từ frontend)
 * @access  Private
 */
router.post('/simple', fridgeItemController.createFridgeItemSimple);

/**
 * @route   POST /api/fridge-items
 * @desc    Thêm thực phẩm vào tủ lạnh
 * @access  Private
 */
router.post('/', fridgeItemController.createFridgeItem);

/**
 * @route   PUT /api/fridge-items/:id/use
 * @desc    Sử dụng thực phẩm (trừ số lượng)
 * @access  Private
 */
router.put('/:id/use', fridgeItemController.useFridgeItem);

/**
 * @route   PUT /api/fridge-items/:id
 * @desc    Cập nhật thực phẩm
 * @access  Private
 */
router.put('/:id', fridgeItemController.updateFridgeItem);

/**
 * @route   DELETE /api/fridge-items/:id
 * @desc    Xóa thực phẩm
 * @access  Private
 */
router.delete('/:id', fridgeItemController.deleteFridgeItem);

module.exports = router;

