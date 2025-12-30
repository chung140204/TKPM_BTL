import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { CheckCircle2, Circle, Plus, Calendar, Users, Clock } from "lucide-react"
import { useSearch } from "@/components/Layout/MainLayout"
import { CreateShoppingListDialog } from "@/components/CreateShoppingListDialog"
import { getFoodCategory, categoryOrder, categoryIcons } from "@/utils/foodCategories"
import { getFamilyGroupById } from "@/data/mockFamilyGroups"
import { getRandomMember } from "@/data/mockFamilyMembers"
import { completeShoppingList } from "@/utils/completeShoppingList"

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

// Get today's date for default plannedDate
const getTodayDate = () => {
  const today = new Date()
  return today.toISOString().split("T")[0]
}

const initialMockShoppingLists = [
  {
    id: "1",
    name: "Danh sách đi chợ tuần này",
    status: "active",
    plannedDate: getTodayDate(),
    items: [
      { id: "1", name: "Cà chua", quantity: "2 kg", isBought: false },
      { id: "2", name: "Thịt heo", quantity: "1 kg", isBought: true },
      { id: "3", name: "Rau cải", quantity: "0.5 kg", isBought: false },
    ],
  },
  {
    id: "2",
    name: "Danh sách đi chợ tháng 12",
    status: "completed",
    plannedDate: getTodayDate(),
    items: [
      { id: "4", name: "Gạo", quantity: "5 kg", isBought: true },
      { id: "5", name: "Dầu ăn", quantity: "1 chai", isBought: true },
    ],
  },
]

const STORAGE_KEY = "shopping_lists"

// Load shopping lists from localStorage or use initial mock data
function loadShoppingLists() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const lists = JSON.parse(saved)
      // Add default plannedDate for backward compatibility
      return lists.map(list => ({
        ...list,
        plannedDate: list.plannedDate || getTodayDate()
      }))
    }
  } catch (error) {
    console.error("Error loading shopping lists:", error)
  }
  return initialMockShoppingLists
}

// Save shopping lists to localStorage
function saveShoppingLists(lists) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
  } catch (error) {
    console.error("Error saving shopping lists:", error)
  }
}

export function Shopping() {
  const searchQuery = useSearch() || ""
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [shoppingLists, setShoppingLists] = useState(() => loadShoppingLists())

  // Save to localStorage whenever shoppingLists changes
  useEffect(() => {
    saveShoppingLists(shoppingLists)
  }, [shoppingLists])

  // Listen for shopping lists updates (e.g., when generated from meal plan)
  useEffect(() => {
    const handleShoppingListsUpdate = () => {
      // Reload shopping lists when new list is created (e.g., from meal plan)
      setShoppingLists(loadShoppingLists())
    }

    window.addEventListener('shoppingListsUpdated', handleShoppingListsUpdate)
    return () => {
      window.removeEventListener('shoppingListsUpdated', handleShoppingListsUpdate)
    }
  }, [])

  const handleAddList = (newList) => {
    setShoppingLists([...shoppingLists, newList])
  }

  const handleToggleItem = (listId, itemId) => {
    // Get random member for demo (simulate real-time update)
    const randomMember = getRandomMember()
    const now = new Date().toISOString()

    setShoppingLists(shoppingLists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: list.items.map(item =>
            item.id === itemId
              ? { 
                  ...item, 
                  isBought: !item.isBought,
                  updatedAt: now, // Timestamp
                  updatedBy: randomMember.name, // Demo: random member name
                  updatedByAvatar: randomMember.avatar // Demo: random member avatar
                }
              : item
          )
        }
      }
      return list
    }))
  }

  const handleCompleteList = (listId) => {
    const list = shoppingLists.find(l => l.id === listId)
    if (!list) return

    // Check if there are any bought items
    const boughtItems = list.items.filter(item => item.isBought === true)
    if (boughtItems.length === 0) {
      alert("Vui lòng đánh dấu ít nhất một món hàng đã mua trước khi hoàn thành")
      return
    }

    if (window.confirm("Bạn có chắc chắn muốn hoàn thành danh sách này?\n\nCác món hàng đã mua sẽ được thêm vào tủ lạnh.")) {
      // Simulate completing shopping list: add items to fridge
      const result = completeShoppingList(list)

      if (result.success) {
        // Update shopping list status
        setShoppingLists(shoppingLists.map(l =>
          l.id === listId
            ? { ...l, status: "completed" }
            : l
        ))

        // Show success message with details
        let message = "Đã hoàn thành danh sách mua sắm và cập nhật tủ lạnh (demo).\n\n"
        
        if (result.addedItems && result.addedItems.length > 0) {
          message += `Đã thêm ${result.addedItems.length} thực phẩm mới:\n`
          result.addedItems.forEach(item => {
            message += `- ${item.name}: ${item.quantity} ${item.unit}\n`
          })
        }
        
        if (result.updatedItems && result.updatedItems.length > 0) {
          message += `\nĐã cập nhật ${result.updatedItems.length} thực phẩm:\n`
          result.updatedItems.forEach(item => {
            message += `- ${item.name}: +${item.quantity} ${item.unit}\n`
          })
        }

        alert(message)

        // Trigger fridge update event to refresh Fridge page if open
        window.dispatchEvent(new CustomEvent('fridgeItemsUpdated'))
      } else {
        alert(result.message || "Có lỗi xảy ra khi cập nhật tủ lạnh")
      }
    }
  }

  // Filter shopping lists by search query
  const filteredLists = searchQuery
    ? shoppingLists.filter(list =>
        list.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : shoppingLists

  // Group items by category for a shopping list
  const groupItemsByCategory = (items) => {
    const grouped = {}
    
    items.forEach(item => {
      const category = getFoodCategory(item.name)
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
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo danh sách mới
        </Button>
      </div>

      <CreateShoppingListDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onAdd={handleAddList}
      />

      {filteredLists.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery
                ? `Không tìm thấy danh sách nào với từ khóa "${searchQuery}"`
                : "Chưa có danh sách mua sắm nào"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredLists.map((list) => (
          <Card key={list.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>{list.name}</CardTitle>
                    {list.familyGroupId && (() => {
                      const familyGroup = getFamilyGroupById(list.familyGroupId)
                      return (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {familyGroup ? familyGroup.name : "Đã chia sẻ"}
                        </Badge>
                      )
                    })()}
                  </div>
                </div>
                <Badge variant={list.status === "completed" ? "success" : "default"}>
                  {list.status === "completed" ? "Hoàn thành" : "Đang mua"}
                </Badge>
              </div>
              <CardDescription>
                <div className="flex items-center gap-4 mt-1">
                  <span>{list.items.length} món hàng</span>
                  {list.plannedDate && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {formatDate(list.plannedDate)}
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
                                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors"
                                onClick={() => list.status === "active" && handleToggleItem(list.id, item.id)}
                              >
                                {item.isBought ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground" />
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
                                    <p className="text-xs text-muted-foreground">{item.quantity}</p>
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
      )}
    </div>
  )
}

