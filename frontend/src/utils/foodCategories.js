// Food category mapping for shopping list items
// Maps food item names to their categories

export const foodCategoryMap = {
  // Rau củ
  "Cà chua": "Rau củ",
  "Rau cải": "Rau củ",
  "Hành tây": "Rau củ",
  "Tỏi": "Rau củ",
  "Ớt": "Rau củ",
  
  // Thịt cá
  "Thịt heo": "Thịt cá",
  "Cá hồi": "Thịt cá",
  "Thịt gà": "Thịt cá",
  "Cá": "Thịt cá",
  
  // Trái cây
  "Chuối": "Trái cây",
  "Táo": "Trái cây",
  
  // Đồ uống
  "Sữa tươi": "Đồ uống",
  "Sữa chua": "Đồ uống",
  
  // Khác
  "Gạo": "Khác",
  "Dầu ăn": "Khác",
  "Nước mắm": "Khác",
  "Đường": "Khác",
  "Muối": "Khác",
  "Trứng": "Khác",
  "Bánh mì": "Khác",
}

// Get category for a food item name
export function getFoodCategory(itemName) {
  return foodCategoryMap[itemName] || "Khác"
}

// Category display order
export const categoryOrder = ["Rau củ", "Thịt cá", "Trái cây", "Đồ uống", "Khác"]

// Category icons (optional, can use emoji or lucide icons)
export const categoryIcons = {
  "Rau củ": "🥬",
  "Thịt cá": "🥩",
  "Trái cây": "🍎",
  "Đồ uống": "🥤",
  "Khác": "📦",
}

