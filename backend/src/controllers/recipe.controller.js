const mongoose = require('mongoose');
const Recipe = require('../models/Recipe.model');
const FridgeItem = require('../models/FridgeItem.model');
const { ROLES } = require('../config/roles');
const { buildViewFilter, resolveFamilyGroupId } = require('../utils/view');
const Notification = require('../models/Notification.model');
const ConsumptionLog = require('../models/ConsumptionLog.model');
const FamilyGroup = require('../models/FamilyGroup.model');
const notificationService = require('../services/notification.service');
// Require các models liên quan để Mongoose có thể populate
require('../models/FoodItem.model');
require('../models/Unit.model');

const getPublicRecipeFilter = () => ({
  isApproved: true,
  $or: [
    { visibility: 'public' },
    { visibility: { $exists: false } }
  ]
});

const buildRecipeAccessFilter = (req) => {
  if (!req?.user) {
    return getPublicRecipeFilter();
  }

  return {
    $or: [
      getPublicRecipeFilter(),
      { visibility: 'private', createdBy: req.user.id },
      { visibility: { $exists: false }, createdBy: req.user.id, isApproved: false }
    ]
  };
};

/**
 * @desc    Tìm kiếm recipes theo nguyên liệu
 * @route   GET /api/recipes/search?ingredients=id1,id2,id3&category=...&difficulty=...&servings=...
 * @access  Private
 */
