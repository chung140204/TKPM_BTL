import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Dialog } from "@/components/ui/Dialog"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { showToast } from "@/components/ui/Toast"
import {
  getPendingRecipes,
  approveRecipe,
  getAdminRecipes,
  createAdminRecipe,
  updateAdminRecipe,
  deleteAdminRecipe,
  getFoodItems,
  getUnits
} from "@/utils/api"
import { Plus, Pencil, Trash2, CheckCircle2, Loader2 } from "lucide-react"

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
    { foodItemId: "", unitId: "", quantity: "", notes: "" }
  ],
  instructions: [
    { description: "" }
  ]
})

export function AdminRecipes() {
  const [pendingRecipes, setPendingRecipes] = useState([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [recipes, setRecipes] = useState([])
  const [recipesLoading, setRecipesLoading] = useState(true)

  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [recipeForm, setRecipeForm] = useState(createEmptyRecipeForm())
  const [recipeSubmitting, setRecipeSubmitting] = useState(false)
  const [confirmRecipeDelete, setConfirmRecipeDelete] = useState(null)

  const [foodItems, setFoodItems] = useState([])
  const [units, setUnits] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(false)

  const loadPendingRecipes = async () => {
    try {
      setPendingLoading(true)
      const response = await getPendingRecipes()
      if (response.success) {
        setPendingRecipes(response.data?.recipes || [])
      }
    } catch (error) {
      console.error("Pending recipes error:", error)
      showToast(error.message || "Không thể tải công thức chờ duyệt", "error")
    } finally {
      setPendingLoading(false)
    }
  }

  const loadAdminRecipes = async () => {
    try {
      setRecipesLoading(true)
      const response = await getAdminRecipes()
      if (response.success) {
        setRecipes(response.data?.recipes || [])
      }
    } catch (error) {
      console.error("Admin recipes error:", error)
      showToast(error.message || "Không thể tải công thức công khai", "error")
    } finally {
      setRecipesLoading(false)
    }
  }

  const loadRecipeOptions = async () => {
    if (foodItems.length > 0 && units.length > 0) return
    try {
      setOptionsLoading(true)
      const [foodRes, unitRes] = await Promise.all([
        getFoodItems(),
        getUnits()
      ])
      setFoodItems(foodRes.data?.foodItems || [])
      setUnits(unitRes.data?.units || [])
    } catch (error) {
      console.error("Recipe options error:", error)
      showToast(error.message || "Không thể tải dữ liệu nguyên liệu", "error")
    } finally {
      setOptionsLoading(false)
    }
  }

  useEffect(() => {
    loadPendingRecipes()
    loadAdminRecipes()
  }, [])

  useEffect(() => {
    if (recipeDialogOpen) {
      loadRecipeOptions()
    }
  }, [recipeDialogOpen])

  const openCreateRecipe = () => {
    setEditingRecipe(null)
    setRecipeForm(createEmptyRecipeForm())
    setRecipeDialogOpen(true)
  }

  const openEditRecipe = (recipe) => {
    setEditingRecipe(recipe)
    setRecipeForm({
      name: recipe.name || "",
      description: recipe.description || "",
      category: recipe.category || "Món chính",
      difficulty: recipe.difficulty || "medium",
      servings: recipe.servings || 0,
      prepTime: recipe.prepTime || 0,
      cookTime: recipe.cookTime || 0,
      image: recipe.image || "",
      ingredients: (recipe.ingredients || []).map((ing) => ({
        foodItemId: ing.foodItemId?._id || ing.foodItemId || "",
        unitId: ing.unitId?._id || ing.unitId || "",
        quantity: ing.quantity || "",
        notes: ing.notes || ""
      })),
      instructions: (recipe.instructions || []).map((step) => ({
        description: step.description || ""
      }))
    })
    setRecipeDialogOpen(true)
  }

  const updateRecipeField = (field, value) => {
    setRecipeForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateIngredient = (index, field, value) => {
    setRecipeForm((prev) => {
      const ingredients = [...prev.ingredients]
      ingredients[index] = { ...ingredients[index], [field]: value }
      return { ...prev, ingredients }
    })
  }

  const addIngredient = () => {
    setRecipeForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { foodItemId: "", unitId: "", quantity: "", notes: "" }]
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

  const handleRecipeSubmit = async (event) => {
    event.preventDefault()
    setRecipeSubmitting(true)

    const normalizedIngredients = recipeForm.ingredients
      .filter((ing) => ing.foodItemId && ing.unitId && ing.quantity !== "")
      .map((ing) => ({
        foodItemId: ing.foodItemId,
        unitId: ing.unitId,
        quantity: Number(ing.quantity),
        notes: ing.notes?.trim() || undefined
      }))

    if (!recipeForm.name.trim()) {
      showToast("Vui lòng nhập tên công thức", "warning")
      setRecipeSubmitting(false)
      return
    }

    if (normalizedIngredients.length === 0) {
      showToast("Vui lòng thêm ít nhất một nguyên liệu hợp lệ", "warning")
      setRecipeSubmitting(false)
      return
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

    try {
      if (editingRecipe) {
        await updateAdminRecipe(editingRecipe._id, payload)
        showToast("Cập nhật công thức thành công", "success")
      } else {
        await createAdminRecipe(payload)
        showToast("Tạo công thức thành công", "success")
      }

      setRecipeDialogOpen(false)
      await loadAdminRecipes()
    } catch (error) {
      console.error("Recipe submit error:", error)
      showToast(error.message || "Không thể lưu công thức", "error")
    } finally {
      setRecipeSubmitting(false)
    }
  }

  const handleDeleteRecipe = async () => {
    if (!confirmRecipeDelete) return
    try {
      await deleteAdminRecipe(confirmRecipeDelete._id)
      showToast("Xóa công thức thành công", "success")
      setConfirmRecipeDelete(null)
      await loadAdminRecipes()
    } catch (error) {
      console.error("Delete recipe error:", error)
      showToast(error.message || "Không thể xóa công thức", "error")
    }
  }

  const handleApproveRecipe = async (recipeId) => {
    try {
      await approveRecipe(recipeId)
      showToast("Đã duyệt công thức", "success")
      await loadPendingRecipes()
      await loadAdminRecipes()
    } catch (error) {
      console.error("Approve recipe error:", error)
      showToast(error.message || "Không thể duyệt công thức", "error")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Quản lý thực đơn</h1>
        <p className="text-muted-foreground">Duyệt và quản lý công thức công khai.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Công thức chờ duyệt</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingLoading ? (
            <div className="text-muted-foreground">Đang tải dữ liệu...</div>
          ) : pendingRecipes.length === 0 ? (
            <div className="text-muted-foreground">Không có công thức chờ duyệt.</div>
          ) : (
            <div className="space-y-3">
              {pendingRecipes.map((recipe) => (
                <div key={recipe._id} className="rounded-lg border p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold">{recipe.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Tạo bởi: {recipe.createdBy?.fullName || "Ẩn danh"} ({recipe.createdBy?.email || "N/A"})
                    </div>
                  </div>
                  <Button onClick={() => handleApproveRecipe(recipe._id)} className="gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Duyệt
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Công thức công khai</CardTitle>
          <Button onClick={openCreateRecipe} className="gap-2">
            <Plus className="h-4 w-4" />
            Thêm công thức
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Tên</th>
                  <th className="px-4 py-3 text-left font-medium">Danh mục</th>
                  <th className="px-4 py-3 text-left font-medium">Độ khó</th>
                  <th className="px-4 py-3 text-left font-medium">Khẩu phần</th>
                  <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {recipesLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : recipes.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                      Chưa có công thức công khai.
                    </td>
                  </tr>
                ) : (
                  recipes.map((recipe) => (
                    <tr key={recipe._id} className="border-t">
                      <td className="px-4 py-3 font-medium">{recipe.name}</td>
                      <td className="px-4 py-3">{recipe.category}</td>
                      <td className="px-4 py-3">{recipe.difficulty}</td>
                      <td className="px-4 py-3">{recipe.servings}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditRecipe(recipe)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setConfirmRecipeDelete(recipe)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        isOpen={recipeDialogOpen}
        onClose={() => setRecipeDialogOpen(false)}
        title={editingRecipe ? "Cập nhật công thức" : "Tạo công thức công khai"}
        className="max-w-3xl"
      >
        <form className="space-y-5" onSubmit={handleRecipeSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recipeName">Tên công thức</Label>
              <Input
                id="recipeName"
                value={recipeForm.name}
                onChange={(e) => updateRecipeField("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipeCategory">Danh mục</Label>
              <Input
                id="recipeCategory"
                value={recipeForm.category}
                onChange={(e) => updateRecipeField("category", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipeDifficulty">Độ khó</Label>
              <select
                id="recipeDifficulty"
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
              <Label htmlFor="recipeServings">Khẩu phần</Label>
              <Input
                id="recipeServings"
                type="number"
                min="1"
                value={recipeForm.servings}
                onChange={(e) => updateRecipeField("servings", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipePrep">Thời gian chuẩn bị (phút)</Label>
              <Input
                id="recipePrep"
                type="number"
                min="0"
                value={recipeForm.prepTime}
                onChange={(e) => updateRecipeField("prepTime", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipeCook">Thời gian nấu (phút)</Label>
              <Input
                id="recipeCook"
                type="number"
                min="0"
                value={recipeForm.cookTime}
                onChange={(e) => updateRecipeField("cookTime", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipeImage">Ảnh (URL)</Label>
            <Input
              id="recipeImage"
              value={recipeForm.image}
              onChange={(e) => updateRecipeField("image", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipeDescription">Mô tả</Label>
            <textarea
              id="recipeDescription"
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
                    <select
                      value={ingredient.foodItemId}
                      onChange={(e) => updateIngredient(index, "foodItemId", e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Chọn nguyên liệu</option>
                      {foodItems.map((item) => (
                        <option key={item._id} value={item._id}>{item.name}</option>
                      ))}
                    </select>
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

          <Button type="submit" className="w-full" disabled={recipeSubmitting}>
            {recipeSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : editingRecipe ? "Cập nhật công thức" : "Tạo công thức"}
          </Button>
        </form>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(confirmRecipeDelete)}
        onClose={() => setConfirmRecipeDelete(null)}
        onConfirm={handleDeleteRecipe}
        title="Xóa công thức"
        message={`Bạn có chắc muốn xóa công thức "${confirmRecipeDelete?.name || ""}"?`}
        confirmText="Xóa"
        cancelText="Hủy"
        variant="destructive"
      />
    </div>
  )
}
