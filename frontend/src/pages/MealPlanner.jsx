import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { DayColumn } from "@/components/MealPlanner/DayColumn"
import { RecipeModal } from "@/components/MealPlanner/RecipeModal"
import { RecipeDetailDialog } from "@/components/RecipeDetailDialog"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { ShoppingCart, Calendar, Sparkles, Loader2 } from "lucide-react"
import { generateShoppingListFromMealPlan } from "@/utils/generateShoppingListFromMealPlan"
import { showToast } from "@/components/ui/Toast"
import { 
  getMealPlans, 
  createMealPlan, 
  updateMealPlan,
  generateShoppingListFromMealPlan as generateShoppingListAPI,
  getSuggestedRecipes
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
  const autoSuggested = new Set()
  
  if (!mealPlanData || !mealPlanData.meals) {
    return { mealPlan: frontendPlan, autoSuggested }
  }
  
  mealPlanData.meals.forEach(meal => {
    const mealDate = new Date(meal.date)
    const dayIndex = Math.floor((mealDate - startDate) / (1000 * 60 * 60 * 24))
    
    if (dayIndex >= 0 && dayIndex < 7) {
      const day = days[dayIndex]
      const mealType = meal.mealType
      
      if (day && mealType && meal.recipeId) {
        const isAutoSuggested = meal.isAutoSuggested || false
        frontendPlan[day] = {
          ...frontendPlan[day],
          [mealType]: {
            id: meal.recipeId._id || meal.recipeId,
            name: meal.recipeId.name || 'Unknown',
            calories: meal.recipeId.calories || 0,
            image: meal.recipeId.image || null,
            servings: meal.servings || 4,
            isAutoSuggested: isAutoSuggested
          }
        }
        
        // Track auto-suggested slots
        if (isAutoSuggested) {
          autoSuggested.add(`${day}-${mealType}`)
        }
      }
    }
  })
  
  return { mealPlan: frontendPlan, autoSuggested }
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
          status: 'planned',
          isAutoSuggested: meal.isAutoSuggested === true // Explicitly check for true
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

const isValidObjectId = (value) => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value)

function calculateMatchPercentage(recipe) {
  if (typeof recipe.matchPercentage === "number") {
    return recipe.matchPercentage
  }

  const availableCount = recipe.availableIngredients?.length || 0
  const missingCount = recipe.missingIngredients?.length || 0
  const total = availableCount + missingCount
  if (total === 0) return 0
  return Math.round((availableCount / total) * 100)
}

function normalizeRecipe(recipe) {
  const id = recipe.recipeId || recipe._id || recipe.id
  const availableIngredients = recipe.availableIngredients || []
  const missingIngredients = recipe.missingIngredients || []

  return {
    id,
    name: recipe.name || recipe.recipeName || "Không tên",
    description: recipe.description || "",
    image: recipe.image || "",
    servings: recipe.servings || 0,
    prepTime: recipe.prepTime || 0,
    cookTime: recipe.cookTime || 0,
    difficulty: recipe.difficulty || "medium",
    category: recipe.category || "Khác",
    calories: recipe.calories,
    matchPercentage: calculateMatchPercentage({
      ...recipe,
      availableIngredients,
      missingIngredients
    }),
    availableIngredients,
    missingIngredients,
    instructions: recipe.instructions || []
  }
}

// Helper: Get sorted recipes by match percentage
function getSortedRecipes(recipes) {
  return [...recipes].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1
    if (!a.isFavorite && b.isFavorite) return 1
    return (b.matchPercentage || 0) - (a.matchPercentage || 0)
  })
}

// Smart suggest meals for a specific day
function smartSuggestMealsForDay(day, currentMealPlan, sortedRecipes) {
  const dayMeals = currentMealPlan[day] || {}
  const dayUsedIds = new Set()

  // Collect already used recipe IDs for this day
  Object.values(dayMeals).forEach(meal => {
    if (meal && meal.id) {
      dayUsedIds.add(meal.id)
    }
  })

  const updatedDayMeals = { ...dayMeals }
  let suggestedCount = 0

  // Fill each meal type if empty
  Object.keys(dayMeals).forEach(mealType => {
    if (!dayMeals[mealType]) {
      // Find best recipe that hasn't been used in this day
      const bestRecipe = sortedRecipes.find(recipe => 
        recipe.id && !dayUsedIds.has(recipe.id)
      )

      if (bestRecipe) {
        updatedDayMeals[mealType] = {
          id: bestRecipe.id,
          name: bestRecipe.name,
          calories: bestRecipe.calories || Math.floor(Math.random() * 200) + 300,
          image: bestRecipe.image,
          isAutoSuggested: true // Mark as auto-suggested
        }
        dayUsedIds.add(bestRecipe.id)
        suggestedCount++
      }
    }
  })

  return { updatedDayMeals, suggestedCount }
}

