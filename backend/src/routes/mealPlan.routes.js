const express = require('express');
const router = express.Router();
const mealPlanController = require('../controllers/mealPlan.controller');
const auth = require('../middleware/auth.middleware');

router.use(auth);

router.get('/', mealPlanController.getMealPlans);
router.post('/', mealPlanController.createMealPlan);
// Specific routes must come before generic :id routes
router.post('/:id/generate-shopping-list', mealPlanController.generateShoppingListFromMealPlan);
router.get('/:id', mealPlanController.getMealPlanById);
router.put('/:id', mealPlanController.updateMealPlan);
router.delete('/:id', mealPlanController.deleteMealPlan);

module.exports = router;



