import { Card, CardHeader, CardTitle } from "@/components/ui/Card"
import { MealSlot } from "./MealSlot"

const dayNames = {
  monday: "Thứ 2",
  tuesday: "Thứ 3",
  wednesday: "Thứ 4",
  thursday: "Thứ 5",
  friday: "Thứ 6",
  saturday: "Thứ 7",
  sunday: "Chủ nhật"
}

export function DayColumn({ day, meals, onAddMeal, onRemoveMeal, autoSuggestedSlots, onViewRecipe }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{dayNames[day]}</CardTitle>
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

