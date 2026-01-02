import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { DayColumn } from "@/components/MealPlanner/DayColumn"
import { RecipeModal } from "@/components/MealPlanner/RecipeModal"
import { RecipeDetailDialog } from "@/components/RecipeDetailDialog"
import { ShoppingCart, Calendar, Sparkles, Loader2 } from "lucide-react"
import { mockRecipes, mockFridgeItems as initialMockFridgeItems } from "@/data/mockData"
import { generateShoppingListFromMealPlan } from "@/utils/generateShoppingListFromMealPlan"
import { 
  getMealPlans, 
  createMealPlan, 
  updateMealPlan,
  generateShoppingListFromMealPlan as generateShoppingListAPI
} from "@/utils/api"
import { getFridgeItems } from "@/utils/api"

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
const dayNames = {
  monday: "Thứ 2",
  tuesday: "Thứ 3",
  wednesday: "Thứ 4",
  thursday: "Thứ 5",
  friday: "Thứ 6",
  saturday: "Thứ 7",
  sunday: "Chủ nhật"
}

const STORAGE_KEY = "meal_planner"

// Get start and end date of current week (Monday to Sunday)
function getCurrentWeekDates() {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ...
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Adjust to Monday
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  
  return { startDate: monday, endDate: sunday }
}

// Get date for a specific day of the week
function getDateForDay(dayIndex, startDate) {
  const date = new Date(startDate)
  date.setDate(startDate.getDate() + dayIndex)
  return date
}

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

// Transform backend meal plan (meals array) to frontend format (days object)
function transformMealPlanFromAPI(mealPlanData, startDate) {
  const frontendPlan = getInitialMealPlan()
  
  if (!mealPlanData || !mealPlanData.meals) {
    return frontendPlan
  }
  
  mealPlanData.meals.forEach(meal => {
    const mealDate = new Date(meal.date)
    const dayIndex = Math.floor((mealDate - startDate) / (1000 * 60 * 60 * 24))
    
    if (dayIndex >= 0 && dayIndex < 7) {
      const day = days[dayIndex]
      const mealType = meal.mealType
      
      if (day && mealType && meal.recipeId) {
        frontendPlan[day] = {
          ...frontendPlan[day],
          [mealType]: {
            id: meal.recipeId._id || meal.recipeId,
            name: meal.recipeId.name || 'Unknown',
            calories: meal.recipeId.calories || 0,
            image: meal.recipeId.image || null,
            servings: meal.servings || 4
          }
        }
      }
    }
  })
  
  return frontendPlan
}

// Transform frontend format (days object) to backend format (meals array)
function transformMealPlanToAPI(frontendPlan, startDate) {
  const meals = []
  
  days.forEach((day, dayIndex) => {
    const date = getDateForDay(dayIndex, startDate)
    const dayMeals = frontendPlan[day] || {}
    
    Object.keys(dayMeals).forEach(mealType => {
      const meal = dayMeals[mealType]
      if (meal && meal.id) {
        meals.push({
          date: date.toISOString(),
          mealType: mealType,
          recipeId: meal.id,
          servings: meal.servings || 4,
          status: 'planned'
        })
      }
    })
  })
  
  return meals
}

// Load meal plan from localStorage (fallback)
function loadMealPlanFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error("Error loading meal plan from storage:", error)
  }
  return getInitialMealPlan()
}

