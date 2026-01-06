const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const auth = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const { ROLES } = require('../config/roles');

router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', auth, authorize(ROLES.ADMIN), categoryController.createCategory);
router.put('/:id', auth, authorize(ROLES.ADMIN), categoryController.updateCategory);
router.delete('/:id', auth, authorize(ROLES.ADMIN), categoryController.deleteCategory);

module.exports = router;



