const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipe.controller');
const auth = require('../middleware/auth.middleware');

router.get('/search', recipeController.searchRecipes); // Phải đặt trước /:id
router.get('/', recipeController.getRecipes);
router.get('/suggest', auth, recipeController.suggestRecipes); // Phải đặt trước /:id
router.get('/:id/check-ingredients', auth, recipeController.checkIngredients); // Phải đặt trước /:id
router.post('/:id/cook', auth, recipeController.cookRecipe); // Phải đặt trước /:id
router.get('/:id', recipeController.getRecipeById);
router.post('/', auth, recipeController.createRecipe);
router.put('/:id', auth, recipeController.updateRecipe);
router.delete('/:id', auth, recipeController.deleteRecipe);

module.exports = router;