// Save meal plan to localStorage (for offline support)
function saveMealPlanToStorage(mealPlan) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mealPlan))
  } catch (error) {
    console.error("Error saving meal plan to storage:", error)
  }
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
  const [mealPlan, setMealPlan] = useState(getInitialMealPlan())
  const [currentMealPlanId, setCurrentMealPlanId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedMealType, setSelectedMealType] = useState(null)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [autoSuggestedSlots, setAutoSuggestedSlots] = useState(new Set())
  const [fridgeItems, setFridgeItems] = useState([])
  const [isSmartSuggesting, setIsSmartSuggesting] = useState(false)

  const { startDate, endDate } = getCurrentWeekDates()

  // Fetch meal plan from API
  useEffect(() => {
    const fetchMealPlan = async () => {
      try {
        setLoading(true)
        setError(null)
        
        console.log('Fetching meal plans from API...')
        const response = await getMealPlans()
        console.log('Meal plans API response:', response)
        
        if (response.success && response.data?.mealPlans) {
          // Find meal plan for current week
          const currentWeekPlan = response.data.mealPlans.find(plan => {
            const planStart = new Date(plan.startDate)
            const planEnd = new Date(plan.endDate)
            return planStart <= startDate && planEnd >= endDate
          })
          
          if (currentWeekPlan) {
            console.log('Found meal plan for current week:', currentWeekPlan)
            setCurrentMealPlanId(currentWeekPlan._id)
            const transformed = transformMealPlanFromAPI(currentWeekPlan, startDate)
            setMealPlan(transformed)
            console.log('✅ Loaded meal plan from database')
          } else {
            console.log('No meal plan found for current week, using empty plan')
            setMealPlan(getInitialMealPlan())
          }
        } else {
          throw new Error(response.message || 'API trả về lỗi')
        }
      } catch (err) {
        console.error('Error fetching meal plan:', err)
        setError(err.message || 'Không thể kết nối đến server')
        
        // Fallback to localStorage
        const localPlan = loadMealPlanFromStorage()
        setMealPlan(localPlan)
        console.warn('⚠ Using localStorage data as fallback')
      } finally {
        setLoading(false)
      }
    }

    // Fetch fridge items for smart suggest
    const fetchFridgeItems = async () => {
      try {
        const response = await getFridgeItems()
        if (response.success && response.data?.fridgeItems) {
          const transformed = response.data.fridgeItems.map(item => ({
            id: item._id,
            name: item.foodItemId?.name || 'Unknown',
            category: item.foodItemId?.categoryId?.name || 'Khác'
          }))
          setFridgeItems(transformed)
        }
      } catch (err) {
        console.warn('Could not fetch fridge items:', err)
        // Fallback to empty array
        setFridgeItems([])
      }
    }

    fetchMealPlan()
    fetchFridgeItems()
  }, [])

  // Save to database whenever mealPlan changes (debounced)
  useEffect(() => {
    if (loading) return // Don't save during initial load
    
    const timeoutId = setTimeout(async () => {
      await saveMealPlanToDatabase()
    }, 1000) // Debounce 1 second

    return () => clearTimeout(timeoutId)
  }, [mealPlan, loading])

  // Save meal plan to database
  const saveMealPlanToDatabase = async () => {
    try {
      setSaving(true)
      
      const meals = transformMealPlanToAPI(mealPlan, startDate)
      const mealPlanData = {
        name: `Kế hoạch bữa ăn tuần ${startDate.toLocaleDateString('vi-VN')}`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        meals: meals
      }
      
      if (currentMealPlanId) {
        // Update existing meal plan
        console.log('Updating meal plan:', currentMealPlanId)
        const response = await updateMealPlan(currentMealPlanId, mealPlanData)
        if (response.success) {
          console.log('✅ Meal plan updated in database')
        }
      } else {
        // Create new meal plan
        console.log('Creating new meal plan')
        const response = await createMealPlan(mealPlanData)
        if (response.success && response.data?.mealPlan) {
          setCurrentMealPlanId(response.data.mealPlan._id)
          console.log('✅ Meal plan created in database')
        }
      }
      
      // Also save to localStorage as backup
      saveMealPlanToStorage(mealPlan)
    } catch (err) {
      console.error('Error saving meal plan to database:', err)
      // Still save to localStorage as fallback
      saveMealPlanToStorage(mealPlan)
    } finally {
      setSaving(false)
    }
  }

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
    // Show confirmation modal
    if (!window.confirm(
      "Tính năng này sẽ tự động đề xuất bữa ăn dựa trên thực phẩm hiện có trong tủ lạnh.\n\n" +
      "Các bữa ăn đã được lên kế hoạch sẽ không bị thay đổi.\n\n" +
      "Bạn có muốn tiếp tục?"
    )) {
      return
    }

    setIsSmartSuggesting(true)

    // Simulate processing (for better UX)
    setTimeout(() => {
      const { newMealPlan, suggestedCount } = smartSuggestMeals(mealPlan, fridgeItems)

      if (suggestedCount === 0) {
        alert("Tất cả các bữa ăn đã được lên kế hoạch!")
        setIsSmartSuggesting(false)
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
      setIsSmartSuggesting(false)

      // Show feedback
      alert(`Đã đề xuất ${suggestedCount} bữa ăn dựa trên thực phẩm trong tủ lạnh`)

      // Remove glow effect after 3 seconds
      setTimeout(() => {
        setAutoSuggestedSlots(new Set())
      }, 3000)
    }, 500) // Small delay for UX
  }

  const handleGenerateShoppingList = async () => {
    // Check if meal plan has any meals
    const hasMeals = days.some(day => 
      Object.values(mealPlan[day] || {}).some(meal => meal !== null)
    )

    if (!hasMeals) {
      alert("Vui lòng thêm ít nhất một món ăn vào kế hoạch")
      return
    }

    if (!currentMealPlanId) {
      // Save meal plan first if not saved
      await saveMealPlanToDatabase()
      if (!currentMealPlanId) {
        alert("Vui lòng đợi lưu kế hoạch bữa ăn trước khi tạo danh sách mua sắm")
        return
      }
    }

    try {
      // Use API to generate shopping list
      const response = await generateShoppingListAPI(currentMealPlanId)
      
      if (response.success) {
        alert(
          `✅ ${response.message}\n\n` +
          `Danh sách mua sắm đã được tạo từ kế hoạch bữa ăn.\n` +
          `Bạn có thể xem danh sách trong trang "Danh sách mua sắm".`
        )
        
        // Dispatch event to notify Shopping page to refresh
        window.dispatchEvent(new CustomEvent('shoppingListsUpdated'))
      } else {
        throw new Error(response.message || 'Lỗi khi tạo danh sách mua sắm')
      }
    } catch (error) {
      console.error('Error generating shopping list:', error)
      // Fallback to local function
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
        
        window.dispatchEvent(new CustomEvent('shoppingListsUpdated'))
      }
    }
  }

  // Count total meals planned (reactive - updates when mealPlan changes)
  const totalMeals = days.reduce((count, day) => {
    return count + Object.values(mealPlan[day] || {}).filter(meal => meal !== null).length
  }, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Đang tải kế hoạch bữa ăn từ database...</p>
        </div>
      </div>
    )
  }

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
            {saving && <span className="ml-2 text-xs">(Đang lưu...)</span>}
            {error && <span className="ml-2 text-xs text-yellow-600">⚠ {error}</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleSmartSuggest}
            disabled={isSmartSuggesting}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            size="lg"
            title="Tự động đề xuất bữa ăn dựa trên thực phẩm trong tủ lạnh"
          >
            {isSmartSuggesting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Đang đề xuất...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Smart Suggest Meals
              </>
            )}
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
          disabled={totalMeals === 0}
          className={
            totalMeals === 0
              ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
              : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all text-white"
          }
          title={totalMeals === 0 ? "Vui lòng thêm ít nhất một món ăn vào kế hoạch" : "Tạo danh sách mua sắm từ kế hoạch bữa ăn"}
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          Tạo danh sách mua sắm
        </Button>
      </div>
    </div>
  )
}

