import { useEffect, useState } from "react"
import { Dialog } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Plus, X, Calendar } from "lucide-react"
import { showToast } from "@/components/ui/Toast"
import { getCategories, getFoodItems, getUnits } from "@/utils/api"

const storageLocations = [
  { value: "Ngăn đông", label: "Ngăn đông" },
  { value: "Ngăn mát", label: "Ngăn mát" },
  { value: "Cánh cửa tủ", label: "Cánh cửa tủ" },
  { value: "Nhiệt độ phòng", label: "Nhiệt độ phòng" },
]

export function CreateShoppingListDialog({
  isOpen,
  onClose,
  onAdd,
  onSubmit,
  initialList,
  submitLabel = "Tạo danh sách",
  title = "Tạo danh sách mua sắm mới"
}) {
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  }

  const [listName, setListName] = useState("")
  const [plannedDate, setPlannedDate] = useState(getTodayDate())
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const [foodItems, setFoodItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([
    {
      id: Date.now(),
      name: "",
      quantity: "",
      unit: "",
      category: "",
      storageLocation: "Ngăn mát",
      shelfLifeDays: "",
      expiryDate: "",
      useManualExpiry: false,
      isBought: false,
      reason: "expiring_soon",
      isExisting: false,
      saveToCatalog: true
    }
  ])
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false)
      return
    }

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

        setItems(prev => prev.map(item => ({
          ...item,
          category: item.category || fetchedCategories[0]?.name || "",
          unit: item.unit || fetchedUnits[0]?.abbreviation || fetchedUnits[0]?.name || ""
        })))
      } catch (err) {
        console.error("Error loading shopping list options:", err)
        setError(err.message || "Không thể tải dữ liệu danh mục")
      } finally {
        setLoading(false)
      }
    }

    loadOptions()
  }, [isOpen])

  const parseQuantityAndUnit = (value) => {
    const match = String(value || "").match(/^([\d.]+)\s*(.+)?$/)
    const quantity = match ? match[1] : value
    const unit = match?.[2]?.trim() || ""
    return { quantity: quantity || "", unit }
  }

  const formatPlannedDate = (value) => {
    if (!value) return getTodayDate()
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return getTodayDate()
    return date.toISOString().split("T")[0]
  }

  const computeExpiryDate = (baseDate, shelfLifeDays) => {
    if (!baseDate) return ""
    const days = Number(shelfLifeDays)
    if (!Number.isFinite(days) || days <= 0) return ""
    const date = new Date(baseDate)
    if (Number.isNaN(date.getTime())) return ""
    date.setDate(date.getDate() + days)
    return date.toISOString().split("T")[0]
  }

  useEffect(() => {
    setItems(prevItems => {
      let changed = false
      const nextItems = prevItems.map(item => {
        if (item.useManualExpiry) return item
        const expiryDate = computeExpiryDate(plannedDate || getTodayDate(), item.shelfLifeDays)
        if (expiryDate && expiryDate !== item.expiryDate) {
          changed = true
          return { ...item, expiryDate }
        }
        return item
      })
      return changed ? nextItems : prevItems
    })
  }, [plannedDate])

  useEffect(() => {
    if (!isOpen || isInitialized) return

    const defaultCategory = categories[0]?.name || ""
    const defaultUnit = units[0]?.abbreviation || units[0]?.name || ""

    if (!initialList) {
      setListName("")
      setPlannedDate(getTodayDate())
      setItems([
        {
          id: Date.now(),
          name: "",
          quantity: "",
          unit: defaultUnit,
          category: defaultCategory,
          storageLocation: "Ngăn mát",
          shelfLifeDays: "",
          expiryDate: "",
          useManualExpiry: false,
          isBought: false,
          reason: "expiring_soon",
          isExisting: false,
          saveToCatalog: true
        }
      ])
      setIsInitialized(true)
      return
    }

    const plannedDateValue = formatPlannedDate(initialList.plannedDate)

    setListName(initialList.name || "")
    setPlannedDate(plannedDateValue)

    const nextItems = (initialList.items || []).map(item => {
      const { quantity, unit } = parseQuantityAndUnit(item.quantity)
      const matchedFood = foodItems.find(
        food => food.name?.toLowerCase() === item.name?.toLowerCase()
      )
      const isExisting = item.isExisting ?? Boolean(matchedFood)
      const shelfLifeDays = item.shelfLifeDays || matchedFood?.averageExpiryDays || ""
      const useManualExpiry = item.useManualExpiry ?? Boolean(item.expiryDate)
      const expiryDate = item.expiryDate || computeExpiryDate(plannedDateValue, shelfLifeDays)

      return {
        id: item.id || item._id || Date.now() + Math.random(),
        name: item.name || "",
        quantity: quantity,
        unit: unit || item.unit || matchedFood?.defaultUnit?.abbreviation || matchedFood?.defaultUnit?.name || defaultUnit,
        category: item.category || matchedFood?.categoryId?.name || defaultCategory,
        storageLocation: item.storageLocation || matchedFood?.defaultStorageLocation || "Ngăn mát",
        shelfLifeDays: shelfLifeDays,
        expiryDate: expiryDate,
        useManualExpiry: useManualExpiry,
        isBought: Boolean(item.isBought),
        reason: item.reason || "expiring_soon",
        isExisting: isExisting,
        saveToCatalog: item.saveToCatalog !== false
      }
    })

    setItems(nextItems.length > 0 ? nextItems : [{
      id: Date.now(),
      name: "",
      quantity: "",
      unit: defaultUnit,
      category: defaultCategory,
      storageLocation: "Ngăn mát",
      shelfLifeDays: "",
      expiryDate: "",
      useManualExpiry: false,
      isBought: false,
      reason: "expiring_soon",
      isExisting: false,
      saveToCatalog: true
    }])

    setIsInitialized(true)
  }, [isOpen, isInitialized, initialList, categories, units, foodItems])

  const handleAddItem = () => {
    setItems([...items, {
      id: Date.now() + Math.random(),
      name: "",
      quantity: "",
      unit: units[0]?.abbreviation || units[0]?.name || "",
      category: categories[0]?.name || "",
      storageLocation: "Ngăn mát",
      shelfLifeDays: "",
      expiryDate: "",
      useManualExpiry: false,
      isBought: false,
      reason: "expiring_soon",
      isExisting: false,
      saveToCatalog: true
    }])
  }

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id))
  }

  const applyFoodItemDefaults = (item, foodItem) => {
    if (!foodItem) {
      return {
        ...item,
        isExisting: false
      }
    }

    return {
      ...item,
      name: foodItem.name,
      category: foodItem.categoryId?.name || item.category,
      unit: foodItem.defaultUnit?.abbreviation || foodItem.defaultUnit?.name || item.unit,
      storageLocation: foodItem.defaultStorageLocation || item.storageLocation || "Ngăn mát",
      shelfLifeDays: foodItem.averageExpiryDays || "",
      expiryDate: item.useManualExpiry
        ? item.expiryDate
        : computeExpiryDate(plannedDate || getTodayDate(), foodItem.averageExpiryDays),
      isExisting: true,
      saveToCatalog: true
    }
  }

  const handleItemChange = (id, field, value) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id !== id) return item

      if (field === "name") {
        const matched = foodItems.find(
          food => food.name?.toLowerCase() === value.trim().toLowerCase()
        )
        return applyFoodItemDefaults({ ...item, name: value }, matched)
      }

      if (field === "useManualExpiry") {
        const useManualExpiry = Boolean(value)
        const nextItem = { ...item, useManualExpiry }
        if (!useManualExpiry) {
          const expiryDate = computeExpiryDate(plannedDate || getTodayDate(), item.shelfLifeDays)
          return { ...nextItem, expiryDate: expiryDate || item.expiryDate }
        }
        return nextItem
      }

      if (field === "shelfLifeDays") {
        const nextItem = { ...item, shelfLifeDays: value }
        if (!item.useManualExpiry) {
          const expiryDate = computeExpiryDate(plannedDate || getTodayDate(), value)
          return { ...nextItem, expiryDate: expiryDate || "" }
        }
        return nextItem
      }

      if (field === "expiryDate") {
        return { ...item, expiryDate: value }
      }

      return { ...item, [field]: value }
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!listName.trim()) {
      showToast("Vui lòng nhập tên danh sách", "warning")
      return
    }

    const validItems = items.filter(item => item.name.trim() && item.quantity.trim())

    if (validItems.length === 0) {
      showToast("Vui lòng thêm ít nhất một món hàng", "warning")
      return
    }

    for (const item of validItems) {
      if (item.useManualExpiry) {
        if (!item.expiryDate) {
          showToast(`Vui lòng nhập hạn sử dụng cho "${item.name}"`, "warning")
          return
        }
        continue
      }

      if (!item.isExisting) {
        const shelfLifeValue = Number(item.shelfLifeDays)
        if (!Number.isFinite(shelfLifeValue) || shelfLifeValue <= 0) {
          showToast(`Vui lòng nhập số ngày sử dụng hợp lệ cho "${item.name}"`, "warning")
          return
        }
      }
    }

    const newList = {
      id: initialList?.id || Date.now().toString(),
      name: listName.trim(),
      status: initialList?.status || "active",
      plannedDate: plannedDate || getTodayDate(),
      items: validItems.map(item => ({
        id: item.id.toString(),
        name: item.name.trim(),
        quantity: `${item.quantity} ${item.unit}`.trim(),
        category: item.category,
        storageLocation: item.storageLocation,
        shelfLifeDays: item.shelfLifeDays,
        expiryDate: item.expiryDate,
        useManualExpiry: item.useManualExpiry,
        isBought: item.isBought,
        reason: item.reason || "expiring_soon",
        isExisting: item.isExisting,
        saveToCatalog: item.saveToCatalog
      }))
    }

    const submitHandler = onSubmit || onAdd
    if (submitHandler) {
      submitHandler(newList)
    }

    setListName("")
    setPlannedDate(getTodayDate())
    setItems([
      {
        id: Date.now(),
        name: "",
        quantity: "",
        unit: units[0]?.abbreviation || units[0]?.name || "",
        category: categories[0]?.name || "",
        storageLocation: "Ngăn mát",
        shelfLifeDays: "",
        expiryDate: "",
        useManualExpiry: false,
        isBought: false,
        reason: "expiring_soon",
        isExisting: false,
        saveToCatalog: true
      }
    ])

    onClose()
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}
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

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Danh sách món hàng *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              disabled={loading}
            >
              <Plus className="mr-1 h-3 w-3" />
              Thêm món
            </Button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto border rounded-lg p-4">
            {items.map((item, index) => (
              <div key={item.id} className="space-y-3 border-b pb-4 last:border-b-0 last:pb-0">
                <div className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Input
                        value={item.name}
                        onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                        placeholder="Tên thực phẩm"
                        list="shopping-food-items"
                        required={index === 0}
                      />
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
                          <option key={u._id} value={u.abbreviation || u.name}>
                            {u.abbreviation || u.name}
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Hạn sử dụng</Label>
                    <Input
                      type="date"
                      value={item.expiryDate}
                      onChange={(e) => handleItemChange(item.id, "expiryDate", e.target.value)}
                      min={getTodayDate()}
                      disabled={!item.useManualExpiry}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      id={`manual-expiry-${item.id}`}
                      type="checkbox"
                      checked={item.useManualExpiry}
                      onChange={(e) => handleItemChange(item.id, "useManualExpiry", e.target.checked)}
                    />
                    <Label htmlFor={`manual-expiry-${item.id}`}>Tự nhập HSD</Label>
                  </div>
                </div>

                {!item.isExisting && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Danh mục</Label>
                      <select
                        value={item.category}
                        onChange={(e) => handleItemChange(item.id, "category", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {categories.map((cat) => (
                          <option key={cat._id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Số ngày sử dụng</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.shelfLifeDays}
                        onChange={(e) => handleItemChange(item.id, "shelfLifeDays", e.target.value)}
                        placeholder="Ví dụ: 7"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Vị trí lưu trữ</Label>
                      <select
                        value={item.storageLocation}
                        onChange={(e) => handleItemChange(item.id, "storageLocation", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {storageLocations.map((location) => (
                          <option key={location.value} value={location.value}>
                            {location.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <input
                        id={`saveToCatalog-${item.id}`}
                        type="checkbox"
                        checked={item.saveToCatalog}
                        onChange={(e) => handleItemChange(item.id, "saveToCatalog", e.target.checked)}
                      />
                      <Label htmlFor={`saveToCatalog-${item.id}`}>Lưu vào danh mục có sẵn</Label>
                    </div>
                  </div>
                )}

                {item.isExisting && (
                  <p className="text-xs text-muted-foreground">
                    Đã có trong danh mục, thông tin được tự điền.
                  </p>
                )}
              </div>
            ))}
          </div>
          <datalist id="shopping-food-items">
            {foodItems.map(food => (
              <option key={food._id} value={food.name} />
            ))}
          </datalist>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="submit"
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all text-white"
            disabled={loading}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
