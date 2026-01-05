const express = require('express');
const router = express.Router();
const foodItemController = require('../controllers/foodItem.controller');
const auth = require('../middleware/auth.middleware');

router.get('/', foodItemController.getFoodItems);
router.get('/:id', foodItemController.getFoodItemById);
router.post('/', auth, foodItemController.createFoodItem);

module.exports = router;
