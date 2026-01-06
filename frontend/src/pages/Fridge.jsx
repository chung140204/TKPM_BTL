import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { mockFridgeItems as initialMockItems } from "@/data/mockData"
import { Clock, Package, Plus, Snowflake, Thermometer, DoorOpen, Home, Info, AlertTriangle, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { useSearch } from "@/components/Layout/MainLayout"
import { AddFoodItemDialog } from "@/components/AddFoodItemDialog"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { showToast } from "@/components/ui/Toast"
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
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, itemId: null, itemName: "" })
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const categories = ["all", ...new Set(fridgeItems.map(item => item.category))]

  // Transform API data to frontend format
  const transformFridgeItem = (item) => {
    // Ensure expiryDate is valid
    if (!item.expiryDate) {
      console.warn('Item missing expiryDate:', item)
      return null
    }
    
    // Ensure expiryDate is a valid date string or Date object
    const expiryDateString = item.expiryDate instanceof Date 
      ? item.expiryDate.toISOString() 
      : item.expiryDate
    const expiryDate = new Date(item.expiryDate)
    
    // Validate date
    if (isNaN(expiryDate.getTime())) {
      console.warn('Invalid expiryDate:', item.expiryDate)
      return null
    }
    
    const { status, daysLeft } = calculateItemStatus(expiryDateString)
    
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
      expiryDateOnly: expiryDate.toISOString().split('T')[0], // For grouping by same day
      storageLocation: item.storageLocation || 'Ngăn mát',
      status: item.status || status,
      daysLeft: daysLeft,
      // Additional batch info
      purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : null,
      source: item.source || 'manual',
      notes: item.notes || null
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
          const transformed = response.data.fridgeItems
            .map(transformFridgeItem)
            .filter(item => item !== null) // Filter out invalid items
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
        purchaseDate: newItem.purchaseDate,
        shelfLifeDays: newItem.shelfLifeDays,
        saveToCatalog: newItem.saveToCatalog,
        storageLocation: newItem.storageLocation,
        price: 0
      })
      
      if (response.success && response.data?.fridgeItem) {
        // Transform the new item from API response
        const transformedItem = transformFridgeItem(response.data.fridgeItem)
        
        // Add or update local state
        setFridgeItems(prev => {
          const existingIndex = prev.findIndex(item => item.id === transformedItem.id)
          if (existingIndex === -1) {
            return [...prev, transformedItem]
          }
          const next = [...prev]
          next[existingIndex] = transformedItem
          return next
        })
        
        // Dispatch event to notify Dashboard to refresh
        window.dispatchEvent(new CustomEvent('fridgeItemsUpdated'))
        
        // Dispatch event to notify Header to refresh notifications (with small delay to ensure backend processed)
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('refreshNotifications'))
        }, 500)
        
        console.log('✅ Đã lưu thực phẩm vào database:', newItem.name)
      } else {
        throw new Error(response.message || 'Lỗi khi lưu vào database')
      }
    } catch (error) {
      console.warn('⚠ Không thể lưu vào database:', error)
      const fallbackExpiryDate = newItem.expiryDate || (() => {
        const shelfLifeDays = Number(newItem.shelfLifeDays)
        if (!newItem.purchaseDate || !Number.isFinite(shelfLifeDays) || shelfLifeDays <= 0) {
          return newItem.expiryDate
        }
        const purchaseDate = new Date(newItem.purchaseDate)
        if (Number.isNaN(purchaseDate.getTime())) {
          return newItem.expiryDate
        }
        purchaseDate.setDate(purchaseDate.getDate() + shelfLifeDays)
        return purchaseDate.toISOString()
      })()
      // Fallback: Add to local state (will be saved to localStorage)
      const fallbackItem = {
        ...newItem,
        id: Date.now().toString(), // Temporary ID
        expiryDate: fallbackExpiryDate,
        status: calculateItemStatus(fallbackExpiryDate).status,
        daysLeft: calculateItemStatus(fallbackExpiryDate).daysLeft
      }
      setFridgeItems(prev => {
        const matchIndex = prev.findIndex(item =>
          item.name.toLowerCase() === fallbackItem.name.toLowerCase() &&
          item.unit === fallbackItem.unit &&
          item.expiryDate === fallbackItem.expiryDate &&
          item.storageLocation === fallbackItem.storageLocation
        )
        if (matchIndex === -1) {
          return [...prev, fallbackItem]
        }
        const next = [...prev]
        next[matchIndex] = {
          ...next[matchIndex],
          quantity: (parseFloat(next[matchIndex].quantity) || 0) + (parseFloat(fallbackItem.quantity) || 0),
          status: calculateItemStatus(fallbackItem.expiryDate).status,
          daysLeft: calculateItemStatus(fallbackItem.expiryDate).daysLeft
        }
        return next
      })
      
      // Show warning
      showToast(`Đã lưu vào bộ nhớ tạm. Vui lòng kiểm tra kết nối database để đồng bộ dữ liệu.\n\nLỗi: ${error.message}`, "warning")
    }
  }

  const handleDeleteItem = (itemId) => {
    const item = fridgeItems.find(i => i.id === itemId)
    if (!item) return

    setDeleteConfirm({
      isOpen: true,
      itemId: itemId,
      itemName: item.name
    })
  }

  const confirmDeleteItem = async () => {
    if (!deleteConfirm.itemId) return

    try {
      setIsDeleting(true)
      
      // Try to delete from database via API
      const response = await deleteFridgeItem(deleteConfirm.itemId)
      
      if (response.success) {
        // Remove from local state
        setFridgeItems(prev => prev.filter(item => item.id !== deleteConfirm.itemId))
        
        // Dispatch events to notify other components to refresh
        window.dispatchEvent(new CustomEvent('fridgeItemsUpdated'))
        window.dispatchEvent(new CustomEvent('refreshNotifications'))
        
        // Show success message
        showToast(`Đã xóa thực phẩm "${deleteConfirm.itemName}" thành công`, "success")
        
        // Close dialog
        setDeleteConfirm({ isOpen: false, itemId: null, itemName: "" })
      } else {
        throw new Error(response.message || 'Lỗi khi xóa từ database')
      }
    } catch (error) {
      console.error('❌ Lỗi khi xóa thực phẩm:', error)
      
      // Determine error message
      let errorMessage = 'Không thể xóa thực phẩm'
      if (error.message) {
        errorMessage = error.message
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      
      // Show error toast
      showToast(errorMessage, "error")
      
      // Don't remove from local state if API call failed
      // Keep dialog open so user can try again
    } finally {
      setIsDeleting(false)
    }
  }

  // Group items by foodItemId and expiryDate (same calendar day)
  const groupFridgeItems = (items) => {
    const groups = new Map()
    
    items.forEach(item => {
      // Skip used_up items
      if (item.status === 'used_up') return
      
      // Create group key: name + expiryDate (same day)
      const groupKey = `${item.name}|${item.expiryDateOnly}`
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          name: item.name,
          category: item.category,
          unit: item.unit,
          expiryDate: item.expiryDate,
          expiryDateOnly: item.expiryDateOnly,
          storageLocation: item.storageLocation, // Use first batch's storage location
          batches: [],
          totalQuantity: 0,
          batchCount: 0,
          status: item.status,
          daysLeft: item.daysLeft
        })
      }
      
      const group = groups.get(groupKey)
      group.batches.push(item)
      group.totalQuantity += parseFloat(item.quantity) || 0
      group.batchCount += 1
      
      // Update group status:
      // - expired if all batches expired
      // - expiring_soon if at least one batch is expiring_soon
      if (item.status === 'expired') {
        // Check if all batches are expired
        const allExpired = group.batches.every(b => b.status === 'expired')
        if (allExpired) {
          group.status = 'expired'
        }
      } else if (item.status === 'expiring_soon') {
        group.status = 'expiring_soon'
      }
      
      // Use earliest daysLeft
      if (item.daysLeft < group.daysLeft) {
        group.daysLeft = item.daysLeft
      }
    })
    
    return Array.from(groups.values())
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

  // Group items
  let groupedItems = groupFridgeItems(filteredItems)

  // Sort groups: by status priority, then by expiryDate ascending
  groupedItems = [...groupedItems].sort((a, b) => {
    const priorityA = getStatusPriority(a.status)
    const priorityB = getStatusPriority(b.status)
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }
    
    // Same status: sort by expiryDate ascending
    return new Date(a.expiryDate) - new Date(b.expiryDate)
  })

  // Toggle group expansion
  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

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
      {groupedItems.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
          <Info className="h-3 w-3" />
          <span>Các thực phẩm cùng tên và cùng ngày hết hạn được nhóm lại. Click để xem chi tiết từng lô.</span>
        </div>
      )}

      {/* Items Grid */}
      {groupedItems.length === 0 ? (
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
          {groupedItems.map((group) => {
            const status = statusConfig[group.status] || statusConfig.available
            const isExpanded = expandedGroups.has(group.key)
            const hasMultipleBatches = group.batchCount > 1
            
            return (
              <Card 
                key={group.key} 
                className="hover:shadow-lg transition-shadow relative"
                onMouseEnter={() => setHoveredItemId(group.key)}
                onMouseLeave={() => setHoveredItemId(null)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <div className="relative">
                          <Info 
                            className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors"
                            title="HSD, vị trí lưu trữ, và mẹo bảo quản (nếu có)."
                          />
                          {hoveredItemId === group.key && (
                            <div className="absolute left-0 top-6 z-50 w-64 rounded-lg border bg-popover p-3 text-sm shadow-lg animate-in fade-in-0 zoom-in-95">
                              <p className="font-semibold mb-1 text-foreground">💡 Mẹo bảo quản</p>
                              <p className="text-muted-foreground text-xs leading-relaxed">
                                {getPreservationTip(group.category)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{group.category}</p>
                      {hasMultipleBatches && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {group.batchCount} lô thực phẩm
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={status.variant}
                        className={group.status === 'expiring_soon' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                      >
                        {group.status === 'expiring_soon' && (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        )}
                        {status.label}
                      </Badge>
                      {hasMultipleBatches && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGroup(group.key)}
                          className="h-8 w-8 p-0"
                          title={isExpanded ? "Thu gọn" : "Mở rộng"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {group.totalQuantity.toFixed(1)} {group.unit}
                        {hasMultipleBatches && ` (tổng ${group.batchCount} lô)`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        HSD: {new Date(group.expiryDate).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {(() => {
                        const StorageIcon = storageLocationIcons[group.storageLocation] || Home
                        return <StorageIcon className="h-4 w-4 text-muted-foreground" />
                      })()}
                      <span className="text-muted-foreground">{group.storageLocation}</span>
                    </div>
                    
                    {/* Batch details when expanded */}
                    {isExpanded && hasMultipleBatches && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          Chi tiết từng lô:
                        </p>
                        {group.batches.map((batch, idx) => (
                          <div 
                            key={batch.id}
                            className="bg-muted/50 rounded-lg p-3 space-y-2 relative group"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(batch.id)}
                              className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Xóa lô này"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <div className="pr-8">
                              <span className="text-sm font-medium">
                                Lô {idx + 1}
                              </span>
                            </div>
                            <div className="text-xs space-y-1 text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Package className="h-3 w-3" />
                                <span>{batch.quantity} {batch.unit}</span>
                              </div>
                              {batch.purchaseDate && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  <span>Mua: {new Date(batch.purchaseDate).toLocaleDateString("vi-VN")}</span>
                                </div>
                              )}
                              {batch.source && batch.source !== 'manual' && (
                                <div className="flex items-center gap-2">
                                  <Info className="h-3 w-3" />
                                  <span>Nguồn: {batch.source === 'shopping_list' ? 'Danh sách mua sắm' : batch.source}</span>
                                </div>
                              )}
                              {batch.notes && (
                                <div className="flex items-start gap-2">
                                  <Info className="h-3 w-3 mt-0.5" />
                                  <span className="flex-1">{batch.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Delete button for single batch groups */}
                    {!hasMultipleBatches && (
                      <div className="pt-2 border-t flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(group.batches[0].id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Xóa thực phẩm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {group.status === "expiring_soon" && (
                      <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-2">
                        <p className="text-xs text-orange-800 dark:text-orange-200 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Còn {group.daysLeft} ngày nữa sẽ hết hạn
                        </p>
                      </div>
                    )}
                    {group.status === "expired" && (
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
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, itemId: null, itemName: "" })}
        onConfirm={confirmDeleteItem}
        title="Xóa thực phẩm"
        message={`Bạn có chắc chắn muốn xóa thực phẩm "${deleteConfirm.itemName}"?\n\nHành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        variant="destructive"
        loading={isDeleting}
      />
    </div>
  )
}

