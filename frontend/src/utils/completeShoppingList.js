// Helper function to simulate completing a shopping list and updating fridge items
// This is a DEMO function that simulates backend completeShoppingList logic

const FRIDGE_STORAGE_KEY = "fridge_items"

// Parse quantity string (e.g., "2 kg" -> 2)
function parseQuantity(quantityStr) {
  if (!quantityStr) return 0
  const match = quantityStr.match(/^([\d.]+)/)
  return match ? parseFloat(match[1]) : 0
}

// Extract unit from quantity string (e.g., "2 kg" -> "kg")
function extractUnit(quantityStr) {
  if (!quantityStr) return "kg"
  const match = quantityStr.match(/\s*(.+)$/)
  return match ? match[1].trim() : "kg"
}

// Calculate expiry date (default: 7 days from now)
function calculateExpiryDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7) // Default: 7 days from now
  return date.toISOString().split("T")[0]
}

// Calculate item status based on expiry date
function calculateItemStatus(expiryDateString) {
  const expiryDate = new Date(expiryDateString)
  const today = new Date()
  
  today.setHours(0, 0, 0, 0)
  expiryDate.setHours(0, 0, 0, 0)
  
  const diffTime = expiryDate - today
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  let status = "available"
  if (daysLeft < 0) {
    status = "expired"
  } else if (daysLeft <= 3) {
    status = "expiring_soon"
  }
  
  return { status, daysLeft }
}

// Simulate completing shopping list: add bought items to fridge
export function completeShoppingList(shoppingList) {
  try {
    // Load current fridge items
    const saved = localStorage.getItem(FRIDGE_STORAGE_KEY)
    const fridgeItems = saved ? JSON.parse(saved) : []
    
    // Filter only bought items
    const boughtItems = shoppingList.items.filter(item => item.isBought === true)
    
    if (boughtItems.length === 0) {
      return {
        success: false,
        message: "Chưa có item nào được đánh dấu là đã mua"
      }
    }

    const updatedFridgeItems = [...fridgeItems]
    const addedItems = []
    const updatedItems = []

    // Process each bought item
    boughtItems.forEach(item => {
      const quantity = parseQuantity(item.quantity)
      const unit = extractUnit(item.quantity)
      const itemName = item.name.toLowerCase()
      const expiryDate = calculateExpiryDate() // Default: 7 days from now
      const { status, daysLeft } = calculateItemStatus(expiryDate)

      // Find existing fridge item with same name (case-insensitive)
      const existingIndex = updatedFridgeItems.findIndex(
        fridgeItem => fridgeItem.name.toLowerCase() === itemName
      )

      if (existingIndex !== -1) {
        // Update existing item: increase quantity
        const existing = updatedFridgeItems[existingIndex]
        updatedFridgeItems[existingIndex] = {
          ...existing,
          quantity: (parseFloat(existing.quantity) || 0) + quantity,
          // Keep existing expiryDate and status (or recalculate if needed)
        }
        updatedItems.push({
          name: item.name,
          quantity: quantity,
          unit: unit,
          action: "updated"
        })
      } else {
        // Create new fridge item
        const newFridgeItem = {
          id: Date.now().toString() + Math.random(),
          name: item.name,
          category: getCategoryFromName(item.name),
          quantity: quantity,
          unit: unit,
          expiryDate: expiryDate,
          status: status,
          daysLeft: daysLeft,
          storageLocation: "Ngăn mát", // Default
          source: "shopping_list"
        }
        updatedFridgeItems.push(newFridgeItem)
        addedItems.push({
          name: item.name,
          quantity: quantity,
          unit: unit,
          action: "created"
        })
      }
    })

    // Save updated fridge items
    localStorage.setItem(FRIDGE_STORAGE_KEY, JSON.stringify(updatedFridgeItems))

    return {
      success: true,
      addedItems,
      updatedItems,
      totalItems: addedItems.length + updatedItems.length
    }
  } catch (error) {
    console.error("Error completing shopping list:", error)
    return {
      success: false,
      message: "Có lỗi xảy ra khi cập nhật tủ lạnh",
      error: error.message
    }
  }
}

// Helper to get category from item name (simple mapping)
function getCategoryFromName(itemName) {
  const categoryMap = {
    "cà chua": "Rau củ",
    "rau cải": "Rau củ",
    "hành tây": "Rau củ",
    "tỏi": "Rau củ",
    "ớt": "Rau củ",
    "thịt heo": "Thịt cá",
    "thịt gà": "Thịt cá",
    "cá hồi": "Thịt cá",
    "chuối": "Trái cây",
    "táo": "Trái cây",
    "sữa tươi": "Đồ uống",
    "sữa chua": "Đồ uống",
  }
  
  return categoryMap[itemName.toLowerCase()] || "Khác"
}

