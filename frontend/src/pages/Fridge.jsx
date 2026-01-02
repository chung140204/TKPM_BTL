import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { mockFridgeItems as initialMockItems } from "@/data/mockData"
import { Clock, Package, Plus, Snowflake, Thermometer, DoorOpen, Home, Info, AlertTriangle, Trash2 } from "lucide-react"
import { useSearch } from "@/components/Layout/MainLayout"
import { AddFoodItemDialog } from "@/components/AddFoodItemDialog"
import { getPreservationTip } from "@/utils/preservationTips"
import { createFridgeItemFromFrontend, getFridgeItems, deleteFridgeItem } from "@/utils/api"
import { Loader2 } from "lucide-react"

// Storage location icons mapping
const storageLocationIcons = {
  "Ngăn đông": Snowflake,
  "Ngăn mát": Thermometer,
  "Cánh cửa tủ": DoorOpen,
  "Nhiệt độ phòng": Home,
}

const statusConfig = {
  available: { label: "Còn hạn", variant: "success", color: "bg-green-500" },
  expiring_soon: { label: "Sắp hết hạn", variant: "warning", color: "bg-orange-500" },
  expired: { label: "Đã hết hạn", variant: "danger", color: "bg-red-500" },
  used_up: { label: "Đã dùng hết", variant: "default", color: "bg-gray-500" },
}

