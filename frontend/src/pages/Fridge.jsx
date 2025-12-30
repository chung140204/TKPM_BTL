import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { mockFridgeItems as initialMockItems } from "@/data/mockData"
import { Clock, Package, Plus, Snowflake, Thermometer, DoorOpen, Home, Info } from "lucide-react"
import { useSearch } from "@/components/Layout/MainLayout"
import { AddFoodItemDialog } from "@/components/AddFoodItemDialog"
import { getPreservationTip } from "@/utils/preservationTips"
import { createFridgeItemFromFrontend } from "@/utils/api"

// Storage location icons mapping
const storageLocationIcons = {
  "Ngăn đông": Snowflake,
  "Ngăn mát": Thermometer,
  "Cánh cửa tủ": DoorOpen,
  "Nhiệt độ phòng": Home,
}

const statusConfig = {
  available: { label: "Còn hạn", variant: "success", color: "bg-green-500" },
  expiring_soon: { label: "Sắp hết hạn", variant: "warning", color: "bg-yellow-500" },
  expired: { label: "Đã hết hạn", variant: "danger", color: "bg-red-500" },
}

const STORAGE_KEY = "fridge_items"

// Helper function to calculate days left and status
function calculateItemStatus(expiryDateString) {
  const expiryDate = new Date(expiryDateString)
  const today = new Date()
  
  // Reset time to midnight for accurate day comparison
  today.setHours(0, 0, 0, 0)
  expiryDate.setHours(0, 0, 0, 0)
  
  const diffTime = expiryDate - today
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  let status = "available"
  if (daysLeft < 0) {
    status = "expired"
  } else if (daysLeft <= 3) {
    status = "expiring_soon"
  }
  
  return { status, daysLeft }
}

// Load items from localStorage or use initial mock data
function loadFridgeItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Update status based on current date
      return parsed.map(item => {
        const { status, daysLeft } = calculateItemStatus(item.expiryDate)
        return { 
          ...item, 
          status, 
          daysLeft,
          storageLocation: item.storageLocation || "Ngăn mát" // Default for existing items
        }
      })
    }
  } catch (error) {
    console.error("Error loading fridge items:", error)
  }
  // Update initial mock items status before returning
  return initialMockItems.map(item => {
    const { status, daysLeft } = calculateItemStatus(item.expiryDate)
    return { 
      ...item, 
      status, 
      daysLeft,
      storageLocation: item.storageLocation || "Ngăn mát" // Default for mock items
    }
  })
}

// Save items to localStorage
function saveFridgeItems(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (error) {
    console.error("Error saving fridge items:", error)
  }
}

