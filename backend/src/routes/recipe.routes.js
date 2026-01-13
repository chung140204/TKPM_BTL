const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipe.controller');
const auth = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const { ROLES } = require('../config/roles');
const { attachViewContext } = require('../middleware/view.middleware');

router.get('/search', auth, recipeController.searchRecipes); // Phải đặt trước /:id
router.get('/mine', auth, recipeController.getMyRecipes);
router.get('/', auth, recipeController.getRecipes);
router.get('/suggest', auth, attachViewContext, recipeController.suggestRecipes); // Phải đặt trước /:id
router.get('/:id/check-ingredients', auth, attachViewContext, recipeController.checkIngredients); // Phải đặt trước /:id
router.post('/:id/cook', auth, attachViewContext, authorize(ROLES.HOMEMAKER), recipeController.cookRecipe); // Phải đặt trước /:id
router.post('/:id/toggle-favorite', auth, recipeController.toggleFavorite); // Phải đặt trước /:id
router.put('/:id/submit', auth, authorize(ROLES.HOMEMAKER), recipeController.submitRecipeForApproval);
router.get('/:id', auth, recipeController.getRecipeById);
router.post('/', auth, authorize(ROLES.HOMEMAKER), recipeController.createRecipe);
router.put('/:id', auth, recipeController.updateRecipe);
router.delete('/:id', auth, recipeController.deleteRecipe);

module.exports = router;
