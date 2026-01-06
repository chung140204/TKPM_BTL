import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Heart, ChefHat, Clock, Users, CheckCircle2, XCircle } from "lucide-react"
import { useSearch } from "@/components/Layout/MainLayout"
import { RecipeDetailDialog } from "@/components/RecipeDetailDialog"
import { IngredientFilter } from "@/components/IngredientFilter"
import { getFridgeItems, getSuggestedRecipes } from "@/utils/api"

export function Recipes() {
  const searchQuery = useSearch() || ""
  const [fridgeItems, setFridgeItems] = useState([])
  const [recipes, setRecipes] = useState([])
  const [favorites, setFavorites] = useState([])
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedIngredients, setSelectedIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Listen for fridge items updates (after cooking)
  useEffect(() => {
    const handleFridgeUpdate = () => {
      fetchRecipesAndFridge()
    }

    window.addEventListener('fridgeItemsUpdated', handleFridgeUpdate)
    return () => {
      window.removeEventListener('fridgeItemsUpdated', handleFridgeUpdate)
    }
  }, [])

  const normalizeIngredient = (ingredient, preferMissing) => {
    const name = ingredient?.name || ingredient?.foodItemName || "Unknown"
    const unit = ingredient?.unitName || ingredient?.unit || ""
    let quantity = ingredient?.quantity

    if (preferMissing) {
      quantity = ingredient?.missingQuantity ?? ingredient?.quantityMissing ?? ingredient?.requiredQuantity ?? ingredient?.quantity
    } else {
      quantity = ingredient?.requiredQuantity ?? ingredient?.quantityRequired ?? ingredient?.quantity
    }

    const quantityLabel = quantity !== undefined && quantity !== null && quantity !== ""
      ? (unit ? `${quantity} ${unit}` : `${quantity}`)
      : ""

    return {
      ...ingredient,
      name,
      quantity: quantityLabel
    }
  }

  const normalizeRecipe = (recipe) => ({
    id: recipe.recipeId || recipe._id || recipe.id,
    name: recipe.name || recipe.recipeName || "Không tên",
    description: recipe.description || "",
    image: recipe.image || "",
    servings: recipe.servings || 0,
    prepTime: recipe.prepTime || 0,
    cookTime: recipe.cookTime || 0,
    difficulty: recipe.difficulty || "medium",
    category: recipe.category || "Khác",
    matchPercentage: recipe.matchPercentage || 0,
    availableIngredients: (recipe.availableIngredients || []).map(ing => normalizeIngredient(ing, false)),
    missingIngredients: (recipe.missingIngredients || []).map(ing => normalizeIngredient(ing, true)),
    instructions: recipe.instructions || []
  })

  const fetchRecipesAndFridge = async () => {
    try {
      setLoading(true)
      setError(null)

      const [recipesRes, fridgeRes] = await Promise.all([
        getSuggestedRecipes(),
        getFridgeItems()
      ])

      console.log('Recipes API response:', recipesRes)
      console.log('Fridge API response:', fridgeRes)

      // Check if API calls were successful
      if (!recipesRes.success) {
        throw new Error(recipesRes.message || 'Không thể tải gợi ý món ăn')
      }

      if (!fridgeRes.success) {
        console.warn('Fridge items API failed:', fridgeRes.message)
        // Don't throw, just use empty array
      }

      const fetchedRecipes = recipesRes.data?.recipes || []
      const fetchedFridge = fridgeRes.data?.fridgeItems || []

      console.log('Fetched recipes:', fetchedRecipes)
      console.log('Fetched fridge items:', fetchedFridge)

      setRecipes(fetchedRecipes.map(normalizeRecipe))
      setFridgeItems(fetchedFridge)
    } catch (err) {
      console.error("Error fetching recipes:", err)
      setError(err.message || "Không thể tải gợi ý món ăn")
      // Set empty arrays on error to prevent crashes
      setRecipes([])
      setFridgeItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecipesAndFridge()
  }, [])

  const toggleFavorite = (id) => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const handleViewRecipe = (recipe) => {
    setSelectedRecipe(recipe)
    setIsDetailOpen(true)
  }

  // Get unique ingredient names from fridge items
  const availableIngredientNames = useMemo(() => {
    const names = new Set()
    fridgeItems.forEach(item => {
      const name = item.foodItemId?.name || item.name
      if (name && item.quantity > 0) {
        names.add(name)
      }
    })
    return Array.from(names).sort()
  }, [fridgeItems])

  // Filter recipes by search query
  const filteredRecipes = searchQuery
    ? recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recipes

  // Filter by selected ingredients (if any)
  let recipesWithAvailability = filteredRecipes
  if (selectedIngredients.length > 0) {
    recipesWithAvailability = recipesWithAvailability
      .map(recipe => {
        // Check how many selected ingredients match this recipe
        const recipeIngredientNames = new Set(
          [
            ...(recipe.availableIngredients || []),
            ...(recipe.missingIngredients || []),
          ].map(ing => ing.name.toLowerCase())
        )

        const matchedIngredients = selectedIngredients.filter(selected =>
          recipeIngredientNames.has(selected.toLowerCase())
        )

        const matchCount = matchedIngredients.length
        const allSelectedMatch = matchCount === selectedIngredients.length

        return {
          ...recipe,
          matchedIngredientCount: matchCount,
          allSelectedMatch, // True if recipe contains all selected ingredients
        }
      })
      .filter(recipe => recipe.allSelectedMatch) // Only show recipes that have ALL selected ingredients
      .sort((a, b) => {
        // Sort by matchPercentage descending (all recipes already have all selected ingredients)
        return b.matchPercentage - a.matchPercentage
      })
  }

  const handleSelectIngredient = (ingredient) => {
    setSelectedIngredients(prev => [...prev, ingredient])
  }

  const handleRemoveIngredient = (ingredient) => {
    setSelectedIngredients(prev => prev.filter(ing => ing !== ingredient))
  }

  const handleClearIngredients = () => {
    setSelectedIngredients([])
  }

  return (
    <div className="space-y-8 p-6 pb-12">
      <div>
        <h1 className="text-4xl font-bold mb-2">Gợi ý món ăn thông minh</h1>
        <p className="text-muted-foreground text-lg">
          Các món ăn được gợi ý dựa trên thực phẩm trong tủ lạnh của bạn
        </p>
      </div>

      {/* Highlight Banner */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/20 p-3">
              <ChefHat className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-xl mb-1">Gợi ý thông minh</h3>
              <p className="text-sm text-muted-foreground">
                Hệ thống tự động phân tích thực phẩm trong tủ lạnh và gợi ý món ăn phù hợp
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredient Filter */}
      {availableIngredientNames.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <IngredientFilter
              availableIngredients={availableIngredientNames}
              selectedIngredients={selectedIngredients}
              onSelect={handleSelectIngredient}
              onRemove={handleRemoveIngredient}
              onClear={handleClearIngredients}
            />
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-sm text-red-700">
            {error}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Đang tải gợi ý món ăn...
          </CardContent>
        </Card>
      ) : recipesWithAvailability.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery
                ? `Không tìm thấy món ăn nào với từ khóa "${searchQuery}"`
                : selectedIngredients.length > 0
                ? `Không tìm thấy món ăn nào với các nguyên liệu đã chọn`
                : "Chưa có món ăn nào"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {recipesWithAvailability.map((recipe) => {
            // Determine match percentage color
            const getMatchColor = (percentage) => {
              if (percentage >= 80) return "bg-green-500 text-white"
              if (percentage >= 50) return "bg-yellow-500 text-white"
              return "bg-red-500 text-white"
            }

            // Limit ingredients display
            const MAX_INGREDIENTS_PREVIEW = 3
            const showMoreAvailable = recipe.availableIngredients.length > MAX_INGREDIENTS_PREVIEW
            const showMoreMissing = recipe.missingIngredients.length > MAX_INGREDIENTS_PREVIEW

            return (
              <Card 
                key={recipe.id} 
                className="overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1"
              >
                {/* Image Section */}
                <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10">
                  <img
                    src={recipe.image}
                    alt={recipe.name}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                  
                  {/* Favorite Button */}
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => toggleFavorite(recipe.id)}
                      className="rounded-full bg-background/90 backdrop-blur-sm p-2.5 shadow-lg hover:bg-background transition-all hover:scale-110"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          favorites.includes(recipe.id)
                            ? "fill-red-500 text-red-500"
                            : "text-muted-foreground hover:text-red-500"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Match Percentage Badge */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                    <div className={`rounded-full px-4 py-2 shadow-lg backdrop-blur-sm ${getMatchColor(recipe.matchPercentage)}`}>
                      <span className="text-sm font-bold">{recipe.matchPercentage}%</span>
                      <span className="text-xs ml-1 opacity-90">khớp</span>
                    </div>
                    {recipe.allSelectedMatch && selectedIngredients.length > 0 && (
                      <Badge className="bg-green-500/90 backdrop-blur-sm text-white border-0 shadow-lg">
                        ✓ Đủ nguyên liệu
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Content Section */}
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold leading-tight line-clamp-2 mb-2">
                    {recipe.name}
                  </CardTitle>
                  <CardDescription className="text-sm line-clamp-2">
                    {recipe.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Recipe Meta Info */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pb-3 border-b">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{recipe.prepTime + recipe.cookTime} phút</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">{recipe.servings} người</span>
                    </div>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {recipe.difficulty}
                    </Badge>
                  </div>

                  {/* Ingredients Preview */}
                  <div className="space-y-3">
                    {/* Available Ingredients */}
                    {recipe.availableIngredients.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                            Nguyên liệu có sẵn
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recipe.availableIngredients.slice(0, MAX_INGREDIENTS_PREVIEW).map((ing, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                            >
                              {ing.name}
                            </Badge>
                          ))}
                          {showMoreAvailable && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              +{recipe.availableIngredients.length - MAX_INGREDIENTS_PREVIEW} nữa
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Missing Ingredients */}
                    {recipe.missingIngredients.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                            Còn thiếu
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recipe.missingIngredients.slice(0, MAX_INGREDIENTS_PREVIEW).map((ing, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                            >
                              {ing.name}
                            </Badge>
                          ))}
                          {showMoreMissing && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              +{recipe.missingIngredients.length - MAX_INGREDIENTS_PREVIEW} nữa
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* View Recipe Button */}
                  <Button
                    className="w-full mt-4 font-semibold"
                    variant="default"
                    onClick={() => handleViewRecipe(recipe)}
                  >
                    Xem công thức
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <RecipeDetailDialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        recipe={selectedRecipe}
      />
    </div>
  )
}

