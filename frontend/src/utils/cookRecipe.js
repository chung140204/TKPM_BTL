// Helper function to simulate cooking a recipe and updating fridge items
// This is a DEMO function that simulates backend cooking logic

const FRIDGE_STORAGE_KEY = "fridge_items"

// Parse quantity string (e.g., "0.5 kg" -> 0.5)
function parseQuantity(quantityStr) {
  if (!quantityStr) return 0
  const match = quantityStr.match(/^([\d.]+)/)
  return match ? parseFloat(match[1]) : 0
}

// Extract unit from quantity string (e.g., "0.5 kg" -> "kg")
function extractUnit(quantityStr) {
  if (!quantityStr) return ""
  const match = quantityStr.match(/\s*(.+)$/)
  return match ? match[1].trim() : ""
}

// Simulate cooking: subtract ingredients from fridge items
export function cookRecipe(recipe) {
  try {
    // Load current fridge items
    const saved = localStorage.getItem(FRIDGE_STORAGE_KEY)
    if (!saved) {
      return {
        success: false,
        message: "Không tìm thấy dữ liệu tủ lạnh",
        missingIngredients: recipe.missingIngredients || []
      }
    }

    const fridgeItems = JSON.parse(saved)
    const updatedItems = [...fridgeItems]
    const missingIngredients = []
    const consumedItems = []

    // Process available ingredients (those in fridge)
    if (recipe.availableIngredients && recipe.availableIngredients.length > 0) {
      recipe.availableIngredients.forEach((ingredient) => {
        const requiredQuantity = parseQuantity(ingredient.quantity)
        const requiredUnit = extractUnit(ingredient.quantity)
        const ingredientName = ingredient.name.toLowerCase()

        // Find matching fridge item (case-insensitive name match)
        const fridgeItemIndex = updatedItems.findIndex(
          item => item.name.toLowerCase() === ingredientName
        )

        if (fridgeItemIndex !== -1) {
          const fridgeItem = updatedItems[fridgeItemIndex]
          const currentQuantity = parseFloat(fridgeItem.quantity) || 0

          // Simple subtraction (assuming same unit for demo)
          // In real app, would need unit conversion
          const newQuantity = Math.max(0, currentQuantity - requiredQuantity)

          if (newQuantity <= 0) {
            // Mark as used up
            updatedItems[fridgeItemIndex] = {
              ...fridgeItem,
              quantity: 0,
              status: "used_up"
            }
            consumedItems.push({
              name: fridgeItem.name,
              consumed: currentQuantity,
              remaining: 0,
              status: "used_up"
            })
          } else {
            // Update quantity
            updatedItems[fridgeItemIndex] = {
              ...fridgeItem,
              quantity: newQuantity
            }
            consumedItems.push({
              name: fridgeItem.name,
              consumed: requiredQuantity,
              remaining: newQuantity
            })
          }
        } else {
          // Ingredient not found in fridge (shouldn't happen for availableIngredients, but handle it)
          missingIngredients.push(ingredient)
        }
      })
    }

    // Track missing ingredients
    if (recipe.missingIngredients && recipe.missingIngredients.length > 0) {
      missingIngredients.push(...recipe.missingIngredients)
    }

    // Nếu thiếu nguyên liệu, KHÔNG trừ nguyên liệu và return error
    if (missingIngredients.length > 0) {
      return {
        success: false,
        message: "Không đủ nguyên liệu để nấu món này. Vui lòng mua thêm nguyên liệu còn thiếu.",
        missingIngredients,
        consumedItems: []
      }
    }

    // Save updated fridge items (chỉ khi đủ nguyên liệu)
    localStorage.setItem(FRIDGE_STORAGE_KEY, JSON.stringify(updatedItems))

    return {
      success: true,
      consumedItems,
      missingIngredients,
      updatedFridgeItems: updatedItems
    }
  } catch (error) {
    console.error("Error cooking recipe:", error)
    return {
      success: false,
      message: "Có lỗi xảy ra khi cập nhật nguyên liệu",
      error: error.message
    }
  }
}

