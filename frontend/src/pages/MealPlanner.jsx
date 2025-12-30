import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { DayColumn } from "@/components/MealPlanner/DayColumn"
import { RecipeModal } from "@/components/MealPlanner/RecipeModal"
import { RecipeDetailDialog } from "@/components/RecipeDetailDialog"
import { ShoppingCart, Calendar, Sparkles } from "lucide-react"
import { mockRecipes, mockFridgeItems as initialMockFridgeItems } from "@/data/mockData"
import { generateShoppingListFromMealPlan } from "@/utils/generateShoppingListFromMealPlan"

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

const STORAGE_KEY = "meal_planner"

// Initialize empty meal plan structure
function getInitialMealPlan() {
  return days.reduce((acc, day) => {
    acc[day] = {
      breakfast: null,
      lunch: null,
      dinner: null
    }
    return acc
  }, {})
}

// Load meal plan from localStorage
function loadMealPlan() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error("Error loading meal plan:", error)
  }
  return getInitialMealPlan()
}

// Save meal plan to localStorage
function saveMealPlan(mealPlan) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mealPlan))
  } catch (error) {
    console.error("Error saving meal plan:", error)
  }
}

// Load fridge items for calculating matchPercentage
function loadFridgeItems() {
  try {
    const saved = localStorage.getItem("fridge_items")
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error("Error loading fridge items:", error)
  }
  return initialMockFridgeItems
}

// Calculate matchPercentage for recipes based on fridge items
function calculateRecipeMatch(recipe, fridgeItems) {
  const fridgeNameSet = new Set(
    fridgeItems.map(item => item.name.toLowerCase())
  )

  const allRequired = [
    ...(recipe.availableIngredients || []),
    ...(recipe.missingIngredients || []),
  ]

  if (allRequired.length === 0) return 0

  const availableCount = allRequired.filter(ing => 
    fridgeNameSet.has(ing.name.toLowerCase())
  ).length

  return Math.round((availableCount / allRequired.length) * 100)
}

// Smart suggest meals based on fridge ingredients
function smartSuggestMeals(currentMealPlan, fridgeItems) {
  const fridgeNameSet = new Set(
    fridgeItems.map(item => item.name.toLowerCase())
  )

  // Calculate matchPercentage for all recipes
  const recipesWithMatch = mockRecipes.map(recipe => {
    const matchPercentage = calculateRecipeMatch(recipe, fridgeItems)
    return { ...recipe, matchPercentage }
  })

  // Sort recipes: favorites first, then by matchPercentage descending
  const sortedRecipes = [...recipesWithMatch].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1
    if (!a.isFavorite && b.isFavorite) return 1
    return b.matchPercentage - a.matchPercentage
  })

  const newMealPlan = { ...currentMealPlan }
  const usedRecipeIds = new Set()
  let suggestedCount = 0

  // Fill empty slots
  days.forEach(day => {
    const dayMeals = newMealPlan[day]
    const dayUsedIds = new Set()

    // Collect already used recipe IDs for this day
    Object.values(dayMeals).forEach(meal => {
      if (meal && meal.id) {
        dayUsedIds.add(meal.id)
      }
    })

    // Fill each meal type if empty
    Object.keys(dayMeals).forEach(mealType => {
      if (!dayMeals[mealType]) {
        // Find best recipe that hasn't been used in this day
        const bestRecipe = sortedRecipes.find(recipe => 
          !dayUsedIds.has(recipe.id)
        )

        if (bestRecipe) {
          newMealPlan[day] = {
            ...newMealPlan[day],
            [mealType]: {
              id: bestRecipe.id,
              name: bestRecipe.name,
              calories: bestRecipe.calories || Math.floor(Math.random() * 200) + 300,
              image: bestRecipe.image,
              isAutoSuggested: true // Mark as auto-suggested
            }
          }
          dayUsedIds.add(bestRecipe.id)
          suggestedCount++
        }
      }
    })
  })

  return { newMealPlan, suggestedCount }
}

