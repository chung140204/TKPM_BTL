import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { showToast } from "@/components/ui/Toast"
import { RecipeDetailDialog } from "@/components/RecipeDetailDialog"
import {
  createRecipe,
  getFoodItems,
  getMyRecipes,
  getUnits,
  getCategories,
  createFoodItem,
  checkRecipeIngredients,
  submitRecipeForApproval
} from "@/utils/api"
import { Loader2, Plus, Send, Eye } from "lucide-react"

const createEmptyRecipeForm = () => ({
  name: "",
  description: "",
  category: "Món chính",
  difficulty: "medium",
  servings: 2,
  prepTime: 0,
  cookTime: 0,
  image: "",
  ingredients: [
    { foodItemId: "", unitId: "", quantity: "", customIngredientName: "", isCustom: false }
  ],
  instructions: [
    { description: "" }
  ]
})

export function MyRecipesPanel({ searchQuery = "" }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [recipeForm, setRecipeForm] = useState(createEmptyRecipeForm())
  const [submitting, setSubmitting] = useState(false)

  const [foodItems, setFoodItems] = useState([])
  const [units, setUnits] = useState([])
  const [categories, setCategories] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(false)

  const [confirmSubmit, setConfirmSubmit] = useState(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [detailRecipe, setDetailRecipe] = useState(null)
  const [checkingRecipeId, setCheckingRecipeId] = useState(null)

  const loadMyRecipes = async () => {
    try {
      setLoading(true)
      const response = await getMyRecipes()
      if (response.success) {
        setRecipes(response.data?.recipes || [])
      } else {
        setRecipes([])
      }
    } catch (error) {
      console.error("My recipes error:", error)
      showToast(error.message || "Không thể tải món ăn của bạn", "error")
    } finally {
      setLoading(false)
    }
  }

  const loadRecipeOptions = async () => {
    if (foodItems.length > 0 && units.length > 0 && categories.length > 0) return
    try {
      setOptionsLoading(true)
      const [foodRes, unitRes, categoriesRes] = await Promise.all([
        getFoodItems(),
        getUnits(),
        getCategories()
      ])
      setFoodItems(foodRes.data?.foodItems || [])
      setUnits(unitRes.data?.units || [])
      setCategories(categoriesRes.data?.categories || [])
    } catch (error) {
      console.error("Recipe options error:", error)
      showToast(error.message || "Không thể tải dữ liệu nguyên liệu", "error")
    } finally {
      setOptionsLoading(false)
    }
  }

  useEffect(() => {
    loadMyRecipes()
  }, [])

  useEffect(() => {
    if (dialogOpen) {
      loadRecipeOptions()
    }
  }, [dialogOpen])

  const filteredRecipes = useMemo(() => {
    if (!searchQuery) return recipes
    const keyword = searchQuery.toLowerCase()
    return recipes.filter(recipe => (
      recipe.name?.toLowerCase().includes(keyword) ||
      recipe.description?.toLowerCase().includes(keyword) ||
      recipe.category?.toLowerCase().includes(keyword)
    ))
  }, [recipes, searchQuery])

  const openCreateDialog = () => {
    setRecipeForm(createEmptyRecipeForm())
    setDialogOpen(true)
  }

  const updateRecipeField = (field, value) => {
    setRecipeForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateIngredient = (index, field, value) => {
    setRecipeForm((prev) => {
      const ingredients = [...prev.ingredients]
      const updatedIngredient = { ...ingredients[index], [field]: value }
      
      // Nếu chọn "OTHER", set isCustom = true và clear foodItemId
      if (field === 'foodItemId' && value === 'OTHER') {
        updatedIngredient.isCustom = true
        updatedIngredient.foodItemId = ""
      } else if (field === 'foodItemId' && value !== 'OTHER') {
        // Nếu chọn một foodItem khác, clear custom
        updatedIngredient.isCustom = false
        updatedIngredient.customIngredientName = ""
      }
      
      ingredients[index] = updatedIngredient
      return { ...prev, ingredients }
    })
  }

  const addIngredient = () => {
    setRecipeForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { foodItemId: "", unitId: "", quantity: "", customIngredientName: "", isCustom: false }]
    }))
  }

  const removeIngredient = (index) => {
    setRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, idx) => idx !== index)
    }))
  }

  const updateInstruction = (index, value) => {
    setRecipeForm((prev) => {
      const instructions = [...prev.instructions]
      instructions[index] = { ...instructions[index], description: value }
      return { ...prev, instructions }
    })
  }

  const addInstruction = () => {
    setRecipeForm((prev) => ({
      ...prev,
      instructions: [...prev.instructions, { description: "" }]
    }))
  }

  const removeInstruction = (index) => {
    setRecipeForm((prev) => ({
      ...prev,
      instructions: prev.instructions.filter((_, idx) => idx !== index)
    }))
  }

  const handleCreateRecipe = async (event) => {
    event.preventDefault()
    setSubmitting(true)

    // Validate
    if (!recipeForm.name.trim()) {
      showToast("Vui lòng nhập tên công thức", "warning")
      setSubmitting(false)
      return
    }

    // Validate ingredients
    const validIngredients = recipeForm.ingredients.filter((ing) => {
      if (ing.isCustom) {
        return ing.customIngredientName?.trim() && ing.unitId && ing.quantity !== ""
      } else {
        return ing.foodItemId && ing.unitId && ing.quantity !== ""
      }
    })

    if (validIngredients.length === 0) {
      showToast("Vui lòng thêm ít nhất một nguyên liệu hợp lệ", "warning")
      setSubmitting(false)
      return
    }

    // Tạo FoodItem mới cho các custom ingredients
    try {
      const normalizedIngredients = []
      
      for (const ing of validIngredients) {
        let foodItemId = ing.foodItemId
        
        // Nếu là custom ingredient, tạo FoodItem mới
        if (ing.isCustom && ing.customIngredientName?.trim()) {
          // Lấy category đầu tiên hoặc category mặc định
          const defaultCategory = categories[0]?._id || categories[0]?.id
          const selectedUnit = units.find(u => (u._id || u.id) === ing.unitId)
          
          if (!defaultCategory || !selectedUnit) {
            showToast("Vui lòng đảm bảo đã có danh mục và đơn vị trong hệ thống", "warning")
            setSubmitting(false)
            return
          }

          try {
            const foodItemRes = await createFoodItem({
              name: ing.customIngredientName.trim(),
              categoryId: defaultCategory,
              defaultUnit: ing.unitId,
              description: `Nguyên liệu tùy chỉnh từ công thức "${recipeForm.name.trim()}"`
            })
            
            if (foodItemRes.success) {
              foodItemId = foodItemRes.data?.foodItem?._id || foodItemRes.data?.foodItem?.id
            } else {
              throw new Error(foodItemRes.message || "Không thể tạo nguyên liệu mới")
            }
          } catch (error) {
            console.error("Error creating custom food item:", error)
            showToast(`Không thể tạo nguyên liệu "${ing.customIngredientName}": ${error.message || "Lỗi không xác định"}`, "error")
            setSubmitting(false)
            return
          }
        }
        
        normalizedIngredients.push({
          foodItemId: foodItemId,
          unitId: ing.unitId,
          quantity: Number(ing.quantity),
          notes: ing.notes?.trim() || undefined
        })
      }

      const normalizedInstructions = recipeForm.instructions
        .map((step) => step.description?.trim())
        .filter((desc) => desc)
        .map((desc, index) => ({ step: index + 1, description: desc }))

      const payload = {
        name: recipeForm.name.trim(),
        description: recipeForm.description.trim(),
        category: recipeForm.category.trim(),
        difficulty: recipeForm.difficulty,
        servings: Number(recipeForm.servings) || 0,
        prepTime: Number(recipeForm.prepTime) || 0,
        cookTime: Number(recipeForm.cookTime) || 0,
        image: recipeForm.image?.trim() || null,
        ingredients: normalizedIngredients,
        instructions: normalizedInstructions
      }

      const response = await createRecipe(payload)
      if (!response?.success) {
        throw new Error(response?.message || "Không thể tạo công thức")
      }
      showToast("Tạo công thức thành công", "success")
      setDialogOpen(false)
      await loadMyRecipes()
    } catch (error) {
      console.error("Create recipe error:", error)
      showToast(error.message || "Không thể tạo công thức", "error")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitForApproval = async () => {
    if (!confirmSubmit?._id) return
    try {
      setSubmitLoading(true)
      const response = await submitRecipeForApproval(confirmSubmit._id)
      if (!response?.success) {
        throw new Error(response?.message || "Không thể gửi duyệt")
      }
      showToast("Đã gửi món ăn để Admin phê duyệt", "success")
      setConfirmSubmit(null)
      await loadMyRecipes()
    } catch (error) {
      console.error("Submit recipe error:", error)
      showToast(error.message || "Không thể gửi duyệt", "error")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleViewAndCook = async (recipe) => {
    try {
      setCheckingRecipeId(recipe._id)
      const response = await checkRecipeIngredients(recipe._id)
      if (!response?.success) {
        throw new Error(response?.message || "Không thể kiểm tra nguyên liệu")
      }

      const availableIngredients = response.data?.availableIngredients || []
      const missingIngredients = response.data?.missingIngredients || []
      const totalIngredients = availableIngredients.length + missingIngredients.length
      const matchPercentage = totalIngredients > 0
        ? Math.round((availableIngredients.length / totalIngredients) * 100)
        : 0

      setDetailRecipe({
        ...recipe,
        availableIngredients,
        missingIngredients,
        matchPercentage
      })
    } catch (error) {
      console.error("Check ingredients error:", error)
      showToast(error.message || "Không thể kiểm tra nguyên liệu", "error")
    } finally {
      setCheckingRecipeId(null)
    }
  }

  const renderStatus = (recipe) => {
    if (recipe.isApproved) {
      return { label: "Đã duyệt", className: "bg-emerald-100 text-emerald-700 border-emerald-200" }
    }
    if (recipe.visibility === "public") {
      return { label: "Chờ duyệt", className: "bg-amber-100 text-amber-700 border-amber-200" }
    }
    return { label: "Riêng tư", className: "bg-slate-100 text-slate-700 border-slate-200" }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {loading ? "Đang tải món ăn..." : `Bạn đang có ${filteredRecipes.length} món ăn`}
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Tạo món ăn mới
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Đang tải danh sách món ăn...
          </CardContent>
        </Card>
      ) : filteredRecipes.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Chưa có món ăn nào. Hãy tạo món ăn đầu tiên của bạn.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredRecipes.map((recipe) => {
            const status = renderStatus(recipe)
            const ingredientCount = recipe.ingredients?.length || 0
            const instructionCount = recipe.instructions?.length || 0
            const canSubmit = !recipe.isApproved && recipe.visibility !== "public"
            const canCook = recipe.isApproved || recipe.visibility === "private" || !recipe.visibility

            return (
              <Card key={recipe._id} className="flex flex-col">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{recipe.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {recipe.description || "Chưa có mô tả"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>Danh mục: <span className="text-foreground">{recipe.category || "Chưa phân loại"}</span></div>
                    <div>Độ khó: <span className="text-foreground">{recipe.difficulty || "medium"}</span></div>
                    <div>Khẩu phần: <span className="text-foreground">{recipe.servings || 0} người</span></div>
                    <div>Nguyên liệu: <span className="text-foreground">{ingredientCount}</span></div>
                    <div>Bước nấu: <span className="text-foreground">{instructionCount}</span></div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleViewAndCook(recipe)}
                      disabled={!canCook || checkingRecipeId === recipe._id}
                    >
                      {checkingRecipeId === recipe._id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang kiểm tra
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          Xem & Nấu
                        </>
                      )}
                    </Button>
                    {canSubmit ? (
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setConfirmSubmit(recipe)}
                      >
                        <Send className="h-4 w-4" />
                        Đề xuất lên hệ thống
                      </Button>
                    ) : (
                      <Button variant="outline" disabled>
                        {recipe.isApproved ? "Đã ở hệ thống" : "Đang chờ duyệt"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Tạo món ăn mới"
        className="max-w-3xl"
      >
        <form className="space-y-5" onSubmit={handleCreateRecipe}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="myRecipeName">Tên công thức</Label>
              <Input
                id="myRecipeName"
                value={recipeForm.name}
                onChange={(e) => updateRecipeField("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="myRecipeCategory">Danh mục</Label>
              <Input
                id="myRecipeCategory"
                value={recipeForm.category}
                onChange={(e) => updateRecipeField("category", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="myRecipeDifficulty">Độ khó</Label>
              <select
                id="myRecipeDifficulty"
                value={recipeForm.difficulty}
                onChange={(e) => updateRecipeField("difficulty", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="myRecipeServings">Khẩu phần</Label>
              <Input
                id="myRecipeServings"
                type="number"
                min="1"
                value={recipeForm.servings}
                onChange={(e) => updateRecipeField("servings", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="myRecipePrep">Thời gian chuẩn bị (phút)</Label>
              <Input
                id="myRecipePrep"
                type="number"
                min="0"
                value={recipeForm.prepTime}
                onChange={(e) => updateRecipeField("prepTime", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="myRecipeCook">Thời gian nấu (phút)</Label>
              <Input
                id="myRecipeCook"
                type="number"
                min="0"
                value={recipeForm.cookTime}
                onChange={(e) => updateRecipeField("cookTime", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="myRecipeImage">Ảnh (URL)</Label>
            <Input
              id="myRecipeImage"
              value={recipeForm.image}
              onChange={(e) => updateRecipeField("image", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="myRecipeDescription">Mô tả</Label>
            <textarea
              id="myRecipeDescription"
              value={recipeForm.description}
              onChange={(e) => updateRecipeField("description", e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Nguyên liệu</Label>
              <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                Thêm nguyên liệu
              </Button>
            </div>
            {optionsLoading ? (
              <div className="text-sm text-muted-foreground">Đang tải danh sách nguyên liệu...</div>
            ) : (
              recipeForm.ingredients.map((ingredient, index) => (
                <div key={`ingredient-${index}`} className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] items-end">
                  <div className="space-y-2">
                    <Label>Nguyên liệu</Label>
                    {ingredient.isCustom ? (
                      <Input
                        type="text"
                        placeholder="Nhập tên nguyên liệu"
                        value={ingredient.customIngredientName || ""}
                        onChange={(e) => updateIngredient(index, "customIngredientName", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    ) : (
                      <select
                        value={ingredient.foodItemId}
                        onChange={(e) => updateIngredient(index, "foodItemId", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Chọn nguyên liệu</option>
                        {foodItems.map((item) => (
                          <option key={item._id} value={item._id}>{item.name}</option>
                        ))}
                        <option value="OTHER">Khác (Nhập tên)</option>
                      </select>
                    )}
                    {ingredient.isCustom && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateIngredient(index, "foodItemId", "")}
                        className="text-xs text-muted-foreground h-6 px-2"
                      >
                        ← Chọn từ danh sách
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Số lượng</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={ingredient.quantity}
                      onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Đơn vị</Label>
                    <select
                      value={ingredient.unitId}
                      onChange={(e) => updateIngredient(index, "unitId", e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Chọn đơn vị</option>
                      {units.map((unit) => (
                        <option key={unit._id} value={unit._id}>
                          {unit.abbreviation || unit.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeIngredient(index)}
                    disabled={recipeForm.ingredients.length === 1}
                  >
                    Xóa
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Hướng dẫn</Label>
              <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
                Thêm bước
              </Button>
            </div>
            {recipeForm.instructions.map((step, index) => (
              <div key={`step-${index}`} className="flex gap-3 items-start">
                <span className="mt-2 text-sm font-medium text-muted-foreground">#{index + 1}</span>
                <textarea
                  value={step.description}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeInstruction(index)}
                  disabled={recipeForm.instructions.length === 1}
                >
                  Xóa
                </Button>
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : "Tạo món ăn"}
          </Button>
        </form>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(confirmSubmit)}
        onClose={() => setConfirmSubmit(null)}
        onConfirm={handleSubmitForApproval}
        title="Gửi món ăn lên hệ thống"
        message={`Bạn có muốn gửi món "${confirmSubmit?.name || ""}" để Admin phê duyệt?`}
        confirmText="Gửi duyệt"
        cancelText="Hủy"
        loading={submitLoading}
      />

      <RecipeDetailDialog
        isOpen={Boolean(detailRecipe)}
        onClose={() => setDetailRecipe(null)}
        recipe={detailRecipe}
      />
    </div>
  )
}
