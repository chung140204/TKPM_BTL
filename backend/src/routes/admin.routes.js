const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const auth = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const { ROLES } = require('../config/roles');

router.use(auth, authorize(ROLES.ADMIN));

router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.put('/users/:id/status', adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);
router.get('/recipes', adminController.getPublicRecipes);
router.post('/recipes', adminController.createPublicRecipe);
router.get('/recipes/pending', adminController.getPendingRecipes);
router.put('/recipes/:id/approve', adminController.approveRecipe);
router.put('/recipes/:id', adminController.updatePublicRecipe);
router.delete('/recipes/:id', adminController.deletePublicRecipe);
router.get('/stats', adminController.getStats);

module.exports = router;



