import { useState } from "react"
import { Dialog } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Plus, X, Calendar, Users } from "lucide-react"
import { mockFamilyGroups } from "@/data/mockFamilyGroups"

const foodItems = [
  "Cà chua", "Thịt heo", "Cá hồi", "Chuối", "Sữa tươi", "Rau cải",
  "Gạo", "Táo", "Hành tây", "Tỏi", "Ớt", "Dầu ăn", "Nước mắm",
  "Đường", "Muối", "Trứng", "Sữa chua", "Bánh mì", "Thịt gà"
]

const units = ["kg", "g", "l", "ml", "hộp", "chai", "nải", "quả", "túi", "gói"]

export function CreateShoppingListDialog({ isOpen, onClose, onAdd }) {
  // Get today's date in YYYY-MM-DD format for default value
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  }

  const [listName, setListName] = useState("")
  const [plannedDate, setPlannedDate] = useState(getTodayDate())
  const [familyGroupId, setFamilyGroupId] = useState("") // Empty = personal
  const [items, setItems] = useState([
    { id: Date.now(), name: "", quantity: "", unit: "kg", isBought: false }
  ])

  const handleAddItem = () => {
    setItems([...items, {
      id: Date.now() + Math.random(),
      name: "",
      quantity: "",
      unit: "kg",
      isBought: false
    }])
  }

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id))
  }

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!listName.trim()) {
      alert("Vui lòng nhập tên danh sách")
      return
    }

    // Filter out empty items
    const validItems = items.filter(item => item.name.trim() && item.quantity.trim())
    
    if (validItems.length === 0) {
      alert("Vui lòng thêm ít nhất một món hàng")
      return
    }

    const newList = {
      id: Date.now().toString(),
      name: listName.trim(),
      status: "active",
      plannedDate: plannedDate || getTodayDate(), // Default to today if not set
      familyGroupId: familyGroupId || null, // null = personal, otherwise family group ID
      items: validItems.map(item => ({
        id: item.id.toString(),
        name: item.name.trim(),
        quantity: `${item.quantity} ${item.unit}`,
        isBought: false
      }))
    }

    onAdd(newList)
    
    // Reset form
    setListName("")
    setPlannedDate(getTodayDate())
    setFamilyGroupId("")
    setItems([{
      id: Date.now(),
      name: "",
      quantity: "",
      unit: "kg",
      isBought: false
    }])
    
    onClose()
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Tạo danh sách mua sắm mới" className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="listName">Tên danh sách *</Label>
          <Input
            id="listName"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="Ví dụ: Đi chợ tuần này"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="plannedDate">Ngày đi chợ</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="plannedDate"
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="pl-10"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="familyGroup">Chia sẻ với</Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              id="familyGroup"
              value={familyGroupId}
              onChange={(e) => setFamilyGroupId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Cá nhân</option>
              {mockFamilyGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Danh sách món hàng *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
            >
              <Plus className="mr-1 h-3 w-3" />
              Thêm món
            </Button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4">
            {items.map((item, index) => (
              <div key={item.id} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <select
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required={index === 0}
                    >
                      <option value="">Chọn thực phẩm...</option>
                      {foodItems.map((food) => (
                        <option key={food} value={food}>
                          {food}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                      placeholder="Số lượng"
                      className="flex-1"
                      required={index === 0}
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(item.id, "unit", e.target.value)}
                      className="flex h-10 w-24 rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {units.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(item.id)}
                    className="mt-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit">
            Tạo danh sách
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

