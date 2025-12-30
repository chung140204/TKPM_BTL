import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Plus, X, Utensils } from "lucide-react"

export function MealSlot({ mealType, recipe, onAdd, onRemove, isAutoSuggested, onViewRecipe }) {
  const mealLabels = {
    breakfast: "Bữa sáng",
    lunch: "Bữa trưa",
    dinner: "Bữa tối"
  }

  if (recipe) {
    return (
      <Card 
        className={`group hover:shadow-md transition-all cursor-pointer ${
          isAutoSuggested 
            ? "ring-2 ring-primary/50 shadow-lg animate-pulse" 
            : ""
        }`}
        onClick={() => onViewRecipe && onViewRecipe(recipe)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Utensils className="h-4 w-4 text-primary flex-shrink-0" />
                <h4 className="font-semibold text-sm truncate">{recipe.name}</h4>
                {isAutoSuggested && (
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    ✨
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {recipe.calories || "~350"} kcal
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-dashed hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <Button
          variant="ghost"
          onClick={onAdd}
          className="w-full h-auto flex flex-col items-center gap-2 py-4 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs font-medium">Thêm món</span>
        </Button>
      </CardContent>
    </Card>
  )
}

