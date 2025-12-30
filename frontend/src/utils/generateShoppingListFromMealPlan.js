// Helper function to generate shopping list from meal plan
// This simulates the backend logic for creating shopping list with missing ingredients

import { mockRecipes } from "@/data/mockData"
import { getFoodCategory } from "@/utils/foodCategories"

const FRIDGE_STORAGE_KEY = "fridge_items"
const SHOPPING_LISTS_STORAGE_KEY = "shopping_lists"

// Parse quantity string (e.g., "0.5 kg" -> 0.5)
function parseQuantity(quantityStr) {
  if (!quantityStr) return 0
  const match = String(quantityStr).match(/^([\d.]+)/)
  return match ? parseFloat(match[1]) : 0
}

// Extract unit from quantity string (e.g., "0.5 kg" -> "kg")
function extractUnit(quantityStr) {
  if (!quantityStr) return "kg"
  const match = String(quantityStr).match(/[\d.]+\s*(.+)$/)
  return match ? match[1].trim() : "kg"
}

// Load fridge items from localStorage
function loadFridgeItems() {
  try {
    const saved = localStorage.getItem(FRIDGE_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error("Error loading fridge items:", error)
  }
  return []
}

// Generate shopping list from meal plan
export function generateShoppingListFromMealPlan(mealPlan) {
  try {
    // 1. Collect all unique recipes from meal plan
    const recipeIds = new Set()
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    
    days.forEach(day => {
      Object.values(mealPlan[day] || {}).forEach(meal => {
        if (meal && meal.id) {
          recipeIds.add(meal.id)
        }
      })
    })

    if (recipeIds.size === 0) {
      return {
        success: false,
        message: "Không có món ăn nào trong kế hoạch bữa ăn"
      }
    }

    // 2. Get full recipe data and aggregate all required ingredients
    const requiredIngredientsMap = new Map() // Key: ingredient name (lowercase), Value: { name, quantity, unit }

    recipeIds.forEach(recipeId => {
      const recipe = mockRecipes.find(r => r.id === recipeId)
      if (!recipe) return

      // Combine available and missing ingredients (all are required)
      const allIngredients = [
        ...(recipe.availableIngredients || []),
        ...(recipe.missingIngredients || []),
      ]

      allIngredients.forEach(ing => {
        const key = ing.name.toLowerCase()
        const quantity = parseQuantity(ing.quantity)
        const unit = extractUnit(ing.quantity)

        if (requiredIngredientsMap.has(key)) {
          // Sum quantities if same ingredient appears multiple times
          const existing = requiredIngredientsMap.get(key)
          requiredIngredientsMap.set(key, {
            name: ing.name,
            quantity: existing.quantity + quantity,
            unit: unit || existing.unit
          })
        } else {
          requiredIngredientsMap.set(key, {
            name: ing.name,
            quantity: quantity,
            unit: unit
          })
        }
      })
    })

    // 3. Load fridge items and group by name
    const fridgeItems = loadFridgeItems()
    const availableIngredientsMap = new Map() // Key: ingredient name (lowercase), Value: quantity

    fridgeItems.forEach(item => {
      if (item.name && item.quantity > 0) {
        const key = item.name.toLowerCase()
        const currentQuantity = parseFloat(item.quantity) || 0
        
        if (availableIngredientsMap.has(key)) {
          availableIngredientsMap.set(key, availableIngredientsMap.get(key) + currentQuantity)
        } else {
          availableIngredientsMap.set(key, currentQuantity)
        }
      }
    })

    // 4. Compare required vs available and calculate missing ingredients
    const missingIngredients = []

    requiredIngredientsMap.forEach((required, key) => {
      const available = availableIngredientsMap.get(key) || 0
      const missing = required.quantity - available

      if (missing > 0) {
        missingIngredients.push({
          id: Date.now().toString() + Math.random(),
          name: required.name,
          quantity: `${missing.toFixed(1)} ${required.unit}`,
          isBought: false,
          category: getFoodCategory(required.name),
          updatedAt: null,
          updatedBy: null,
          updatedByAvatar: null,
        })
      }
    })

    // 5. If no missing ingredients
    if (missingIngredients.length === 0) {
      return {
        success: true,
        message: "Bạn đã có đủ nguyên liệu cho kế hoạch bữa ăn này!",
        shoppingList: null,
        missingIngredientsCount: 0
      }
    }

    // 6. Create shopping list
    const shoppingList = {
      id: Date.now().toString(),
      name: `Danh sách mua sắm từ kế hoạch bữa ăn - ${new Date().toLocaleDateString("vi-VN")}`,
      status: "active",
      plannedDate: new Date().toISOString().split("T")[0],
      familyGroupId: null,
      items: missingIngredients,
      isAutoGenerated: true,
      sourceMealPlanId: "meal_plan_" + Date.now(),
    }

    // 7. Save shopping list to localStorage
    try {
      const savedLists = localStorage.getItem(SHOPPING_LISTS_STORAGE_KEY)
      const existingLists = savedLists ? JSON.parse(savedLists) : []
      existingLists.unshift(shoppingList) // Add to beginning
      localStorage.setItem(SHOPPING_LISTS_STORAGE_KEY, JSON.stringify(existingLists))
    } catch (error) {
      console.error("Error saving shopping list:", error)
    }

    return {
      success: true,
      shoppingList,
      missingIngredientsCount: missingIngredients.length,
      message: `Đã tạo danh sách mua sắm với ${missingIngredients.length} nguyên liệu thiếu hụt`
    }
  } catch (error) {
    console.error("Error generating shopping list from meal plan:", error)
    return {
      success: false,
      message: "Có lỗi xảy ra khi tạo danh sách mua sắm",
      error: error.message
    }
  }
}