exports.searchRecipes = async (req, res, next) => {
  try {
    const { ingredients, category, difficulty, servings } = req.query;

    // Parse ingredients (comma-separated foodItemIds)
    let ingredientIds = [];
    if (ingredients) {
      ingredientIds = ingredients.split(',').map(id => id.trim()).filter(id => id);
    }

    // Build query
    const query = buildRecipeAccessFilter(req);

    if (category) {
      query.category = category;
    }
    if (difficulty) {
      query.difficulty = difficulty;
    }
    if (servings) {
      query.servings = parseInt(servings);
    }

    // Get all recipes (or filter by category/difficulty/servings)
    let recipes = await Recipe.find(query)
      .populate('ingredients.foodItemId', 'name')
      .populate('ingredients.unitId', 'name abbreviation');

    // Filter out recipes with invalid ingredients
    recipes = recipes.filter(recipe => 
      recipe.ingredients && 
      recipe.ingredients.length > 0 &&
      recipe.ingredients.every(ing => ing.foodItemId && ing.unitId)
    );

    // If ingredients provided, convert to ObjectIds for comparison
    const ingredientObjectIds = ingredientIds.length > 0
      ? ingredientIds.map(id => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch (error) {
            return null;
          }
        }).filter(id => id !== null)
      : [];

    // Calculate matchPercentage for each recipe
    const results = recipes.map(recipe => {
      if (ingredientObjectIds.length === 0) {
        // No ingredients filter, all ingredients are "available"
        return {
          recipeId: recipe._id,
          recipeName: recipe.name,
          ingredients: recipe.ingredients.map(ing => ({
            foodItemId: ing.foodItemId._id,
            foodItemName: ing.foodItemId.name,
            available: true
          })),
          matchPercentage: 100
        };
      }

      // Count how many ingredients match
      const totalIngredients = recipe.ingredients.length;
      let availableCount = 0;

      const ingredientsList = recipe.ingredients.map(ing => {
        const foodItemId = ing.foodItemId._id;
        const isAvailable = ingredientObjectIds.some(id => id.equals(foodItemId));
        
        if (isAvailable) {
          availableCount++;
        }

        return {
          foodItemId: foodItemId,
          foodItemName: ing.foodItemId.name,
          available: isAvailable
        };
      });

      const matchPercentage = totalIngredients > 0 
        ? Math.round((availableCount / totalIngredients) * 100)
        : 0;

      return {
        recipeId: recipe._id,
        recipeName: recipe.name,
        ingredients: ingredientsList,
        matchPercentage
      };
    });

    // Sort by matchPercentage descending
    results.sort((a, b) => b.matchPercentage - a.matchPercentage);

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error in searchRecipes:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm kiếm công thức',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Lấy danh sách recipes với filter
 * @route   GET /api/recipes?category=...&difficulty=...&servings=...
 * @access  Private
 */
exports.getRecipes = async (req, res, next) => {
  try {
    const { category, difficulty, servings } = req.query;

    // Build query
    const query = buildRecipeAccessFilter(req);

    if (category) {
      query.category = category;
    }
    if (difficulty) {
      query.difficulty = difficulty;
    }
    if (servings) {
      query.servings = parseInt(servings);
    }

    // Get recipes with filters
    let recipes = await Recipe.find(query)
      .populate('ingredients.foodItemId', 'name image')
      .populate('ingredients.unitId', 'name abbreviation')
      .sort({ favoriteCount: -1, createdAt: -1 });

    // Filter out recipes with invalid ingredients
    recipes = recipes.filter(recipe => 
      recipe.ingredients && 
      recipe.ingredients.length > 0 &&
      recipe.ingredients.every(ing => ing.foodItemId && ing.unitId)
    );

    // Format response
    const formattedRecipes = recipes.map(recipe => ({
      recipeId: recipe._id,
      recipeName: recipe.name,
      category: recipe.category,
      difficulty: recipe.difficulty,
      servings: recipe.servings,
      visibility: recipe.visibility || 'public',
      favoriteCount: recipe.favoriteCount || 0,
      ingredients: recipe.ingredients.map(ing => ({
        foodItemId: ing.foodItemId._id,
        foodItemName: ing.foodItemId.name,
        quantity: ing.quantity,
        unitId: ing.unitId._id,
        unitName: ing.unitId.name
      }))
    }));

    res.json({
      success: true,
      count: formattedRecipes.length,
      data: formattedRecipes
    });
  } catch (error) {
    console.error('Error in getRecipes:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách công thức',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getRecipeById = async (req, res, next) => {
  try {
    const recipe = await Recipe.findOne({
      _id: req.params.id,
      ...buildRecipeAccessFilter(req)
    })
      .populate('ingredients.foodItemId', 'name image categoryId')
      .populate('ingredients.unitId', 'name abbreviation type');

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công thức'
      });
    }

    res.json({
      success: true,
      data: { recipe }
    });
  } catch (error) {
    next(error);
  }
};

exports.createRecipe = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === ROLES.ADMIN;
    const visibility = isAdmin ? 'public' : 'private';

    const recipe = await Recipe.create({
      ...req.body,
      createdBy: req.user.id,
      visibility,
      isApproved: isAdmin,
      approvedBy: isAdmin ? req.user.id : null,
      approvedAt: isAdmin ? new Date() : null
    });

    res.status(201).json({
      success: true,
      message: 'Tạo công thức thành công',
      data: { recipe }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateRecipe = async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công thức'
      });
    }

    const isAdmin = req.user.role === ROLES.ADMIN;
    const isOwner = recipe.createdBy?.toString() === req.user.id;
    const isPublicRecipe = recipe.visibility !== 'private' && recipe.isApproved === true;
    const canEditPrivate = isOwner && (
      recipe.visibility === 'private' ||
      (recipe.visibility === undefined && recipe.isApproved === false)
    );

    if (isAdmin) {
      if (!isPublicRecipe) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền cập nhật công thức này'
        });
      }
    } else if (!canEditPrivate) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật công thức này'
      });
    }

    const updates = { ...req.body };
    delete updates.createdBy;
    delete updates.visibility;
    delete updates.isApproved;
    delete updates.approvedBy;
    delete updates.approvedAt;

    const updatedRecipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Cập nhật công thức thành công',
      data: { recipe: updatedRecipe }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteRecipe = async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công thức'
      });
    }

    const isAdmin = req.user.role === ROLES.ADMIN;
    const isOwner = recipe.createdBy?.toString() === req.user.id;
    const isPublicRecipe = recipe.visibility !== 'private' && recipe.isApproved === true;
    const canDeletePrivate = isOwner && (
      recipe.visibility === 'private' ||
      (recipe.visibility === undefined && recipe.isApproved === false)
    );

    if (isAdmin) {
      if (!isPublicRecipe) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa công thức này'
        });
      }
    } else if (!canDeletePrivate) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa công thức này'
      });
    }

    await recipe.deleteOne();

    res.json({
      success: true,
      message: 'Xóa công thức thành công'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Gợi ý món ăn dựa trên thực phẩm trong tủ lạnh
 * @route   GET /api/recipes/suggest
 * @access  Private
 * 
 * Luồng nghiệp vụ:
 * 1. Lấy tất cả FridgeItem của user (status: available, expiring_soon)
 * 2. Lấy tất cả Recipe đã được approve
 * 3. Với mỗi recipe:
 *    - So khớp ingredients với FridgeItem
 *    - Tính availableIngredients và missingIngredients
 *    - Tính matchPercentage
 *    - Tính expiringScore (ưu tiên món sử dụng thực phẩm sắp hết hạn)
 * 4. Sort theo expiringScore desc, rồi matchPercentage desc
 */
exports.suggestRecipes = async (req, res, next) => {
  try {
    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    // 1. Lấy tất cả FridgeItem của user (chỉ lấy available và expiring_soon)
    const viewFilter = buildViewFilter(req);
    let fridgeItems = await FridgeItem.find({
      ...viewFilter,
      status: { $in: ['available', 'expiring_soon'] },
      quantity: { $gt: 0 } // Chỉ lấy items còn số lượng > 0
    })
      .populate('foodItemId', 'name')
      .populate('unitId', 'name abbreviation');
    
    // Filter ra những items không populate được (foodItemId hoặc unitId null)
    fridgeItems = fridgeItems.filter(item => item.foodItemId && item.unitId);

    // Tạo map để tra cứu nhanh: foodItemId + unitId -> { quantity, expiryDate, status }
    const fridgeMap = new Map();
    fridgeItems.forEach(item => {
      // Kiểm tra null trước khi truy cập
      if (!item.foodItemId || !item.unitId) {
        return; // Bỏ qua item không có foodItemId hoặc unitId
      }
      
      const key = `${item.foodItemId._id.toString()}_${item.unitId._id.toString()}`;
      
      // Tính daysLeft an toàn
      let daysLeft = 0;
      try {
        if (typeof item.getDaysLeft === 'function') {
          daysLeft = item.getDaysLeft();
        } else {
          // Fallback: tính toán thủ công
          const now = new Date();
          const expiryDate = new Date(item.expiryDate);
          const diffTime = expiryDate - now;
          daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      } catch (error) {
        console.warn('Error calculating daysLeft for item:', item._id, error);
        daysLeft = 0;
      }
      
      // Nếu đã có, cộng quantity
      if (fridgeMap.has(key)) {
        const existing = fridgeMap.get(key);
        existing.quantity += item.quantity;
        // Ưu tiên expiryDate sớm hơn (sắp hết hạn hơn)
        if (item.expiryDate < existing.expiryDate) {
          existing.expiryDate = item.expiryDate;
          existing.status = item.status;
          existing.daysLeft = daysLeft;
        }
      } else {
        fridgeMap.set(key, {
          foodItemId: item.foodItemId._id,
          unitId: item.unitId._id,
          quantity: item.quantity,
          expiryDate: item.expiryDate,
          status: item.status,
          daysLeft: daysLeft
        });
      }
    });

    // 2. Lấy tất cả Recipe được phép truy cập
    const recipeFilter = buildRecipeAccessFilter(req);
    let recipes = await Recipe.find(recipeFilter)
      .populate('ingredients.foodItemId', 'name')
      .populate('ingredients.unitId', 'name abbreviation');
    
    // Filter ra những recipes không có ingredients hoặc ingredients không populate được
    recipes = recipes.filter(recipe => 
      recipe.ingredients && 
      recipe.ingredients.length > 0 &&
      recipe.ingredients.every(ing => ing.foodItemId && ing.unitId)
    );

    // 3. Tính toán cho mỗi recipe
    const suggestedRecipes = recipes.map(recipe => {
      const availableIngredients = [];
      const missingIngredients = [];
      let expiringScore = 0;

      // Duyệt qua từng ingredient của recipe
      recipe.ingredients.forEach(ingredient => {
        // Kiểm tra null trước khi truy cập
        if (!ingredient.foodItemId || !ingredient.unitId) {
          return; // Bỏ qua ingredient không có foodItemId hoặc unitId
        }
        
        const key = `${ingredient.foodItemId._id.toString()}_${ingredient.unitId._id.toString()}`;
        const fridgeItem = fridgeMap.get(key);

        if (fridgeItem && fridgeItem.quantity >= ingredient.quantity) {
          // Có đủ nguyên liệu
          availableIngredients.push({
            foodItemId: ingredient.foodItemId._id,
            foodItemName: ingredient.foodItemId?.name || 'Unknown',
            requiredQuantity: ingredient.quantity,
            availableQuantity: fridgeItem.quantity,
            unitId: ingredient.unitId._id,
            unitName: ingredient.unitId?.name || 'Unknown'
          });

          // Tính expiringScore: nếu sắp hết hạn (trong 3 ngày) thì cộng điểm
          if (fridgeItem.status === 'expiring_soon' && fridgeItem.daysLeft <= 3 && fridgeItem.daysLeft >= 0) {
            // Điểm cao hơn nếu còn ít ngày hơn (ưu tiên hết hạn sớm)
            expiringScore += (4 - fridgeItem.daysLeft) * ingredient.quantity;
          }
        } else {
          // Thiếu hoặc không đủ nguyên liệu
          const availableQty = fridgeItem ? fridgeItem.quantity : 0;
          missingIngredients.push({
            foodItemId: ingredient.foodItemId._id,
            foodItemName: ingredient.foodItemId?.name || 'Unknown',
            requiredQuantity: ingredient.quantity,
            availableQuantity: availableQty,
            missingQuantity: ingredient.quantity - availableQty,
            unitId: ingredient.unitId._id,
            unitName: ingredient.unitId?.name || 'Unknown'
          });
        }
      });

      // Tính matchPercentage
      const totalIngredients = recipe.ingredients.length;
      const availableCount = availableIngredients.length;
      const matchPercentage = totalIngredients > 0 
        ? Math.round((availableCount / totalIngredients) * 100) 
        : 0;

      return {
        recipeId: recipe._id,
        name: recipe.name,
        description: recipe.description,
        image: recipe.image,
        servings: recipe.servings,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        difficulty: recipe.difficulty,
        category: recipe.category,
        availableIngredients,
        missingIngredients,
        matchPercentage,
        expiringScore: Math.round(expiringScore * 100) / 100 // Làm tròn 2 chữ số
      };
    });

    // 4. Sort theo expiringScore desc, rồi matchPercentage desc
    suggestedRecipes.sort((a, b) => {
      // Ưu tiên expiringScore trước
      if (b.expiringScore !== a.expiringScore) {
        return b.expiringScore - a.expiringScore;
      }
      // Sau đó sort theo matchPercentage
      return b.matchPercentage - a.matchPercentage;
    });

    res.json({
      success: true,
      count: suggestedRecipes.length,
      data: {
        recipes: suggestedRecipes
      }
    });
  } catch (error) {
    console.error('Error in suggestRecipes:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gợi ý món ăn',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Kiểm tra nguyên liệu của recipe có sẵn trong tủ lạnh
 * @route   GET /api/recipes/:id/check-ingredients
 * @access  Private
 * 
 * Luồng nghiệp vụ:
 * 1. Lấy Recipe theo ID
 * 2. Lấy FridgeItem của user
 * 3. So khớp ingredients với FridgeItem
 * 4. Phân loại availableIngredients và missingIngredients
 * 5. Trả về kết quả
 */
exports.checkIngredients = async (req, res, next) => {
  try {
    const recipeId = req.params.id;

    // 1. Lấy Recipe theo ID
    const recipe = await Recipe.findOne({
      _id: recipeId,
      ...buildRecipeAccessFilter(req)
    })
      .populate('ingredients.foodItemId', 'name')
      .populate('ingredients.unitId', 'name abbreviation');

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công thức'
      });
    }

    // 2. Lấy FridgeItem của user (chỉ lấy available và expiring_soon, quantity > 0)
    const viewFilter = buildViewFilter(req);
    let fridgeItems = await FridgeItem.find({
      ...viewFilter,
      status: { $in: ['available', 'expiring_soon'] },
      quantity: { $gt: 0 }
    })
      .populate('foodItemId', 'name')
      .populate('unitId', 'name abbreviation');

    // Filter ra những items không populate được (foodItemId hoặc unitId null)
    fridgeItems = fridgeItems.filter(item => item.foodItemId && item.unitId);

    // 3. Tạo map để tra cứu nhanh: foodItemId + unitId -> total quantity
    const fridgeMap = new Map();
    fridgeItems.forEach(item => {
      // Kiểm tra null trước khi truy cập
      if (!item.foodItemId || !item.unitId) {
        return; // Bỏ qua item không có foodItemId hoặc unitId
      }
      
      const key = `${item.foodItemId._id.toString()}_${item.unitId._id.toString()}`;
      
      // Cộng quantity nếu đã có
      if (fridgeMap.has(key)) {
        const existing = fridgeMap.get(key);
        existing.quantity += item.quantity;
      } else {
        fridgeMap.set(key, {
          foodItemId: item.foodItemId._id,
          unitId: item.unitId._id,
          quantity: item.quantity
        });
      }
    });

    // Filter ra những ingredients không populate được
    const validIngredients = recipe.ingredients.filter(ing => ing.foodItemId && ing.unitId);
    
    if (validIngredients.length !== recipe.ingredients.length) {
      console.warn(`Recipe ${recipe._id} has ${recipe.ingredients.length - validIngredients.length} invalid ingredients (null foodItemId or unitId)`);
    }

    // 4. So khớp ingredients với FridgeItem
    const availableIngredients = [];
    const missingIngredients = [];

    validIngredients.forEach(ingredient => {
      // Kiểm tra null trước khi truy cập
      if (!ingredient.foodItemId || !ingredient.unitId) {
        return; // Bỏ qua ingredient không có foodItemId hoặc unitId
      }
      
      const key = `${ingredient.foodItemId._id.toString()}_${ingredient.unitId._id.toString()}`;
      const fridgeItem = fridgeMap.get(key);

      if (fridgeItem && fridgeItem.quantity >= ingredient.quantity) {
        // Có đủ nguyên liệu
        availableIngredients.push({
          foodItemId: ingredient.foodItemId._id,
          foodItemName: ingredient.foodItemId?.name || 'Unknown',
          quantityAvailable: fridgeItem.quantity,
          quantityRequired: ingredient.quantity,
          unitId: ingredient.unitId._id,
          unitName: ingredient.unitId?.name || 'Unknown'
        });
      } else {
        // Thiếu hoặc không đủ nguyên liệu
        const quantityAvailable = fridgeItem ? fridgeItem.quantity : 0;
        const quantityMissing = ingredient.quantity - quantityAvailable;

        missingIngredients.push({
          foodItemId: ingredient.foodItemId._id,
          foodItemName: ingredient.foodItemId?.name || 'Unknown',
          quantityRequired: ingredient.quantity,
          quantityMissing: quantityMissing,
          quantityAvailable: quantityAvailable,
          unitId: ingredient.unitId._id,
          unitName: ingredient.unitId?.name || 'Unknown'
        });
      }
    });

    // 5. Trả về kết quả
    res.json({
      success: true,
      data: {
        recipeId: recipe._id,
        name: recipe.name,
        availableIngredients,
        missingIngredients
      }
    });
  } catch (error) {
    console.error('Error in checkIngredients:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra nguyên liệu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Nấu món ăn - trừ nguyên liệu từ tủ lạnh
 * @route   POST /api/recipes/:id/cook
 * @access  Private
 * 
 * Luồng nghiệp vụ:
 * 1. Lấy Recipe theo ID
 * 2. Lấy FridgeItem của user
 * 3. Kiểm tra có đủ nguyên liệu không
 * 4. Nếu không đủ → return 400 error
 * 5. Trừ quantity từ FridgeItem (ưu tiên dùng thực phẩm sắp hết hạn trước)
 * 6. Nếu quantity = 0 → set status = "used_up"
 * 7. Tạo notification
 * 8. Trả về success message
 */
exports.cookRecipe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const recipeId = req.params.id;

    // 1. Lấy Recipe theo ID
    const recipe = await Recipe.findOne({
      _id: recipeId,
      ...buildRecipeAccessFilter(req)
    })
      .populate('ingredients.foodItemId', 'name')
      .populate('ingredients.unitId', 'name abbreviation');

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công thức'
      });
    }

    // 2. Lấy FridgeItem theo view (chỉ lấy available và expiring_soon, quantity > 0)
    const viewFilter = buildViewFilter(req);
    let fridgeItems = await FridgeItem.find({
      ...viewFilter,
      status: { $in: ['available', 'expiring_soon'] },
      quantity: { $gt: 0 }
    })
      .populate('foodItemId', 'name')
      .populate('unitId', 'name abbreviation')
      .sort({ expiryDate: 1 }); // Prioritize expiring soonest

    // Filter ra những items không populate được (foodItemId hoặc unitId null)
    fridgeItems = fridgeItems.filter(item => item.foodItemId && item.unitId);

    // 3. Tạo map để tra cứu nhanh: foodItemId + unitId -> array of FridgeItems
    const fridgeMap = new Map();
    fridgeItems.forEach(item => {
      // Kiểm tra null trước khi truy cập
      if (!item.foodItemId || !item.unitId) {
        return; // Bỏ qua item không có foodItemId hoặc unitId
      }
      
      const key = `${item.foodItemId._id.toString()}_${item.unitId._id.toString()}`;
      
      if (!fridgeMap.has(key)) {
        fridgeMap.set(key, []);
      }
      fridgeMap.get(key).push(item);
    });

    // Filter ra những ingredients không populate được
    const validIngredients = recipe.ingredients.filter(ing => ing.foodItemId && ing.unitId);
    
    if (validIngredients.length !== recipe.ingredients.length) {
      console.warn(`Recipe ${recipe._id} has ${recipe.ingredients.length - validIngredients.length} invalid ingredients (null foodItemId or unitId)`);
    }

    if (validIngredients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Công thức không có nguyên liệu hợp lệ'
      });
    }

    // 4. Kiểm tra có đủ nguyên liệu không
    const missingIngredients = [];
    const ingredientsToUse = [];

    for (const ingredient of validIngredients) {
      // Kiểm tra null trước khi truy cập
      if (!ingredient.foodItemId || !ingredient.unitId) {
        continue; // Bỏ qua ingredient không có foodItemId hoặc unitId
      }
      
      const key = `${ingredient.foodItemId._id.toString()}_${ingredient.unitId._id.toString()}`;
      const availableItems = fridgeMap.get(key) || [];
      
      // Tính tổng quantity có sẵn
      const totalAvailable = availableItems.reduce((sum, item) => sum + item.quantity, 0);
      
      if (totalAvailable < ingredient.quantity) {
        // Không đủ nguyên liệu
        missingIngredients.push({
          foodItemId: ingredient.foodItemId._id,
          foodItemName: ingredient.foodItemId?.name || 'Unknown',
          requiredQuantity: ingredient.quantity,
          availableQuantity: totalAvailable,
          missingQuantity: ingredient.quantity - totalAvailable,
          unitId: ingredient.unitId._id,
          unitName: ingredient.unitId?.name || 'Unknown'
        });
      } else {
        // Đủ nguyên liệu, lưu lại để trừ sau
        ingredientsToUse.push({
          ingredient,
          availableItems,
          requiredQuantity: ingredient.quantity
        });
      }
    }

    // 5. Nếu không đủ nguyên liệu → return 400 error
    if (missingIngredients.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không đủ nguyên liệu để nấu món này',
        data: {
          missingIngredients
        }
      });
    }

    // 6. Trừ quantity từ FridgeItem (ưu tiên dùng thực phẩm sắp hết hạn trước)
    const updatedFridgeItems = [];
    const consumptionLogs = [];
    
    for (const { ingredient, availableItems, requiredQuantity } of ingredientsToUse) {
      let remainingToSubtract = requiredQuantity;
      
      // Sắp xếp theo expiryDate (sắp hết hạn trước) để ưu tiên dùng trước
      availableItems.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
      
      for (const fridgeItem of availableItems) {
        if (remainingToSubtract <= 0) break;
        
        const subtractAmount = Math.min(remainingToSubtract, fridgeItem.quantity);
        fridgeItem.quantity -= subtractAmount;
        remainingToSubtract -= subtractAmount;
        
        // 7. Nếu quantity = 0 → set status = "used_up", nếu không thì update status theo expiryDate
        if (fridgeItem.quantity === 0) {
          fridgeItem.status = 'used_up';
        } else {
          fridgeItem.updateStatus(); // Update status based on expiryDate
        }
        
        await fridgeItem.save();
        updatedFridgeItems.push(fridgeItem);

        if (subtractAmount > 0) {
          consumptionLogs.push({
            userId: userId,
            familyGroupId: resolveFamilyGroupId(req),
            foodItemId: fridgeItem.foodItemId?._id || ingredient.foodItemId._id,
            unitId: fridgeItem.unitId?._id || ingredient.unitId._id,
            fridgeItemId: fridgeItem._id,
            quantity: subtractAmount,
            source: 'recipe',
            recipeId: recipe._id
          });
        }
      }
    }

    if (consumptionLogs.length > 0) {
      try {
        await ConsumptionLog.insertMany(consumptionLogs);
      } catch (logError) {
        console.error('Error logging consumption:', logError);
      }
    }

    // 8. Tạo notification
    const familyGroupId = resolveFamilyGroupId(req);
    const actorName = req.user.fullName || req.user.email || 'Thành viên';

    if (familyGroupId) {
      const familyGroup = await FamilyGroup.findById(familyGroupId)
        .populate('members.userId', 'fullName email');
      const memberIds = familyGroup
        ? familyGroup.members.map(member => member.userId._id)
        : [userId];

      for (const memberId of memberIds) {
        const notification = await Notification.create({
          userId: memberId,
          type: 'recipe_cooked',
          title: 'Món ăn đã được nấu',
          message: `${actorName} đã nấu món "${recipe.name}"`,
          relatedId: recipe._id,
          relatedType: 'Recipe',
          scope: 'family',
          familyGroupId,
          familyGroupName: familyGroup?.name || null,
          actorId: req.user.id,
          actorName,
          actionUrl: '/recipes',
          actionLabel: notificationService.DEFAULT_ACTION_LABEL,
          isRead: false
        });
        await notificationService.sendNotificationEmail(notification, { userId: memberId });
      }
    } else {
      const notification = await Notification.create({
        userId: userId,
        type: 'recipe_cooked',
        title: 'Đã nấu món ăn',
        message: `Bạn đã nấu món "${recipe.name}"`,
        relatedId: recipe._id,
        relatedType: 'Recipe',
        scope: 'personal',
        actionUrl: '/recipes',
        actionLabel: notificationService.DEFAULT_ACTION_LABEL,
        isRead: false
      });
      await notificationService.sendNotificationEmail(notification, { userId });
    }

    // 9. Trả về success message
    res.json({
      success: true,
      message: `Đã nấu món "${recipe.name}" thành công`,
      data: {
        recipe: {
          id: recipe._id,
          name: recipe.name,
          description: recipe.description,
          image: recipe.image,
          servings: recipe.servings
        },
        updatedFridgeItems: updatedFridgeItems.map(item => ({
          id: item._id,
          foodItemName: item.foodItemId?.name || 'Unknown',
          quantity: item.quantity,
          status: item.status
        }))
      }
    });
  } catch (error) {
    console.error('Error in cookRecipe:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi nấu món ăn',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
