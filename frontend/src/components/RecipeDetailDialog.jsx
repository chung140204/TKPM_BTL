import { useEffect, useState } from "react"
import { Dialog } from "@/components/ui/Dialog"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Clock, Users, ChefHat, CheckCircle2, XCircle, Utensils } from "lucide-react"
import { cookRecipe } from "@/utils/cookRecipe"
import { cookRecipeApi, createShoppingList } from "@/utils/api"

export function RecipeDetailDialog({ isOpen, onClose, recipe, onCook }) {
  if (!recipe) return null

  const [isCooking, setIsCooking] = useState(false)
  const [cookError, setCookError] = useState("")
  const [missingFromCook, setMissingFromCook] = useState(null)
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [createListError, setCreateListError] = useState("")

  const getRecipeId = (value) => value?.recipeId || value?._id || value?.id
  const isValidObjectId = (value) => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value)

  const resolveIngredientName = (ing) => ing?.name || ing?.foodItemName || "Unknown"
  const resolveIngredientQuantity = (ing, preferMissing) => {
    const unit = ing?.unitName || ing?.unit || ""
    let quantity = ing?.quantity
    if (preferMissing) {
      quantity = ing?.missingQuantity ?? ing?.quantityMissing ?? ing?.requiredQuantity ?? ing?.quantity
    } else {
      quantity = ing?.requiredQuantity ?? ing?.quantityRequired ?? ing?.quantity
    }
    if (quantity === undefined || quantity === null || quantity === "") return ""
    if (typeof quantity === "string") return quantity
    return unit ? `${quantity} ${unit}` : `${quantity}`
  }

  const resolveMissingIngredients = () => {
    if (missingFromCook) {
      return missingFromCook.map(ing => ({
        ...ing,
        name: resolveIngredientName(ing),
        quantity: resolveIngredientQuantity(ing, true)
      }))
    }
    return (recipe.missingIngredients || []).map(ing => ({
      ...ing,
      name: resolveIngredientName(ing),
      quantity: resolveIngredientQuantity(ing, true)
    }))
  }

  const resolveAvailableIngredients = () => {
    return (recipe.availableIngredients || []).map(ing => ({
      ...ing,
      name: resolveIngredientName(ing),
      quantity: resolveIngredientQuantity(ing, false)
    }))
  }

  useEffect(() => {
    if (!isOpen) return
    setCookError("")
    setMissingFromCook(null)
    setCreateListError("")
  }, [isOpen, recipe])

  const availableIngredients = resolveAvailableIngredients()
  const missingIngredients = resolveMissingIngredients()
  const canCreateShoppingList = missingIngredients.some(ing => ing.foodItemId && ing.unitId)

  const handleCookClick = async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      "Điều này sẽ trừ nguyên liệu từ tủ lạnh của bạn.\n\nBạn có muốn tiếp tục?"
    )

    if (!confirmed) {
      return
    }

    setCookError("")
    setMissingFromCook(null)

    const recipeId = getRecipeId(recipe)
    const canUseApi = isValidObjectId(recipeId)

    if (!canUseApi) {
      const result = cookRecipe(recipe)

      if (result.success) {
        let message = "Đã cập nhật nguyên liệu sau khi nấu (demo).\n\n"

        if (result.consumedItems && result.consumedItems.length > 0) {
          message += "Nguyên liệu đã sử dụng:\n"
          result.consumedItems.forEach(item => {
            if (item.status === "used_up") {
              message += `- ${item.name}: Đã hết (${item.consumed})\n`
            } else {
              message += `- ${item.name}: Còn lại ${item.remaining}\n`
            }
          })
        }

        if (result.missingIngredients && result.missingIngredients.length > 0) {
          message += "\n⚠️ Cảnh báo: Một số nguyên liệu không có trong tủ lạnh. Kết quả có thể không đầy đủ."
        }

        alert(message)
      } else {
        alert(result.message || "Có lỗi xảy ra khi cập nhật nguyên liệu")
      }

      onClose()

      if (result.success && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("fridgeItemsUpdated"))
      }

      return
    }

    try {
      setIsCooking(true)
      const result = await cookRecipeApi(recipeId)
      alert(result.message || `Đã nấu món "${recipe.name}" thành công`)

      if (onCook) {
        onCook(recipe)
      }

      onClose()

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("fridgeItemsUpdated"))
      }
    } catch (error) {
      if (error?.status === 400 && error?.data?.data?.missingIngredients?.length) {
        setCookError(error.message || "Không đủ nguyên liệu")
        setMissingFromCook(error.data.data.missingIngredients)
        return
      }

      setCookError(error.message || "Có lỗi xảy ra khi nấu món")
    } finally {
      setIsCooking(false)
    }
  }

  const handleCreateShoppingList = async () => {
    const validIngredients = missingIngredients.filter(ing => ing.foodItemId && ing.unitId)

    if (validIngredients.length === 0) {
      setCreateListError("Không thể tạo danh sách mua cho công thức demo này.")
      return
    }

    try {
      setIsCreatingList(true)
      setCreateListError("")

      const items = validIngredients.map(ing => {
        const quantityValue = Number(
          ing.missingQuantity ?? ing.quantityMissing ?? ing.requiredQuantity ?? ing.quantity
        )

        return {
          foodItemId: ing.foodItemId,
          unitId: ing.unitId,
          quantity: Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 1,
          reason: "missing_ingredient",
          isBought: false,
          categoryId: ing.categoryId || null
        }
      })

      const response = await createShoppingList({
        name: `Thiếu nguyên liệu - ${recipe.name}`,
        plannedDate: new Date().toISOString(),
        items
      })

      if (!response?.success) {
        throw new Error(response?.message || "Không thể tạo danh sách mua")
      }

      alert("Đã tạo danh sách mua từ nguyên liệu còn thiếu.")

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("shoppingListsUpdated"))
      }
    } catch (error) {
      setCreateListError(error.message || "Có lỗi xảy ra khi tạo danh sách mua")
    } finally {
      setIsCreatingList(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={recipe.name}
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-6">
        {/* Recipe Image */}
        {recipe.image && (
          <div className="relative h-64 w-full overflow-hidden rounded-lg">
            <img
              src={recipe.image}
              alt={recipe.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Description */}
        {recipe.description && (
          <p className="text-muted-foreground">{recipe.description}</p>
        )}

        {/* Recipe Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Chuẩn bị:</span>
            <span className="text-muted-foreground">{recipe.prepTime} phút</span>
          </div>
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Nấu:</span>
            <span className="text-muted-foreground">{recipe.cookTime} phút</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Khẩu phần:</span>
            <span className="text-muted-foreground">{recipe.servings} người</span>
          </div>
          <Badge variant="outline">{recipe.difficulty}</Badge>
          <Badge variant="default">{recipe.matchPercentage}% khớp</Badge>
        </div>

        {/* Ingredients Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Nguyên liệu
          </h3>

          {/* Available Ingredients */}
          {availableIngredients.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-green-600 dark:text-green-400">
                Có sẵn trong tủ lạnh:
              </h4>
              <div className="space-y-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                {availableIngredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{ing.name}</span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      {ing.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Ingredients */}
          {missingIngredients.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">
                Cần mua thêm:
              </h4>
              <div className="space-y-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                {missingIngredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm">{ing.name}</span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      {ing.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Instructions Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Hướng dẫn nấu</h3>
          <div className="space-y-3">
            {recipe.instructions && recipe.instructions.length > 0 ? (
              recipe.instructions.map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-muted-foreground flex-1 pt-0.5">
                    {step.description || step}
                  </p>
                </div>
              ))
            ) : (
              <div className="space-y-2">
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0">
                    1
                  </div>
                  <p className="text-sm text-muted-foreground flex-1 pt-0.5">
                    Chuẩn bị tất cả nguyên liệu theo danh sách trên
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0">
                    2
                  </div>
                  <p className="text-sm text-muted-foreground flex-1 pt-0.5">
                    Sơ chế và cắt nhỏ các nguyên liệu
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0">
                    3
                  </div>
                  <p className="text-sm text-muted-foreground flex-1 pt-0.5">
                    Nấu theo thứ tự và nêm nếm gia vị vừa ăn
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0">
                    4
                  </div>
                  <p className="text-sm text-muted-foreground flex-1 pt-0.5">
                    Hoàn thành và trình bày món ăn
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Đóng
          </Button>
          <Button className="flex-1" onClick={handleCookClick} disabled={isCooking}>
            {isCooking ? "Đang nấu..." : "Bắt đầu nấu"}
          </Button>
        </div>

        {(cookError || createListError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {cookError || createListError}
          </div>
        )}

        {missingIngredients.length > 0 && canCreateShoppingList && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleCreateShoppingList}
              disabled={isCreatingList}
            >
              {isCreatingList ? "Đang tạo danh sách..." : "Tạo danh sách mua"}
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  )
}


