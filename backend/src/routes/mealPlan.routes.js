const express = require('express');
const router = express.Router();
const mealPlanController = require('../controllers/mealPlan.controller');
const auth = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const { ROLES } = require('../config/roles');
const { attachViewContext } = require('../middleware/view.middleware');

router.use(auth, attachViewContext, authorize(ROLES.HOMEMAKER));

router.get('/', mealPlanController.getMealPlans);
router.post('/', mealPlanController.createMealPlan);
// Specific routes must come before generic :id routes
router.post('/:id/generate-shopping-list', mealPlanController.generateShoppingListFromMealPlan);
router.get('/:id', mealPlanController.getMealPlanById);
router.put('/:id', mealPlanController.updateMealPlan);
router.delete('/:id', mealPlanController.deleteMealPlan);

module.exports = router;



