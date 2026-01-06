/**
 * ShoppingList Routes
 * Các endpoint cho quản lý danh sách mua sắm
 */

const express = require('express');
const router = express.Router();
const shoppingListController = require('../controllers/shoppingList.controller');
const auth = require('../middleware/auth.middleware');
const { attachViewContext } = require('../middleware/view.middleware');

// Tất cả routes đều cần authentication
router.use(auth, attachViewContext);

/**
 * @route   POST /api/shopping-lists/auto
 * @desc    Tạo danh sách mua sắm tự động từ FridgeItem
 * @access  Private
 */
router.post('/auto', shoppingListController.createAutoShoppingList);

/**
 * @route   GET /api/shopping-lists
 * @desc    Lấy danh sách mua sắm của user
 * @access  Private
 */
router.get('/', shoppingListController.getShoppingLists);

/**
 * @route   POST /api/shopping-lists
 * @desc    Tạo danh sách mua sắm mới (manual)
 * @access  Private
 */
router.post('/', shoppingListController.createShoppingList);

/**
 * @route   PUT /api/shopping-lists/:id/item/:itemId
 * @desc    Cập nhật item trong shopping list (quantity hoặc isBought)
 * @access  Private
 */
router.put('/:id/item/:itemId', shoppingListController.updateShoppingListItem);

/**
 * @route   PUT /api/shopping-lists/:id/complete
 * @desc    Hoàn tất danh sách mua sắm
 * @access  Private
 */
router.put('/:id/complete', shoppingListController.completeShoppingList);

/**
 * @route   GET /api/shopping-lists/:id
 * @desc    Lấy chi tiết danh sách mua sắm
 * @access  Private
 */
router.get('/:id', shoppingListController.getShoppingListById);

/**
 * @route   PUT /api/shopping-lists/:id
 * @desc    Cập nhật danh sách mua sắm
 * @access  Private
 */
router.put('/:id', shoppingListController.updateShoppingList);

/**
 * @route   DELETE /api/shopping-lists/:id
 * @desc    Xóa danh sách mua sắm
 * @access  Private
 */
router.delete('/:id', shoppingListController.deleteShoppingList);

module.exports = router;