// Sort priority: expiring_soon (1), available (2), expired/used_up (3)
const getStatusPriority = (status) => {
  if (status === 'expiring_soon') return 1
  if (status === 'available') return 2
  return 3 // expired, used_up
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
  const [fridgeItems, setFridgeItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [hoveredItemId, setHoveredItemId] = useState(null)
  const categories = ["all", ...new Set(fridgeItems.map(item => item.category))]

  // Transform API data to frontend format
  const transformFridgeItem = (item) => {
    const expiryDate = new Date(item.expiryDate)
    const { status, daysLeft } = calculateItemStatus(expiryDate)
    
    // Get category name - handle both populated object and ObjectId string
    let categoryName = 'Khác'
    if (item.foodItemId?.categoryId) {
      if (typeof item.foodItemId.categoryId === 'object' && item.foodItemId.categoryId.name) {
        categoryName = item.foodItemId.categoryId.name
      } else if (typeof item.foodItemId.categoryId === 'string') {
        categoryName = item.foodItemId.categoryId
      }
    }
    
    return {
      id: item._id,
      name: item.foodItemId?.name || 'Unknown',
      category: categoryName,
      quantity: item.quantity,
      unit: item.unitId?.abbreviation || item.unitId?.name || 'cái',
      expiryDate: expiryDate.toISOString(),
      storageLocation: item.storageLocation || 'Ngăn mát',
      status: item.status || status,
      daysLeft: daysLeft
    }
  }

  // Fetch fridge items from API
  useEffect(() => {
    const fetchFridgeItems = async () => {
      try {
        setLoading(true)
        setError(null)
        
        console.log('Fetching fridge items from API...')
        const response = await getFridgeItems()
        console.log('Fridge items API response:', response)
        
        if (response.success && response.data?.fridgeItems) {
          // Transform API data to frontend format
          const transformed = response.data.fridgeItems.map(transformFridgeItem)
          setFridgeItems(transformed)
          console.log('✅ Loaded', transformed.length, 'items from database')
        } else {
          throw new Error(response.message || 'API trả về lỗi')
        }
      } catch (err) {
        console.error('Error fetching fridge items:', err)
        setError(err.message || 'Không thể kết nối đến server')
        
        // Fallback to localStorage if API fails
        const localItems = loadFridgeItems()
        if (localItems.length > 0) {
          console.warn('⚠ Using localStorage data as fallback')
          setFridgeItems(localItems)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchFridgeItems()
  }, [])

  // Save to localStorage whenever fridgeItems changes (for offline support)
  useEffect(() => {
    if (fridgeItems.length > 0 && !loading) {
      saveFridgeItems(fridgeItems)
    }
  }, [fridgeItems, loading])

  // Periodically update status based on current date (every minute)
  useEffect(() => {
    if (fridgeItems.length === 0) return

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
          return updatedItems
        }
        return prevItems
      })
    }

    // Update immediately
    updateStatuses()
    
    // Then update every minute
    const interval = setInterval(updateStatuses, 60000)

    return () => clearInterval(interval)
  }, [fridgeItems.length])

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
      
      if (response.success && response.data?.fridgeItem) {
        // Transform the new item from API response
        const transformedItem = transformFridgeItem(response.data.fridgeItem)
        
        // Add to local state
        setFridgeItems(prev => [...prev, transformedItem])
        
        // Dispatch event to notify Dashboard to refresh
        window.dispatchEvent(new CustomEvent('fridgeItemsUpdated'))
        
        console.log('✅ Đã lưu thực phẩm vào database:', newItem.name)
      } else {
        throw new Error(response.message || 'Lỗi khi lưu vào database')
      }
    } catch (error) {
      console.warn('⚠ Không thể lưu vào database:', error)
      // Fallback: Add to local state (will be saved to localStorage)
      const fallbackItem = {
        ...newItem,
        id: Date.now().toString(), // Temporary ID
        status: calculateItemStatus(newItem.expiryDate).status,
        daysLeft: calculateItemStatus(newItem.expiryDate).daysLeft
      }
      setFridgeItems(prev => [...prev, fallbackItem])
      
      // Show warning
      alert(`Đã lưu vào bộ nhớ tạm. Vui lòng kiểm tra kết nối database để đồng bộ dữ liệu.\n\nLỗi: ${error.message}`)
    }
  }

  const handleDeleteItem = async (itemId) => {
    // Confirm deletion
    if (!window.confirm('Bạn có chắc chắn muốn xóa thực phẩm này?')) {
      return
    }

    try {
      // Try to delete from database via API
      const response = await deleteFridgeItem(itemId)
      
      if (response.success) {
        // Remove from local state
        setFridgeItems(prev => prev.filter(item => item.id !== itemId))
        
        // Dispatch event to notify Dashboard to refresh
        window.dispatchEvent(new CustomEvent('fridgeItemsUpdated'))
        
        console.log('✅ Đã xóa thực phẩm khỏi database')
      } else {
        throw new Error(response.message || 'Lỗi khi xóa từ database')
      }
    } catch (error) {
      console.warn('⚠ Không thể xóa từ database:', error)
      
      // Fallback: Remove from local state (will be saved to localStorage)
      setFridgeItems(prev => prev.filter(item => item.id !== itemId))
      
      // Show warning
      alert(`Đã xóa khỏi bộ nhớ tạm. Vui lòng kiểm tra kết nối database để đồng bộ dữ liệu.\n\nLỗi: ${error.message}`)
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

  // Hide items with status "used_up"
  filteredItems = filteredItems.filter(item => item.status !== 'used_up')

  // Sort items: by status priority, then by expiryDate ascending
  filteredItems = [...filteredItems].sort((a, b) => {
    const priorityA = getStatusPriority(a.status)
    const priorityB = getStatusPriority(b.status)
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }
    
    // Same status: sort by expiryDate ascending
    return new Date(a.expiryDate) - new Date(b.expiryDate)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Đang tải dữ liệu từ database...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý tủ lạnh</h1>
          <p className="text-muted-foreground">Theo dõi thực phẩm và hạn sử dụng</p>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-sm text-yellow-600 dark:text-yellow-400">
              ⚠ {error}
            </span>
          )}
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm thực phẩm
          </Button>
        </div>
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

      {/* Batch explanation tooltip */}
      {filteredItems.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
          <Info className="h-3 w-3" />
          <span>Mỗi thẻ đại diện cho một lô thực phẩm (batch) riêng biệt.</span>
        </div>
      )}

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-2">
              <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? `Không tìm thấy thực phẩm nào với từ khóa "${searchQuery}"`
                  : "Tủ lạnh đang trống. Hãy thêm thực phẩm để bắt đầu theo dõi."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const status = statusConfig[item.status] || statusConfig.available
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
                            title="HSD, vị trí lưu trữ, và mẹo bảo quản (nếu có)."
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
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={status.variant}
                        className={item.status === 'expiring_soon' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                      >
                        {item.status === 'expiring_soon' && (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        )}
                        {status.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Xóa thực phẩm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
                      <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-2">
                        <p className="text-xs text-orange-800 dark:text-orange-200 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
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