// Smart suggest meals based on fridge ingredients (for all days)
function smartSuggestMeals(currentMealPlan, sortedRecipes) {
  const newMealPlan = { ...currentMealPlan }
  let suggestedCount = 0

  // Fill empty slots for all days
  days.forEach(day => {
    const { updatedDayMeals, suggestedCount: dayCount } = smartSuggestMealsForDay(day, currentMealPlan, sortedRecipes)
    newMealPlan[day] = updatedDayMeals
    suggestedCount += dayCount
  })

  return { newMealPlan, suggestedCount }
}

export function MealPlanner() {
  const navigate = useNavigate()
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
  const [suggestedRecipes, setSuggestedRecipes] = useState([])
  const [isSmartSuggesting, setIsSmartSuggesting] = useState(false)
  const [showSmartSuggestConfirm, setShowSmartSuggestConfirm] = useState(false)

  const { startDate, endDate } = getCurrentWeekDates()

  // Fetch meal plan from API
  useEffect(() => {
    const fetchMealPlan = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Always fetch from backend - backend is source of truth
        console.log('🔄 Fetching meal plans from API (backend is source of truth)...')
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
            console.log('✅ Found meal plan for current week:', currentWeekPlan._id)
            setCurrentMealPlanId(currentWeekPlan._id)
            const { mealPlan: transformedPlan, autoSuggested } = transformMealPlanFromAPI(currentWeekPlan, startDate)
            setMealPlan(transformedPlan)
            setAutoSuggestedSlots(autoSuggested)
            console.log('✅ Loaded meal plan from database (backend source of truth)')
          } else {
            console.log('ℹ️ No meal plan found for current week, using empty plan')
            setMealPlan(getInitialMealPlan())
            setAutoSuggestedSlots(new Set())
            setCurrentMealPlanId(null)
          }
        } else {
          throw new Error(response.message || 'API trả về lỗi')
        }
      } catch (err) {
        console.error('❌ Error fetching meal plan from backend:', err)
        setError(err.message || 'Không thể kết nối đến server')
        // Do NOT use localStorage fallback - backend is source of truth
        // Initialize with empty plan if backend fails
        setMealPlan(getInitialMealPlan())
        setAutoSuggestedSlots(new Set())
        setCurrentMealPlanId(null)
      } finally {
        setLoading(false)
      }
    }

    const fetchSuggestedRecipes = async () => {
      try {
        const response = await getSuggestedRecipes()
        const recipes = response.data?.recipes || []
        const normalized = recipes.map(normalizeRecipe)
        const validRecipes = normalized.filter(recipe => isValidObjectId(recipe.id))
        setSuggestedRecipes(validRecipes)
      } catch (err) {
        console.warn('Could not fetch suggested recipes:', err)
        setSuggestedRecipes([])
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
    fetchSuggestedRecipes()
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
  // Accept optional mealPlanToSave and mealPlanIdToUse parameters to avoid stale closure issues
  const saveMealPlanToDatabase = async (mealPlanToSave = null, mealPlanIdToUse = null) => {
    try {
      setSaving(true)
      
      // Use provided meal plan or current state
      const planToSave = mealPlanToSave || mealPlan
      const meals = transformMealPlanToAPI(planToSave, startDate)
      const mealPlanData = {
        name: `Kế hoạch bữa ăn tuần ${startDate.toLocaleDateString('vi-VN')}`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        meals: meals
      }
      
      // Get current meal plan ID - use state getter to avoid stale closure
      // Accept optional mealPlanIdToUse parameter to avoid stale closure issues
      const mealPlanId = mealPlanIdToUse !== null ? mealPlanIdToUse : currentMealPlanId
      
      if (mealPlanId) {
        // Update existing meal plan
        console.log('🔄 Updating meal plan:', mealPlanId)
        const response = await updateMealPlan(mealPlanId, mealPlanData)
        if (response.success) {
          console.log('✅ Meal plan updated in database')
        } else {
          throw new Error(response.message || 'Failed to update meal plan')
        }
      } else {
        // Create new meal plan
        console.log('🆕 Creating new meal plan')
        const response = await createMealPlan(mealPlanData)
        if (response.success && response.data?.mealPlan?._id) {
          const newId = response.data.mealPlan._id
          setCurrentMealPlanId(newId)
          console.log('✅ Meal plan created in database with ID:', newId)
        } else {
          console.error('❌ Failed to create meal plan:', response)
          throw new Error(response.message || 'Failed to create meal plan')
        }
      }
    } catch (err) {
      console.error('❌ Error saving meal plan to database:', err)
      // Log more details for debugging
      if (err.response) {
        console.error('Response error:', err.response)
      }
      if (err.data) {
        console.error('Error data:', err.data)
      }
      throw err // Re-throw to allow caller to handle
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
            calories: recipe.calories || Math.floor(Math.random() * 200) + 300,
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
    const fullRecipe = suggestedRecipes.find(r => r.id === mealRecipe.id)
    if (!fullRecipe) {
      showToast("Không tìm thấy công thức phù hợp để hiển thị chi tiết.", "warning")
      return
    }

    setSelectedRecipe(fullRecipe)
    setIsDetailOpen(true)
  }

  const handleSmartSuggest = () => {
    setShowSmartSuggestConfirm(true)
  }

  const confirmSmartSuggest = () => {
    setShowSmartSuggestConfirm(false)
    setIsSmartSuggesting(true)

    // Simulate processing (for better UX)
    setTimeout(async () => {
      const sortedRecipes = getSortedRecipes(suggestedRecipes)
      if (sortedRecipes.length === 0) {
        showToast("Chưa có công thức hợp lệ để đề xuất. Vui lòng kiểm tra dữ liệu công thức.", "warning")
        setIsSmartSuggesting(false)
        return
      }

      const { newMealPlan, suggestedCount } = smartSuggestMeals(mealPlan, sortedRecipes)

      if (suggestedCount === 0) {
        showToast("Tất cả các bữa ăn đã được lên kế hoạch!", "info")
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

      // Save meal plan to database IMMEDIATELY (bypass debounce) to persist suggestions
      try {
        // Use currentMealPlanId from state, but pass it explicitly to avoid stale closure
        await saveMealPlanToDatabase(newMealPlan, currentMealPlanId)
        console.log('✅ Smart Suggest: Meal plan saved immediately to database')
      } catch (err) {
        console.error('❌ Error saving meal plan after Smart Suggest:', err)
        console.error('Error details:', err.message, err)
        showToast(`Đã đề xuất món ăn nhưng không thể lưu vào database: ${err.message || 'Lỗi không xác định'}. Vui lòng thử lại.`, "error")
        return
      }

      // Show feedback
      showToast(`Đã đề xuất ${suggestedCount} bữa ăn dựa trên thực phẩm trong tủ lạnh`, "success")

      // Remove glow effect after 3 seconds
      setTimeout(() => {
        setAutoSuggestedSlots(new Set())
      }, 3000)
    }, 500) // Small delay for UX
  }

  const handleSuggestForDay = async (day) => {
    const sortedRecipes = getSortedRecipes(suggestedRecipes)
    if (sortedRecipes.length === 0) {
      showToast("Chưa có công thức hợp lệ để đề xuất. Vui lòng kiểm tra dữ liệu công thức.", "warning")
      return
    }

    const { updatedDayMeals, suggestedCount } = smartSuggestMealsForDay(day, mealPlan, sortedRecipes)

    if (suggestedCount === 0) {
      showToast(`Tất cả các bữa ăn cho ${dayNames[day]} đã được lên kế hoạch!`, "info")
      return
    }

    // Track auto-suggested slots for this day
    const newAutoSuggested = new Set(autoSuggestedSlots)
    Object.keys(updatedDayMeals).forEach(mealType => {
      const meal = updatedDayMeals[mealType]
      if (meal && meal.isAutoSuggested) {
        newAutoSuggested.add(`${day}-${mealType}`)
      }
    })

    const updatedMealPlan = {
      ...mealPlan,
      [day]: updatedDayMeals
    }

    setAutoSuggestedSlots(newAutoSuggested)
    setMealPlan(updatedMealPlan)

    // Save meal plan to database IMMEDIATELY (bypass debounce) to persist suggestions
    try {
      // Pass both meal plan and ID explicitly to avoid stale closure
      await saveMealPlanToDatabase(updatedMealPlan, currentMealPlanId)
      console.log('✅ Day Suggest: Meal plan saved immediately to database')
    } catch (err) {
      console.error('❌ Error saving meal plan after Day Suggest:', err)
      console.error('Error details:', err.message, err)
      showToast(`Đã đề xuất món ăn nhưng không thể lưu vào database: ${err.message || 'Lỗi không xác định'}. Vui lòng thử lại.`, "error")
      return
    }

    // Show feedback
    showToast(`Đã đề xuất ${suggestedCount} bữa ăn cho ${dayNames[day]}`, "success")

    // Remove glow effect after 3 seconds (but keep the isAutoSuggested flag)
    setTimeout(() => {
      setAutoSuggestedSlots(prev => {
        const updated = new Set(prev)
        Object.keys(updatedDayMeals).forEach(mealType => {
          updated.delete(`${day}-${mealType}`)
        })
        return updated
      })
    }, 3000)
  }

  const handleGenerateShoppingList = async () => {
    // Check if meal plan has any meals
    const hasMeals = days.some(day => 
      Object.values(mealPlan[day] || {}).some(meal => meal !== null)
    )

    if (!hasMeals) {
      showToast("Vui lòng thêm ít nhất một món ăn vào kế hoạch", "warning")
      return
    }

    if (!currentMealPlanId) {
      // Save meal plan first if not saved
      await saveMealPlanToDatabase()
      if (!currentMealPlanId) {
        showToast("Vui lòng đợi lưu kế hoạch bữa ăn trước khi tạo danh sách mua sắm", "warning")
        return
      }
    }

    try {
      // Use API to generate shopping list
      const response = await generateShoppingListAPI(currentMealPlanId)
      
      if (response.success) {
        console.log('✅ Shopping list created:', response.data)
        
        // Immediately dispatch event to notify Shopping page to refresh
        window.dispatchEvent(new CustomEvent('shoppingListsUpdated'))
        
        // Navigate to shopping page to show the new list
        // Use setTimeout to allow toast to show first
        setTimeout(() => {
          navigate('/shopping')
        }, 1000)
        
        showToast(
          `${response.message}\n\n` +
          `Đang chuyển đến trang "Danh sách mua sắm"...`,
          "success"
        )
      } else {
        throw new Error(response.message || 'Lỗi khi tạo danh sách mua sắm')
      }
    } catch (error) {
      console.error('Error generating shopping list:', error)
      // Fallback to local function
      const result = generateShoppingListFromMealPlan(mealPlan)
      
      if (!result.success) {
        showToast(result.message || "Có lỗi xảy ra khi tạo danh sách mua sắm", "error")
        return
      }

      if (result.missingIngredientsCount === 0) {
        showToast(result.message, "success")
      } else {
        showToast(
          `${result.message}\n\n` +
          `Danh sách mua sắm đã được tạo với ${result.missingIngredientsCount} nguyên liệu thiếu hụt.\n` +
          `Bạn có thể xem danh sách trong trang "Danh sách mua sắm".`,
          "success"
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
    <div className="space-y-6 p-6 pb-32 relative">
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
          <Button
            onClick={handleGenerateShoppingList}
            disabled={totalMeals === 0}
            className={
              totalMeals === 0
                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                : "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg hover:shadow-xl transition-all font-semibold"
            }
            size="lg"
            title={totalMeals === 0 ? "Vui lòng thêm ít nhất một món ăn vào kế hoạch" : "Tạo danh sách mua sắm từ kế hoạch bữa ăn"}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Tạo danh sách mua sắm
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
            onSuggestDay={handleSuggestForDay}
            fridgeItems={fridgeItems}
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
        recipes={suggestedRecipes}
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

      <ConfirmDialog
        isOpen={showSmartSuggestConfirm}
        onClose={() => setShowSmartSuggestConfirm(false)}
        onConfirm={confirmSmartSuggest}
        title="Đề xuất bữa ăn thông minh"
        message="Tính năng này sẽ tự động đề xuất bữa ăn dựa trên thực phẩm hiện có trong tủ lạnh.
        Các bữa ăn đã được lên kế hoạch sẽ không bị thay đổi. Bạn có muốn tiếp tục?"
        confirmText="Tiếp tục"
        cancelText="Hủy"
        variant="default"
      />
    </div>
  )
}
