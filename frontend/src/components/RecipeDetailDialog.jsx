import { Dialog } from "@/components/ui/Dialog"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Clock, Users, ChefHat, CheckCircle2, XCircle, Utensils } from "lucide-react"
import { cookRecipe } from "@/utils/cookRecipe"

export function RecipeDetailDialog({ isOpen, onClose, recipe, onCook }) {
  if (!recipe) return null

  const handleCookClick = () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      "Điều này sẽ trừ nguyên liệu từ tủ lạnh của bạn (demo).\n\nBạn có muốn tiếp tục?"
    )

    if (!confirmed) {
      return
    }

    // If custom onCook handler provided, use it
    if (onCook) {
      onCook(recipe)
      onClose()
      return
    }

    // Demo mode: simulate cooking
    const result = cookRecipe(recipe)

    if (result.success) {
      // Show success message
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

      // Show warning if missing ingredients
      if (result.missingIngredients && result.missingIngredients.length > 0) {
        message += "\n⚠️ Cảnh báo: Một số nguyên liệu không có trong tủ lạnh. Kết quả có thể không đầy đủ."
      }

      alert(message)
    } else {
      alert(result.message || "Có lỗi xảy ra khi cập nhật nguyên liệu")
    }

    // Close dialog and trigger refresh (if onCook callback provided)
    onClose()
    
    // Trigger page refresh to update recipes list
    // In a real app, this would be handled by state management
    if (result.success && typeof window !== 'undefined') {
      // Dispatch custom event to notify Recipes page to refresh
      window.dispatchEvent(new CustomEvent('fridgeItemsUpdated'))
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
          {recipe.availableIngredients && recipe.availableIngredients.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-green-600 dark:text-green-400">
                Có sẵn trong tủ lạnh:
              </h4>
              <div className="space-y-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                {recipe.availableIngredients.map((ing, idx) => (
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
          {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">
                Cần mua thêm:
              </h4>
              <div className="space-y-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                {recipe.missingIngredients.map((ing, idx) => (
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
          <Button className="flex-1" onClick={handleCookClick}>
            Bắt đầu nấu
          </Button>
        </div>
      </div>
    </Dialog>
  )
}