export function MealPlanner() {
  const [mealPlan, setMealPlan] = useState(() => loadMealPlan())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedMealType, setSelectedMealType] = useState(null)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [autoSuggestedSlots, setAutoSuggestedSlots] = useState(new Set())

  // Save to localStorage whenever mealPlan changes
  useEffect(() => {
    saveMealPlan(mealPlan)
  }, [mealPlan])

  const handleAddMeal = (day, mealType) => {
    setSelectedDay(day)
    setSelectedMealType(mealType)
    setIsModalOpen(true)
  }

  const handleSelectRecipe = (recipe) => {
    if (selectedDay && selectedMealType) {
      setMealPlan(prev => ({
        ...prev,
        [selectedDay]: {
          ...prev[selectedDay],
          [selectedMealType]: {
            id: recipe.id,
            name: recipe.name,
            calories: recipe.calories || Math.floor(Math.random() * 200) + 300, // Mock calories if not available
            image: recipe.image
          }
        }
      }))
    }
    setSelectedDay(null)
    setSelectedMealType(null)
  }

  const handleRemoveMeal = (day, mealType) => {
    setMealPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: null
      }
    }))
  }

  const handleViewRecipe = (mealRecipe) => {
    // Find full recipe data from mockRecipes
    const fullRecipe = mockRecipes.find(r => r.id === mealRecipe.id)
    if (!fullRecipe) return

    // Calculate matchPercentage and ingredients based on fridge items
    const fridgeItems = loadFridgeItems()
    const fridgeNameSet = new Set(
      fridgeItems.map(item => item.name.toLowerCase())
    )

    const allRequired = [
      ...(fullRecipe.availableIngredients || []),
      ...(fullRecipe.missingIngredients || []),
    ]

    const availableIngredients = []
    const missingIngredients = []

    allRequired.forEach((ing) => {
      const key = ing.name.toLowerCase()
      if (fridgeNameSet.has(key)) {
        availableIngredients.push(ing)
      } else {
        missingIngredients.push(ing)
      }
    })

    const total = allRequired.length || 1
    const matchPercentage = Math.round((availableIngredients.length / total) * 100)

    // Create enriched recipe object
    const enrichedRecipe = {
      ...fullRecipe,
      availableIngredients,
      missingIngredients,
      matchPercentage,
    }

    setSelectedRecipe(enrichedRecipe)
    setIsDetailOpen(true)
  }

  const handleSmartSuggest = () => {
    const fridgeItems = loadFridgeItems()
    const { newMealPlan, suggestedCount } = smartSuggestMeals(mealPlan, fridgeItems)

    if (suggestedCount === 0) {
      alert("Tất cả các bữa ăn đã được lên kế hoạch!")
      return
    }

    // Track auto-suggested slots
    const newAutoSuggested = new Set()
    days.forEach(day => {
      Object.keys(newMealPlan[day]).forEach(mealType => {
        const meal = newMealPlan[day][mealType]
        if (meal && meal.isAutoSuggested) {
          newAutoSuggested.add(`${day}-${mealType}`)
        }
      })
    })

    setAutoSuggestedSlots(newAutoSuggested)
    setMealPlan(newMealPlan)

    // Show feedback
    alert(`Đã đề xuất ${suggestedCount} bữa ăn dựa trên thực phẩm trong tủ lạnh (demo)`)

    // Remove glow effect after 3 seconds
    setTimeout(() => {
      setAutoSuggestedSlots(new Set())
    }, 3000)
  }

  const handleGenerateShoppingList = () => {
    // Check if meal plan has any meals
    const hasMeals = days.some(day => 
      Object.values(mealPlan[day] || {}).some(meal => meal !== null)
    )

    if (!hasMeals) {
      alert("Vui lòng thêm ít nhất một món ăn vào kế hoạch")
      return
    }

    // Generate shopping list with missing ingredients
    const result = generateShoppingListFromMealPlan(mealPlan)

    if (!result.success) {
      alert(result.message || "Có lỗi xảy ra khi tạo danh sách mua sắm")
      return
    }

    if (result.missingIngredientsCount === 0) {
      alert("✅ " + result.message)
    } else {
      alert(
        `✅ ${result.message}\n\n` +
        `Danh sách mua sắm đã được tạo với ${result.missingIngredientsCount} nguyên liệu thiếu hụt.\n` +
        `Bạn có thể xem danh sách trong trang "Danh sách mua sắm".`
      )
      
      // Dispatch event to notify Shopping page to refresh
      window.dispatchEvent(new CustomEvent('shoppingListsUpdated'))
    }
  }

  // Count total meals planned
  const totalMeals = days.reduce((count, day) => {
    return count + Object.values(mealPlan[day]).filter(meal => meal !== null).length
  }, 0)

  return (
    <div className="space-y-6 p-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Kế hoạch bữa ăn
          </h1>
          <p className="text-muted-foreground mt-1">
            Lên kế hoạch bữa ăn cho cả tuần
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleSmartSuggest}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all"
            size="lg"
            title="Tự động đề xuất bữa ăn dựa trên thực phẩm trong tủ lạnh"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Smart Suggest Meals
          </Button>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{totalMeals}</p>
                <p className="text-xs text-muted-foreground">Bữa ăn đã lên kế hoạch</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {days.map((day) => (
          <DayColumn
            key={day}
            day={day}
            meals={mealPlan[day]}
            onAddMeal={handleAddMeal}
            onRemoveMeal={handleRemoveMeal}
            autoSuggestedSlots={autoSuggestedSlots}
            onViewRecipe={handleViewRecipe}
          />
        ))}
      </div>

      {/* Recipe Selection Modal */}
      <RecipeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedDay(null)
          setSelectedMealType(null)
        }}
        onSelect={handleSelectRecipe}
      />

      {/* Recipe Detail Dialog */}
      <RecipeDetailDialog
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedRecipe(null)
        }}
        recipe={selectedRecipe}
      />

      {/* Generate Shopping List Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleGenerateShoppingList}
          size="lg"
          className="shadow-lg hover:shadow-xl transition-shadow"
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          Tạo danh sách mua sắm
        </Button>
      </div>
    </div>
  )
}

