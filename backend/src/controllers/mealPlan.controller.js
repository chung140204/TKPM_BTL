const MealPlan = require('../models/MealPlan.model');
const ShoppingList = require('../models/ShoppingList.model');
const FridgeItem = require('../models/FridgeItem.model');
const { buildViewFilter, resolveFamilyGroupId } = require('../utils/view');
// Require models để populate
require('../models/Recipe.model');
require('../models/FoodItem.model');
require('../models/Unit.model');

exports.getMealPlans = async (req, res, next) => {
  try {
    const viewFilter = buildViewFilter(req);
    const mealPlans = await MealPlan.find(viewFilter)
      .populate('meals.recipeId', 'name image servings')
      .sort({ startDate: -1 });

    res.json({
      success: true,
      count: mealPlans.length,
      data: { mealPlans }
    });
  } catch (error) {
    next(error);
  }
};

exports.getMealPlanById = async (req, res, next) => {
  try {
    const viewFilter = buildViewFilter(req);
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      ...viewFilter
    })
      .populate('meals.recipeId');

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy kế hoạch bữa ăn'
      });
    }

    res.json({
      success: true,
      data: { mealPlan }
    });
  } catch (error) {
    next(error);
  }
};

exports.createMealPlan = async (req, res, next) => {
  try {
    const mealPlan = await MealPlan.create({
      ...req.body,
      userId: req.user.id,
      familyGroupId: resolveFamilyGroupId(req)
    });

    await mealPlan.populate('meals.recipeId');

    res.status(201).json({
      success: true,
      message: 'Tạo kế hoạch bữa ăn thành công',
      data: { mealPlan }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMealPlan = async (req, res, next) => {
  try {
    // Tìm meal plan hiện tại để lấy giá trị cũ
    const viewFilter = buildViewFilter(req);
    const existingMealPlan = await MealPlan.findOne({
      _id: req.params.id,
      ...viewFilter
    });
    
    if (!existingMealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy kế hoạch bữa ăn'
      });
    }

    // Validate startDate và endDate nếu có trong req.body
    const startDate = req.body.startDate ? new Date(req.body.startDate) : existingMealPlan.startDate;
    const endDate = req.body.endDate ? new Date(req.body.endDate) : existingMealPlan.endDate;

    // Kiểm tra endDate phải sau startDate
    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'Ngày kết thúc phải sau ngày bắt đầu'
      });
    }

    const updates = { ...req.body };
    delete updates.userId;
    delete updates.familyGroupId;

    // Update meal plan
    const mealPlan = await MealPlan.findOneAndUpdate(
      { _id: req.params.id, ...viewFilter },
      updates,
      { new: true, runValidators: true }
    ).populate('meals.recipeId');

    res.json({
      success: true,
      message: 'Cập nhật kế hoạch bữa ăn thành công',
      data: { mealPlan }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteMealPlan = async (req, res, next) => {
  try {
    const viewFilter = buildViewFilter(req);
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      ...viewFilter
    });

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy kế hoạch bữa ăn'
      });
    }

    await mealPlan.deleteOne();

    res.json({
      success: true,
      message: 'Xóa kế hoạch bữa ăn thành công'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tự động tạo Shopping List từ Meal Plan
 * @route   POST /api/meal-plans/:id/generate-shopping-list
 * @access  Private
 */
exports.generateShoppingListFromMealPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const mealPlanId = req.params.id;
    const viewFilter = buildViewFilter(req);

    // 1. Tìm MealPlan và populate recipes với ingredients
    const mealPlan = await MealPlan.findOne({
      _id: mealPlanId,
      ...viewFilter
    })
      .populate({
        path: 'meals.recipeId',
        populate: [
          {
            path: 'ingredients.foodItemId',
            select: 'name categoryId'
          },
          {
            path: 'ingredients.unitId',
            select: 'name abbreviation'
          }
        ]
      });

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy kế hoạch bữa ăn'
      });
    }

    // 2. Aggregate tất cả ingredients cần thiết từ tất cả recipes
    const requiredIngredientsMap = new Map(); // Key: "foodItemId_unitId", Value: { foodItemId, unitId, quantity }

    for (const meal of mealPlan.meals) {
      if (!meal.recipeId || !meal.recipeId.ingredients) {
        continue;
      }

      const recipe = meal.recipeId;
      const recipeServings = recipe.servings || 4; // Default servings
      const mealServings = meal.servings || recipeServings;
      const ratio = mealServings / recipeServings;

      for (const ingredient of recipe.ingredients) {
        if (!ingredient.foodItemId || !ingredient.unitId) {
          continue; // Skip invalid ingredients
        }

        const foodItemId = ingredient.foodItemId._id || ingredient.foodItemId;
        const unitId = ingredient.unitId._id || ingredient.unitId;
        const key = `${foodItemId}_${unitId}`;
        const adjustedQuantity = ingredient.quantity * ratio;

        const categoryId = ingredient.foodItemId.categoryId?._id || ingredient.foodItemId.categoryId || null;

        if (requiredIngredientsMap.has(key)) {
          requiredIngredientsMap.get(key).quantity += adjustedQuantity;
        } else {
          requiredIngredientsMap.set(key, {
            foodItemId: foodItemId,
            unitId: unitId,
            quantity: adjustedQuantity,
            foodItemName: ingredient.foodItemId.name || 'Unknown',
            unitName: ingredient.unitId.name || 'Unknown',
            categoryId: categoryId
          });
        }
      }
    }

    if (requiredIngredientsMap.size === 0) {
      return res.status(400).json({
        success: false,
        message: 'Kế hoạch bữa ăn không có nguyên liệu nào'
      });
    }

    // 3. Lấy tất cả FridgeItems của user (chỉ available và expiring_soon)
    const fridgeItems = await FridgeItem.find({
      ...viewFilter,
      status: { $in: ['available', 'expiring_soon'] }
    })
      .populate('foodItemId', 'name')
      .populate('unitId', 'name');

    // 4. Group FridgeItems theo foodItemId + unitId và tính tổng quantity
    const availableIngredientsMap = new Map(); // Key: "foodItemId_unitId", Value: quantity

    for (const fridgeItem of fridgeItems) {
      if (!fridgeItem.foodItemId || !fridgeItem.unitId) {
        continue; // Skip invalid fridge items
      }

      const foodItemId = fridgeItem.foodItemId._id || fridgeItem.foodItemId;
      const unitId = fridgeItem.unitId._id || fridgeItem.unitId;
      const key = `${foodItemId}_${unitId}`;

      if (availableIngredientsMap.has(key)) {
        availableIngredientsMap.set(key, availableIngredientsMap.get(key) + fridgeItem.quantity);
      } else {
        availableIngredientsMap.set(key, fridgeItem.quantity);
      }
    }

    // 5. So sánh required vs available và tính missing ingredients
    const missingIngredients = [];

    for (const [key, required] of requiredIngredientsMap) {
      const available = availableIngredientsMap.get(key) || 0;
      const missing = required.quantity - available;

      if (missing > 0) {
        missingIngredients.push({
          foodItemId: required.foodItemId,
          unitId: required.unitId,
          quantity: missing,
          reason: 'expiring_soon', // Default reason for meal plan generated items
          categoryId: required.categoryId || null
        });
      }
    }

    // 6. Nếu không có missing ingredients
    if (missingIngredients.length === 0) {
      return res.json({
        success: true,
        message: 'Bạn đã có đủ nguyên liệu cho kế hoạch bữa ăn này',
        data: {
          shoppingList: null,
          missingIngredientsCount: 0
        }
      });
    }

    // 7. Tạo ShoppingList mới
    const shoppingList = await ShoppingList.create({
      userId: userId,
      familyGroupId: mealPlan.familyGroupId || null,
      name: `Auto Shopping List from Meal Plan: ${mealPlan.name}`,
      items: missingIngredients,
      status: 'active',
      isAutoGenerated: true,
      sourceMealPlanId: mealPlan._id,
      plannedDate: new Date()
    });

    // 8. Populate để trả về đầy đủ thông tin
    await shoppingList.populate([
      { path: 'items.foodItemId', select: 'name categoryId image' },
      { path: 'items.unitId', select: 'name abbreviation' },
      { path: 'sourceMealPlanId', select: 'name startDate endDate' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Tạo danh sách mua sắm từ kế hoạch bữa ăn thành công',
      data: {
        shoppingList
      }
    });
  } catch (error) {
    console.error('Error in generateShoppingListFromMealPlan:', error);
    next(error);
  }
};



