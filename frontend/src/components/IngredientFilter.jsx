import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { X, ChefHat, Check } from "lucide-react"

export function IngredientFilter({ 
  availableIngredients, 
  selectedIngredients, 
  onSelect, 
  onRemove,
  onClear 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleToggle = (ingredient) => {
    if (selectedIngredients.includes(ingredient)) {
      onRemove(ingredient)
    } else {
      onSelect(ingredient)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-base font-semibold">Lọc theo nguyên liệu đang có</label>
          <p className="text-sm text-muted-foreground mt-1">
            Chọn nguyên liệu để tìm món phù hợp
          </p>
        </div>
        {selectedIngredients.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-xs"
          >
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {/* Selected Ingredients Chips */}
      {selectedIngredients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIngredients.map((ingredient) => (
            <div
              key={ingredient}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-sm"
            >
              <ChefHat className="h-3 w-3" />
              <span>{ingredient}</span>
              <button
                onClick={() => onRemove(ingredient)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-between h-11 bg-background hover:bg-accent border-2"
        >
          <span className={selectedIngredients.length > 0 ? "text-foreground font-medium" : "text-muted-foreground"}>
            {selectedIngredients.length > 0
              ? `${selectedIngredients.length} nguyên liệu đã chọn`
              : "Chọn nguyên liệu..."}
          </span>
          <ChefHat className="h-4 w-4 text-primary" />
        </Button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full rounded-lg border-2 border-primary/20 bg-background shadow-xl max-h-64 overflow-y-auto">
            <div className="p-2 space-y-1">
              {availableIngredients.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground text-center">
                  Không có nguyên liệu nào trong tủ lạnh
                </p>
              ) : (
                availableIngredients.map((ingredient) => {
                  const isSelected = selectedIngredients.includes(ingredient)
                  return (
                    <button
                      key={ingredient}
                      onClick={() => handleToggle(ingredient)}
                      className={`w-full flex items-center gap-3 rounded-md px-4 py-2.5 text-sm text-left transition-all ${
                        isSelected 
                          ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                          : "text-foreground hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      {isSelected ? (
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-foreground text-primary flex items-center justify-center">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      <span>{ingredient}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

