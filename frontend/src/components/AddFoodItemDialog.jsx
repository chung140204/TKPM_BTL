import { useState } from "react"
import { Dialog } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"

const categories = ["Rau củ", "Thịt cá", "Trái cây", "Đồ uống", "Khác"]
const units = ["kg", "g", "l", "ml", "hộp", "chai", "nải", "quả"]
const storageLocations = [
  { value: "Ngăn đông", label: "Ngăn đông" },
  { value: "Ngăn mát", label: "Ngăn mát" },
  { value: "Cánh cửa tủ", label: "Cánh cửa tủ" },
  { value: "Nhiệt độ phòng", label: "Nhiệt độ phòng" },
]

export function AddFoodItemDialog({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: "",
    category: "Rau củ",
    quantity: "",
    unit: "kg",
    expiryDate: "",
    storageLocation: "Ngăn mát",
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.quantity || !formData.expiryDate) {
      alert("Vui lòng điền đầy đủ thông tin")
      return
    }

    // Safety check: quantity must be positive
    const quantity = parseFloat(formData.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      alert("Số lượng phải lớn hơn 0")
      return
    }

    // Safety check: expiryDate must not be in the past
    const expiryDate = new Date(formData.expiryDate)
    const today = new Date()
    
    // Reset time to midnight for accurate day comparison
    today.setHours(0, 0, 0, 0)
    expiryDate.setHours(0, 0, 0, 0)
    
    if (expiryDate < today) {
      alert("Ngày hết hạn không được là ngày trong quá khứ")
      return
    }
    
    const diffTime = expiryDate - today
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    let status = "available"
    if (daysLeft < 0) {
      status = "expired"
    } else if (daysLeft <= 3) {
      status = "expiring_soon"
    }

    const newItem = {
      id: Date.now().toString(),
      name: formData.name,
      category: formData.category,
      quantity: quantity, // Use validated quantity
      unit: formData.unit,
      expiryDate: formData.expiryDate,
      storageLocation: formData.storageLocation || "Ngăn mát", // Default to "Ngăn mát"
      status: status,
      daysLeft: daysLeft,
    }

    onAdd(newItem)
    
    // Reset form
    setFormData({
      name: "",
      category: "Rau củ",
      quantity: "",
      unit: "kg",
      expiryDate: "",
      storageLocation: "Ngăn mát",
    })
    
    onClose()
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Thêm thực phẩm mới">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Tên thực phẩm *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ví dụ: Cà chua"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Danh mục *</Label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Số lượng *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.1"
              min="0.1"
              value={formData.quantity}
              onChange={(e) => {
                const value = e.target.value
                // Prevent negative values
                if (value === '' || (parseFloat(value) >= 0)) {
                  setFormData({ ...formData, quantity: value })
                }
              }}
              placeholder="0"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Đơn vị *</Label>
            <select
              id="unit"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiryDate">Ngày hết hạn *</Label>
          <Input
            id="expiryDate"
            type="date"
            value={formData.expiryDate}
            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
            min={new Date().toISOString().split("T")[0]}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="storageLocation">Vị trí lưu trữ</Label>
          <select
            id="storageLocation"
            value={formData.storageLocation}
            onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {storageLocations.map((location) => (
              <option key={location.value} value={location.value}>
                {location.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit">
            Thêm thực phẩm
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

