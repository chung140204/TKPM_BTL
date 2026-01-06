import { useEffect, useMemo, useState } from "react"
import { Dialog } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { showToast } from "@/components/ui/Toast"
import { getCategories, getFoodItems, getUnits } from "@/utils/api"

const storageLocations = [
  { value: "Ngăn đông", label: "Ngăn đông" },
  { value: "Ngăn mát", label: "Ngăn mát" },
  { value: "Cánh cửa tủ", label: "Cánh cửa tủ" },
  { value: "Nhiệt độ phòng", label: "Nhiệt độ phòng" },
]

const getTodayDate = () => new Date().toISOString().split("T")[0]

export function AddFoodItemDialog({ isOpen, onClose, onAdd }) {
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const [foodItems, setFoodItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [useManualExpiry, setUseManualExpiry] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    quantity: "",
    unit: "",
    purchaseDate: getTodayDate(),
    shelfLifeDays: "",
    expiryDate: "",
    storageLocation: "Ngăn mát",
    saveToCatalog: true,
  })

  const selectedFoodItem = useMemo(() => {
    const name = formData.name.trim().toLowerCase()
    if (!name) return null
    return foodItems.find(item => item.name?.toLowerCase() === name) || null
  }, [foodItems, formData.name])

  useEffect(() => {
    if (!isOpen) return

    const loadOptions = async () => {
      try {
        setLoading(true)
        setError(null)
        const [categoriesRes, unitsRes, foodItemsRes] = await Promise.all([
          getCategories(),
          getUnits(),
          getFoodItems()
        ])

        const fetchedCategories = categoriesRes.data?.categories || []
        const fetchedUnits = unitsRes.data?.units || []
        const fetchedFoodItems = foodItemsRes.data?.foodItems || []

        setCategories(fetchedCategories)
        setUnits(fetchedUnits)
        setFoodItems(fetchedFoodItems)

        setFormData(prev => ({
          ...prev,
          category: prev.category || fetchedCategories[0]?.name || "",
          unit: prev.unit || fetchedUnits[0]?.abbreviation || fetchedUnits[0]?.name || ""
        }))
      } catch (err) {
        console.error("Error loading food item options:", err)
        setError(err.message || "Không thể tải dữ liệu danh mục")
      } finally {
        setLoading(false)
      }
    }

    loadOptions()
  }, [isOpen])

  useEffect(() => {
    if (!selectedFoodItem) return

    setFormData(prev => {
      const categoryName = selectedFoodItem.categoryId?.name || prev.category
      const defaultUnitLabel = selectedFoodItem.defaultUnit?.abbreviation || selectedFoodItem.defaultUnit?.name || prev.unit
      return {
        ...prev,
        category: categoryName,
        unit: defaultUnitLabel,
        shelfLifeDays: selectedFoodItem.averageExpiryDays || "",
        storageLocation: selectedFoodItem.defaultStorageLocation || "Ngăn mát",
        saveToCatalog: true
      }
    })
    setUseManualExpiry(false)
  }, [selectedFoodItem])

  useEffect(() => {
    if (useManualExpiry) return

    const shelfLife = Number(formData.shelfLifeDays)
    if (!formData.purchaseDate || !Number.isFinite(shelfLife) || shelfLife <= 0) {
      return
    }

    const expiry = new Date(formData.purchaseDate)
    if (Number.isNaN(expiry.getTime())) return

    expiry.setDate(expiry.getDate() + shelfLife)
    const expiryValue = expiry.toISOString().split("T")[0]

    if (formData.expiryDate !== expiryValue) {
      setFormData(prev => ({ ...prev, expiryDate: expiryValue }))
    }
  }, [formData.purchaseDate, formData.shelfLifeDays, formData.expiryDate, useManualExpiry])

  const handleNameChange = (value) => {
    setFormData(prev => ({ ...prev, name: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!formData.name || !formData.quantity) {
      showToast("Vui lòng điền đầy đủ thông tin", "warning")
      return
    }

    const quantity = parseFloat(formData.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      showToast("Số lượng phải lớn hơn 0", "warning")
      return
    }

    const shelfLifeValue = Number(formData.shelfLifeDays)
    const hasShelfLife = Number.isFinite(shelfLifeValue) && shelfLifeValue > 0

    if (!hasShelfLife && !formData.expiryDate) {
      showToast("Vui lòng nhập số ngày sử dụng hoặc hạn sử dụng", "warning")
      return
    }

    if (useManualExpiry && !formData.expiryDate) {
      showToast("Vui lòng nhập ngày hết hạn", "warning")
      return
    }

    const expiryDate = formData.expiryDate ? new Date(formData.expiryDate) : null
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (expiryDate) {
      expiryDate.setHours(0, 0, 0, 0)
      if (expiryDate < today) {
        showToast("Ngày hết hạn không được là ngày trong quá khứ", "warning")
        return
      }
    }

    const newItem = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      category: formData.category,
      quantity: quantity,
      unit: formData.unit,
      purchaseDate: formData.purchaseDate || getTodayDate(),
      shelfLifeDays: hasShelfLife ? shelfLifeValue : "",
      expiryDate: formData.expiryDate,
      storageLocation: formData.storageLocation || "Ngăn mát",
      saveToCatalog: formData.saveToCatalog,
    }

    onAdd(newItem)

    setFormData({
      name: "",
      category: categories[0]?.name || "",
      quantity: "",
      unit: units[0]?.abbreviation || units[0]?.name || "",
      purchaseDate: getTodayDate(),
      shelfLifeDays: "",
      expiryDate: "",
      storageLocation: "Ngăn mát",
      saveToCatalog: true,
    })
    setUseManualExpiry(false)
    onClose()
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Thêm thực phẩm mới">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Tên thực phẩm *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ví dụ: Cà chua"
            list="food-items-list"
            required
          />
          <datalist id="food-items-list">
            {foodItems.map(item => (
              <option key={item._id} value={item.name} />
            ))}
          </datalist>
          {selectedFoodItem && (
            <p className="text-xs text-muted-foreground">
              Đã có trong danh mục, thông tin được tự điền theo dữ liệu có sẵn.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Danh mục *</Label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
            disabled={!!selectedFoodItem}
          >
            {categories.map((cat) => (
              <option key={cat._id} value={cat.name}>
                {cat.name}
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
                if (value === "" || parseFloat(value) >= 0) {
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
                <option key={u._id} value={u.abbreviation || u.name}>
                  {u.abbreviation || u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchaseDate">Ngày mua</Label>
          <Input
            id="purchaseDate"
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            max={getTodayDate()}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="shelfLifeDays">Số ngày sử dụng</Label>
            <Input
              id="shelfLifeDays"
              type="number"
              min="1"
              value={formData.shelfLifeDays}
              onChange={(e) => setFormData({ ...formData, shelfLifeDays: e.target.value })}
              placeholder="Ví dụ: 7"
              disabled={!!selectedFoodItem && selectedFoodItem.averageExpiryDays}
              required={!selectedFoodItem}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Hạn sử dụng</Label>
            <Input
              id="expiryDate"
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              min={getTodayDate()}
              disabled={!useManualExpiry}
              required={useManualExpiry}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="manualExpiry"
            type="checkbox"
            checked={useManualExpiry}
            onChange={(e) => setUseManualExpiry(e.target.checked)}
          />
          <Label htmlFor="manualExpiry">Nhập hạn sử dụng thủ công</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="storageLocation">Vị trí lưu trữ</Label>
          <select
            id="storageLocation"
            value={formData.storageLocation}
            onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={!!selectedFoodItem}
          >
            {storageLocations.map((location) => (
              <option key={location.value} value={location.value}>
                {location.label}
              </option>
            ))}
          </select>
        </div>

        {!selectedFoodItem && (
          <div className="flex items-center gap-2">
            <input
              id="saveToCatalog"
              type="checkbox"
              checked={formData.saveToCatalog}
              onChange={(e) => setFormData({ ...formData, saveToCatalog: e.target.checked })}
            />
            <Label htmlFor="saveToCatalog">Lưu vào danh mục có sẵn</Label>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" disabled={loading}>
            Thêm thực phẩm
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
