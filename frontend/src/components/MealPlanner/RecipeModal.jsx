import { useState } from "react"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Search, Utensils } from "lucide-react"
import { mockRecipes } from "@/data/mockData"

export function RecipeModal({ isOpen, onClose, onSelect }) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredRecipes = searchQuery
    ? mockRecipes.filter(recipe =>
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mockRecipes

  const handleSelect = (recipe) => {
    onSelect(recipe)
    setSearchQuery("")
    onClose()
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        setSearchQuery("")
        onClose()
      }}
      title="Chọn món ăn"
      className="max-w-2xl max-h-[80vh]"
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Tìm kiếm món ăn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Recipe List */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Không tìm thấy món ăn nào</p>
            </div>
          ) : (
            filteredRecipes.map((recipe) => (
              <Card
                key={recipe.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleSelect(recipe)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {recipe.image && (
                      <img
                        src={recipe.image}
                        alt={recipe.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{recipe.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {recipe.calories || "~350"} kcal
                        </p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">{recipe.category}</p>
                      </div>
                    </div>
                    <Utensils className="h-4 w-4 text-primary flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Dialog>
  )
}

