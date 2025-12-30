const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const auth = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');

router.use(auth, authorize('admin'));

router.get('/users', adminController.getUsers);
router.put('/users/:id/status', adminController.updateUserStatus);
router.get('/recipes/pending', adminController.getPendingRecipes);
router.put('/recipes/:id/approve', adminController.approveRecipe);
router.get('/stats', adminController.getStats);

module.exports = router;



