import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { CheckCircle2, Circle, Plus, Calendar, Users, Clock, ShoppingCart, Package, Pencil } from "lucide-react"
import { useSearch } from "@/components/Layout/MainLayout"
import { CreateShoppingListDialog } from "@/components/CreateShoppingListDialog"
import { getFoodCategory, categoryOrder, categoryIcons } from "@/utils/foodCategories"
import {
  completeShoppingList,
  createFoodItem,
  createShoppingList,
  getCategories,
  getFoodItems,
  getShoppingLists,
  getUnits,
  updateShoppingListItem,
  updateShoppingList
} from "@/utils/api"

// Format date to DD/MM/YYYY
function formatDate(dateString) {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString // Return original if invalid date
  
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Format relative time (e.g., "just now", "2 minutes ago")
function formatRelativeTime(timestamp) {
  if (!timestamp) return ""
  const now = new Date()
  const updated = new Date(timestamp)
  const diffMs = now - updated
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)

  if (diffSeconds < 10) {
    return "vừa xong"
  } else if (diffSeconds < 60) {
    return `${diffSeconds} giây trước`
  } else if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`
  } else {
    return formatDate(timestamp)
  }
}

function parseQuantityAndUnit(value) {
  const match = String(value || "").match(/^([\d.]+)\s*(.+)?$/)
  const quantity = match ? parseFloat(match[1]) : parseFloat(value)
  return {
    quantity: Number.isFinite(quantity) ? quantity : 1,
    unit: match?.[2]?.trim() || ""
  }
}

function resolveUnit(unitLabel, units) {
  const normalized = (unitLabel || "").toLowerCase()
  const matched = units.find(u =>
    u.abbreviation?.toLowerCase() === normalized ||
    u.name?.toLowerCase() === normalized
  )
  return matched || units.find(u => u.abbreviation === "cái" || u.name === "cái") || units[0]
}

function isObjectId(value) {
  return typeof value === "string" && /^[a-f0-9]{24}$/i.test(value)
}

function normalizeStatus(status) {
  return status === "draft" ? "active" : status
}

function transformShoppingList(list) {
  const items = (list.items || []).map(item => {
    const unitLabel = item.unitId?.abbreviation || item.unitId?.name || ""
    const quantityLabel = unitLabel ? `${item.quantity} ${unitLabel}` : `${item.quantity}`
    const categoryName = item.categoryId?.name || item.foodItemId?.categoryId?.name || getFoodCategory(item.foodItemId?.name || item.name || "")
    return {
      id: item._id,
      name: item.foodItemId?.name || "Unknown",
      quantity: quantityLabel,
      isBought: item.isBought,
      reason: item.reason,
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split("T")[0] : "",
      updatedAt: item.updatedAt,
      category: categoryName
    }
  })

  return {
    id: list._id,
    name: list.name,
    status: normalizeStatus(list.status),
    plannedDate: list.plannedDate,
    familyGroupId: list.familyGroupId,
    createdAt: list.createdAt,
    items
  }
}

export function Shopping() {
  const searchQuery = useSearch() || ""
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [shoppingLists, setShoppingLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingList, setEditingList] = useState(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Listen for shopping lists updates (e.g., when generated from meal plan)
  useEffect(() => {
    const handleShoppingListsUpdate = () => {
      fetchShoppingLists()
    }

    window.addEventListener('shoppingListsUpdated', handleShoppingListsUpdate)
    return () => {
      window.removeEventListener('shoppingListsUpdated', handleShoppingListsUpdate)
    }
  }, [])

  const fetchShoppingLists = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getShoppingLists()
      if (response.success && response.data?.shoppingLists) {
        const transformed = response.data.shoppingLists.map(transformShoppingList)
        setShoppingLists(transformed)
      } else {
        throw new Error(response.message || "Không thể tải danh sách mua sắm")
      }
    } catch (err) {
      console.error("Error fetching shopping lists:", err)
      setError(err.message || "Không thể kết nối đến server")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShoppingLists()
  }, [])

  const buildShoppingListItems = async (listItems) => {
    const [categoriesRes, unitsRes, foodItemsRes] = await Promise.all([
      getCategories(),
      getUnits(),
      getFoodItems('', true)
    ])

    const categories = categoriesRes.data?.categories || []
    const units = unitsRes.data?.units || []
    const foodItems = foodItemsRes.data?.foodItems || []

    if (categories.length === 0 || units.length === 0) {
      throw new Error("Thiếu dữ liệu danh mục hoặc đơn vị")
    }

    const foodItemMap = new Map(
      foodItems.map(item => [item.name.toLowerCase(), item])
    )

    const items = []
    for (const item of listItems) {
      const name = item.name.trim()
      const { quantity, unit } = parseQuantityAndUnit(item.quantity)
      const categoryName = item.category || getFoodCategory(name)
      const category = categories.find(c => c.name === categoryName) || categories[0]
      const shelfLifeValue = Number(item.shelfLifeDays)
      const shelfLifeDays = Number.isFinite(shelfLifeValue) && shelfLifeValue > 0 ? shelfLifeValue : null
      const resolvedUnit = resolveUnit(unit, units)

      if (!resolvedUnit) {
        throw new Error(`Không tìm thấy đơn vị phù hợp cho \"${name}\"`)
      }

      let foodItem = foodItemMap.get(name.toLowerCase())
      if (!foodItem) {
        const createResponse = await createFoodItem({
          name,
          categoryId: category?._id,
          defaultUnit: resolvedUnit._id,
          description: `Auto-created from shopping list: ${name}`,
          averageExpiryDays: shelfLifeDays,
          defaultStorageLocation: item.storageLocation || "Ngăn mát",
          isActive: item.saveToCatalog !== false
        })
        foodItem = createResponse.data?.foodItem
        if (!foodItem) {
          throw new Error(`Không thể tạo thực phẩm \"${name}\"`)
        }
        foodItemMap.set(name.toLowerCase(), foodItem)
      }

      const payloadItem = {
        foodItemId: foodItem._id,
        unitId: resolvedUnit._id,
        quantity: quantity,
        reason: item.reason || "expiring_soon",
        isBought: item.isBought === true,
        categoryId: category?._id || null,
        expiryDate: item.expiryDate || null
      }

      if (isObjectId(item.id)) {
        payloadItem._id = item.id
      }

      items.push(payloadItem)
    }

    return items
  }

  const handleAddList = (newList) => {
    ;(async () => {
      try {
        const items = await buildShoppingListItems(newList.items)

        const response = await createShoppingList({
          name: newList.name,
          plannedDate: newList.plannedDate,
          familyGroupId: newList.familyGroupId || null,
          items
        })

        if (!response.success) {
          throw new Error(response.message || "Không thể tạo danh sách")
        }

        await fetchShoppingLists()
      } catch (err) {
        console.error("Error creating shopping list:", err)
        alert(err.message || "Có lỗi xảy ra khi tạo danh sách")
      }
    })()
  }

  const handleEditList = (list) => {
    setEditingList(list)
    setIsEditDialogOpen(true)
  }

  const handleSaveList = (updatedList) => {
    ;(async () => {
      try {
        const items = await buildShoppingListItems(updatedList.items)

        const response = await updateShoppingList(updatedList.id, {
          name: updatedList.name,
          plannedDate: updatedList.plannedDate,
          items
        })

        if (!response.success) {
          throw new Error(response.message || "Không thể cập nhật danh sách")
        }

        await fetchShoppingLists()
        setIsEditDialogOpen(false)
        setEditingList(null)
      } catch (err) {
        console.error("Error updating shopping list:", err)
        alert(err.message || "Có lỗi xảy ra khi cập nhật danh sách")
      }
    })()
  }

  const handleToggleItem = async (listId, itemId) => {
    // Prevent editing if list is completed
    const list = shoppingLists.find(l => l.id === listId)
    if (list && list.status === "completed") {
      return
    }

    const targetItem = list?.items.find(item => item.id === itemId)
    if (!targetItem) return

    const nextValue = !targetItem.isBought

    try {
      await updateShoppingListItem(listId, itemId, { isBought: nextValue })
      setShoppingLists(prev =>
        prev.map(listItem => {
          if (listItem.id !== listId) return listItem
          return {
            ...listItem,
            items: listItem.items.map(item =>
              item.id === itemId ? { ...item, isBought: nextValue } : item
            )
          }
        })
      )
    } catch (err) {
      console.error("Error updating shopping list item:", err)
      alert(err.message || "Không thể cập nhật item")
    }
  }

  const handleCompleteList = async (listId) => {
    const list = shoppingLists.find(l => l.id === listId)
    if (!list) return

    // Check if there are any bought items
    const boughtItems = list.items.filter(item => item.isBought === true)
    if (boughtItems.length === 0) {
      alert("Vui lòng đánh dấu ít nhất một món hàng đã mua trước khi hoàn thành")
      return
    }

    if (!window.confirm("Bạn có chắc chắn muốn hoàn thành danh sách này?\n\nCác món hàng đã mua sẽ được thêm vào tủ lạnh.")) {
      return
    }

    try {
      const response = await completeShoppingList(listId)

      if (!response.success) {
        throw new Error(response.message || "Có lỗi xảy ra khi hoàn thành danh sách")
      }

      await fetchShoppingLists()

      const createdCount = response.data?.fridgeItemsCreated || 0
      const updatedCount = response.data?.fridgeItemsUpdated || 0

      let message = "Đã hoàn thành danh sách mua sắm và cập nhật tủ lạnh.\n\n"
      message += `Đã thêm mới: ${createdCount} thực phẩm\n`
      message += `Đã cập nhật: ${updatedCount} thực phẩm`

      alert(message)

      window.dispatchEvent(new CustomEvent('fridgeItemsUpdated'))
    } catch (err) {
      console.error("Error completing shopping list:", err)
      alert(err.message || "Có lỗi xảy ra khi hoàn thành danh sách")
    }
  }

  // Filter shopping lists by search query
  const filteredLists = searchQuery
    ? shoppingLists.filter(list =>
        list.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : shoppingLists

  // Sort shopping lists: by status (active > completed > cancelled), then by createdDate descending
  const sortedLists = [...filteredLists].sort((a, b) => {
    // Status priority: active (1) > completed (2) > cancelled (3)
    const statusPriority = {
      active: 1,
      completed: 2,
      cancelled: 3
    }
    const priorityA = statusPriority[a.status] || 99
    const priorityB = statusPriority[b.status] || 99

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    // Within same status, sort by creation date descending (newer first)
    // Use id (timestamp) as proxy for creation date, or plannedDate as fallback
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (a.plannedDate ? new Date(a.plannedDate).getTime() : 0)
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (b.plannedDate ? new Date(b.plannedDate).getTime() : 0)
    return dateB - dateA
  })

  // Group items by category for a shopping list
  const groupItemsByCategory = (items) => {
    const grouped = {}
    
    items.forEach(item => {
      const category = item.category || getFoodCategory(item.name)
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(item)
    })

    // Sort categories by predefined order
    const sortedCategories = categoryOrder.filter(cat => grouped[cat])
    const otherCategories = Object.keys(grouped).filter(cat => !categoryOrder.includes(cat))
    
    return { grouped, sortedCategories: [...sortedCategories, ...otherCategories] }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Danh sách mua sắm</h1>
          <p className="text-muted-foreground">Quản lý các danh sách mua sắm của bạn</p>
        </div>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Tạo danh sách mới
        </Button>
      </div>

      <CreateShoppingListDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onAdd={handleAddList}
      />
      <CreateShoppingListDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setEditingList(null)
        }}
        onSubmit={handleSaveList}
        initialList={editingList}
        submitLabel="Lưu thay đổi"
        title="Chỉnh sửa danh sách mua sắm"
      />

      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Đang tải danh sách mua sắm...
          </CardContent>
        </Card>
      )}
      {error && !loading && (
        <Card>
          <CardContent className="p-12 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      )}
      {!loading && !error && (
        sortedLists.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Package className="h-16 w-16 text-muted-foreground opacity-50" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    {searchQuery
                      ? `Không tìm thấy danh sách nào`
                      : "Chưa có danh sách mua sắm nào"}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? `Không có danh sách nào khớp với từ khóa \"${searchQuery}\"`
                      : "Hãy tạo danh sách mua sắm đầu tiên để bắt đầu quản lý việc đi chợ của bạn"}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => setIsDialogOpen(true)}
                      className="mt-4"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Tạo danh sách mới
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {sortedLists.map((list) => (
            <Card key={list.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">{list.name}</CardTitle>
                      {list.familyGroupId && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            Đã chia sẻ
                          </Badge>
                        )}
                    </div>
                    {/* Show creation date for clarity (especially for duplicate names) */}
                    {list.createdAt && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        <span>Tạo: {formatDate(list.createdAt)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {list.status === "active" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditList(list)}
                        title="Chỉnh sửa danh sách"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Badge 
                      variant={list.status === "completed" ? "success" : "default"}
                      className={list.status === "active" ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                    >
                      {list.status === "completed" ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Hoàn thành
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Đang mua
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  <div className="flex items-center gap-4 mt-1">
                    <span>{list.items.length} món hàng</span>
                    {list.plannedDate && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Dự kiến: {formatDate(list.plannedDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const { grouped, sortedCategories } = groupItemsByCategory(list.items)
                  
                  return (
                    <div className="space-y-4">
                      {sortedCategories.map((category) => {
                        const categoryItems = grouped[category]
                        if (!categoryItems || categoryItems.length === 0) return null
                        
                        return (
                          <div key={category} className="space-y-2">
                            {/* Category Header */}
                            <div className="flex items-center gap-2 pb-1 border-b">
                              <span className="text-lg">{categoryIcons[category] || "📦"}</span>
                              <Badge variant="outline" className="text-xs font-medium">
                                {category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                ({categoryItems.length})
                              </span>
                            </div>
                            
                            {/* Category Items */}
                            <div className="space-y-2 pl-2">
                              {categoryItems.map((item) => (
                                <div
                                  key={item.id}
                                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                                    list.status === "completed" 
                                      ? "cursor-not-allowed opacity-75" 
                                      : "cursor-pointer hover:bg-accent"
                                  }`}
                                  onClick={() => list.status === "active" && handleToggleItem(list.id, item.id)}
                                  title={list.status === "completed" ? "Danh sách đã hoàn thành, không thể chỉnh sửa" : ""}
                                >
                                  {item.isBought ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <Circle className={`h-5 w-5 ${list.status === "completed" ? "text-muted-foreground/50" : "text-muted-foreground"}`} />
                                  )}
                                  <div className="flex-1">
                                    <p
                                      className={`text-sm font-medium ${
                                        item.isBought ? "line-through text-muted-foreground" : ""
                                      }`}
                                    >
                                      {item.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className={`text-xs ${list.status === "completed" ? "text-muted-foreground/70" : "text-muted-foreground"}`}>{item.quantity}</p>
                                      {item.updatedAt && item.updatedBy && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <Clock className="h-3 w-3" />
                                          <span>{formatRelativeTime(item.updatedAt)}</span>
                                          <span>•</span>
                                          {item.updatedByAvatar && (
                                            <img
                                              src={item.updatedByAvatar}
                                              alt={item.updatedBy}
                                              className="h-4 w-4 rounded-full"
                                            />
                                          )}
                                          <span className="text-primary">{item.updatedBy}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
                {list.status === "active" && (
                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={() => handleCompleteList(list.id)}
                  >
                    Hoàn thành danh sách
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          </div>
        )
      )}
    </div>
  )
}