export function Fridge() {
  const searchQuery = useSearch() || ""
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [fridgeItems, setFridgeItems] = useState(() => loadFridgeItems())
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [hoveredItemId, setHoveredItemId] = useState(null)
  const categories = ["all", ...new Set(fridgeItems.map(item => item.category))]

  // Save to localStorage whenever fridgeItems changes
  useEffect(() => {
    saveFridgeItems(fridgeItems)
  }, [fridgeItems])

  // Periodically update status based on current date (every minute)
  useEffect(() => {
    const updateStatuses = () => {
      setFridgeItems(prevItems => {
        const updatedItems = prevItems.map(item => {
          const { status, daysLeft } = calculateItemStatus(item.expiryDate)
          // Only update if status or daysLeft changed
          if (item.status !== status || item.daysLeft !== daysLeft) {
            return { ...item, status, daysLeft }
          }
          return item
        })
        
        // Check if any item was updated
        const hasChanges = updatedItems.some((item, index) => 
          item.status !== prevItems[index].status || 
          item.daysLeft !== prevItems[index].daysLeft
        )
        
        if (hasChanges) {
          saveFridgeItems(updatedItems)
          return updatedItems
        }
        return prevItems
      })
    }

    // Update immediately on mount
    updateStatuses()
    
    // Then update every minute
    const interval = setInterval(updateStatuses, 60000)

    return () => clearInterval(interval)
  }, [])

  const handleAddItem = async (newItem) => {
    // Format quantity as string with unit for API
    const quantityString = `${newItem.quantity} ${newItem.unit}`
    
    try {
      // Try to save to database via API
      const response = await createFridgeItemFromFrontend({
        name: newItem.name,
        category: newItem.category,
        quantity: quantityString,
        expiryDate: newItem.expiryDate,
        storageLocation: newItem.storageLocation,
        price: 0
      })
      
      if (response.success) {
        // Success: Add to local state and localStorage
        const updatedItems = [...fridgeItems, newItem]
        setFridgeItems(updatedItems)
        saveFridgeItems(updatedItems)
        
        // Dispatch event to notify Dashboard to refresh
        window.dispatchEvent(new CustomEvent('fridgeItemsUpdated'))
        
        console.log('✅ Đã lưu thực phẩm vào database:', newItem.name)
      } else {
        throw new Error(response.message || 'Lỗi khi lưu vào database')
      }
    } catch (error) {
      console.warn('⚠ Không thể lưu vào database, lưu vào localStorage:', error)
      // Fallback: Save to localStorage only
      const updatedItems = [...fridgeItems, newItem]
      setFridgeItems(updatedItems)
      saveFridgeItems(updatedItems)
      
      // Show warning (optional)
      alert(`Đã lưu vào bộ nhớ tạm. Vui lòng kiểm tra kết nối database để đồng bộ dữ liệu.\n\nLỗi: ${error.message}`)
    }
  }

  // Filter by category
  let filteredItems = selectedCategory === "all"
    ? fridgeItems
    : fridgeItems.filter(item => item.category === selectedCategory)

  // Filter by search query
  if (searchQuery) {
    filteredItems = filteredItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý tủ lạnh</h1>
          <p className="text-muted-foreground">Theo dõi thực phẩm và hạn sử dụng</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm thực phẩm
        </Button>
      </div>

      <AddFoodItemDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onAdd={handleAddItem}
      />

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category === "all" ? "Tất cả" : category}
          </Button>
        ))}
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery
                ? `Không tìm thấy thực phẩm nào với từ khóa "${searchQuery}"`
                : "Chưa có thực phẩm nào"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const status = statusConfig[item.status]
            return (
              <Card 
                key={item.id} 
                className="hover:shadow-lg transition-shadow relative"
                onMouseEnter={() => setHoveredItemId(item.id)}
                onMouseLeave={() => setHoveredItemId(null)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <div className="relative">
                          <Info 
                            className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" 
                          />
                          {hoveredItemId === item.id && (
                            <div className="absolute left-0 top-6 z-50 w-64 rounded-lg border bg-popover p-3 text-sm shadow-lg animate-in fade-in-0 zoom-in-95">
                              <p className="font-semibold mb-1 text-foreground">💡 Mẹo bảo quản</p>
                              <p className="text-muted-foreground text-xs leading-relaxed">
                                {getPreservationTip(item.category)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{item.category}</p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.quantity} {item.unit}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        HSD: {new Date(item.expiryDate).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    {item.storageLocation && (
                      <div className="flex items-center gap-2 text-sm">
                        {(() => {
                          const StorageIcon = storageLocationIcons[item.storageLocation] || Home
                          return <StorageIcon className="h-4 w-4 text-muted-foreground" />
                        })()}
                        <span className="text-muted-foreground">{item.storageLocation}</span>
                      </div>
                    )}
                    {item.status === "expiring_soon" && (
                      <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-2">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200">
                          Còn {item.daysLeft} ngày nữa sẽ hết hạn
                        </p>
                      </div>
                    )}
                    {item.status === "expired" && (
                      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2">
                        <p className="text-xs text-red-800 dark:text-red-200">
                          Đã hết hạn
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

