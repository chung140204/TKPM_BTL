import { Card, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { MealSlot } from "./MealSlot"
import { Sparkles } from "lucide-react"

const dayNames = {
  monday: "Thứ 2",
  tuesday: "Thứ 3",
  wednesday: "Thứ 4",
  thursday: "Thứ 5",
  friday: "Thứ 6",
  saturday: "Thứ 7",
  sunday: "Chủ nhật"
}

export function DayColumn({ day, meals, onAddMeal, onRemoveMeal, autoSuggestedSlots, onViewRecipe, onSuggestDay, fridgeItems }) {
  // Check if all meals for this day are filled
  const allMealsFilled = meals.breakfast && meals.lunch && meals.dinner
  const hasEmptyMeals = !meals.breakfast || !meals.lunch || !meals.dinner
  const canSuggest = hasEmptyMeals && fridgeItems && fridgeItems.length > 0

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{dayNames[day]}</CardTitle>
            {canSuggest && onSuggestDay && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSuggestDay(day)}
                className="h-7 w-7 p-0"
                title="Đề xuất bữa ăn cho ngày này"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>
      
      <div className="space-y-3">
        <MealSlot
          mealType="breakfast"
          recipe={meals.breakfast}
          onAdd={() => onAddMeal(day, "breakfast")}
          onRemove={() => onRemoveMeal(day, "breakfast")}
          isAutoSuggested={autoSuggestedSlots?.has(`${day}-breakfast`)}
          onViewRecipe={onViewRecipe}
        />
        <MealSlot
          mealType="lunch"
          recipe={meals.lunch}
          onAdd={() => onAddMeal(day, "lunch")}
          onRemove={() => onRemoveMeal(day, "lunch")}
          isAutoSuggested={autoSuggestedSlots?.has(`${day}-lunch`)}
          onViewRecipe={onViewRecipe}
        />
        <MealSlot
          mealType="dinner"
          recipe={meals.dinner}
          onAdd={() => onAddMeal(day, "dinner")}
          onRemove={() => onRemoveMeal(day, "dinner")}
          isAutoSuggested={autoSuggestedSlots?.has(`${day}-dinner`)}
          onViewRecipe={onViewRecipe}
        />
      </div>
    </div>
  )
}

