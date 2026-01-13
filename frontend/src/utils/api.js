// API utility functions for backend communication

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
const VIEW_STORAGE_KEY = 'viewMode'

// Get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem('authToken') || localStorage.getItem('token')
}

function getViewMode() {
  return localStorage.getItem(VIEW_STORAGE_KEY) || 'personal'
}

function appendViewParam(endpoint) {
  const view = getViewMode()
  if (!view) return endpoint

  const url = new URL(endpoint, 'http://local')
  if (!url.searchParams.has('view')) {
    url.searchParams.set('view', view)
  }
  return `${url.pathname}${url.search}`
}

// Make API request
export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken()
  
  const { body, headers, ...restOptions } = options
  
  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    ...restOptions,
  }

  // Add body for POST/PUT requests
  if (body && (config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH')) {
    config.body = typeof body === 'string' ? body : JSON.stringify(body)
  }

  try {
    const endpointWithView = appendViewParam(endpoint)
    console.log(`API Request: ${config.method} ${API_BASE_URL}${endpointWithView}`, config)
    const response = await fetch(`${API_BASE_URL}${endpointWithView}`, config)
    
    console.log(`API Response Status: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('API Error Response:', errorData)
      
      // Handle 401 Unauthorized - Token expired or invalid
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('authToken')
        localStorage.removeItem('token')
        localStorage.removeItem('isAuthenticated')
        
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
      
      const error = new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`)
      error.status = response.status
      error.data = errorData
      throw error
    }
    
    const data = await response.json()
    console.log('API Success Response:', data)
    return data
  } catch (error) {
    console.error('API Request Error:', error)
    // Re-throw with more context
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra backend có đang chạy không.')
    }
    throw error
  }
}

// Auth API
export async function login(email, password) {
  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    return response
  } catch (error) {
    console.error('Error logging in:', error)
    throw error
  }
}

export async function changePassword(currentPassword, newPassword) {
  try {
    const response = await apiRequest('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    })
    return response
  } catch (error) {
    console.error('Error changing password:', error)
    throw error
  }
}

export async function getMe() {
  try {
    const response = await apiRequest('/auth/me')
    return response
  } catch (error) {
    console.error('Error fetching user data:', error)
    throw error
  }
}

// Register API
export async function register(email, password, fullName, phone, role) {
  try {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: { email, password, fullName, phone, role },
    })
    return response
  } catch (error) {
    console.error('Error registering user:', error)
    throw error
  }
}

// Admin APIs
export async function getAdminStats() {
  try {
    const response = await apiRequest('/admin/stats')
    return response
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    throw error
  }
}

export async function getAdminUsers() {
  try {
    const response = await apiRequest('/admin/users')
    return response
  } catch (error) {
    console.error('Error fetching admin users:', error)
    throw error
  }
}

export async function createAdminUser(payload) {
  try {
    const response = await apiRequest('/admin/users', {
      method: 'POST',
      body: payload,
    })
    return response
  } catch (error) {
    console.error('Error creating admin user:', error)
    throw error
  }
}

export async function updateAdminUser(userId, payload) {
  try {
    const response = await apiRequest(`/admin/users/${userId}`, {
      method: 'PUT',
      body: payload,
    })
    return response
  } catch (error) {
    console.error('Error updating admin user:', error)
    throw error
  }
}

export async function deleteAdminUser(userId) {
  try {
    const response = await apiRequest(`/admin/users/${userId}`, {
      method: 'DELETE',
    })
    return response
  } catch (error) {
    console.error('Error deleting admin user:', error)
    throw error
  }
}

export async function getPendingRecipes() {
  try {
    const response = await apiRequest('/admin/recipes/pending')
    return response
  } catch (error) {
    console.error('Error fetching pending recipes:', error)
    throw error
  }
}

export async function approveRecipe(recipeId) {
  try {
    const response = await apiRequest(`/admin/recipes/${recipeId}/approve`, {
      method: 'PUT',
    })
    return response
  } catch (error) {
    console.error('Error approving recipe:', error)
    throw error
  }
}

export async function rejectRecipe(recipeId) {
  try {
    const response = await apiRequest(`/admin/recipes/${recipeId}/reject`, {
      method: 'PUT',
    })
    return response
  } catch (error) {
    console.error('Error rejecting recipe:', error)
    throw error
  }
}

export async function getAdminRecipes() {
  try {
    const response = await apiRequest('/admin/recipes')
    return response
  } catch (error) {
    console.error('Error fetching admin recipes:', error)
    throw error
  }
}

export async function createAdminRecipe(payload) {
  try {
    const response = await apiRequest('/admin/recipes', {
      method: 'POST',
      body: payload,
    })
    return response
  } catch (error) {
    console.error('Error creating admin recipe:', error)
    throw error
  }
}

export async function updateAdminRecipe(recipeId, payload) {
  try {
    const response = await apiRequest(`/admin/recipes/${recipeId}`, {
      method: 'PUT',
      body: payload,
    })
    return response
  } catch (error) {
    console.error('Error updating admin recipe:', error)
    throw error
  }
}

export async function deleteAdminRecipe(recipeId) {
  try {
    const response = await apiRequest(`/admin/recipes/${recipeId}`, {
      method: 'DELETE',
    })
    return response
  } catch (error) {
    console.error('Error deleting admin recipe:', error)
    throw error
  }
}

export async function getMyRecipes() {
  try {
    const response = await apiRequest('/recipes/mine')
    return response
  } catch (error) {
    console.error('Error fetching my recipes:', error)
    throw error
  }
}

export async function createRecipe(payload) {
  try {
    const response = await apiRequest('/recipes', {
      method: 'POST',
      body: payload,
    })
    return response
  } catch (error) {
    console.error('Error creating recipe:', error)
    throw error
  }
}

export async function submitRecipeForApproval(recipeId) {
  try {
    const response = await apiRequest(`/recipes/${recipeId}/submit`, {
      method: 'PUT',
    })
    return response
  } catch (error) {
    console.error('Error submitting recipe for approval:', error)
    throw error
  }
}

// Dashboard API
export async function getDashboardOverview() {
  try {
    const response = await apiRequest('/statistics/dashboard')
    return response
  } catch (error) {
    console.error('Error fetching dashboard overview:', error)
    throw error
  }
}

// Family Group APIs
export async function getFamilyGroups() {
  try {
    const response = await apiRequest('/family-groups')
    return response
  } catch (error) {
    console.error('Error fetching family groups:', error)
    throw error
  }
}

export async function getFamilyGroupById(groupId) {
  try {
    const response = await apiRequest(`/family-groups/${groupId}`)
    return response
  } catch (error) {
    console.error('Error fetching family group:', error)
    throw error
  }
}

export async function createFamilyGroup(payload) {
  try {
    const response = await apiRequest('/family-groups', {
      method: 'POST',
      body: payload,
    })
    return response
  } catch (error) {
    console.error('Error creating family group:', error)
    throw error
  }
}

export async function updateFamilyGroup(groupId, payload) {
  try {
    const response = await apiRequest(`/family-groups/${groupId}`, {
      method: 'PUT',
      body: payload,
    })
    return response
  } catch (error) {
    console.error('Error updating family group:', error)
    throw error
  }
}

export async function addFamilyMember(groupId, payload) {
  try {
    const response = await apiRequest(`/family-groups/${groupId}/members`, {
      method: 'POST',
      body: payload,
    })
    return response
  } catch (error) {
    console.error('Error adding family member:', error)
    throw error
  }
}

export async function updateFamilyMemberRole(groupId, memberId, payload) {
  try {
    const response = await apiRequest(`/family-groups/${groupId}/members/${memberId}/role`, {
      method: 'PUT',
      body: payload,
    })
    return response
  } catch (error) {
    console.error('Error updating family member role:', error)
    throw error
  }
}

export async function removeFamilyMember(groupId, memberId) {
  try {
    const response = await apiRequest(`/family-groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
    })
    return response
  } catch (error) {
    console.error('Error removing family member:', error)
    throw error
  }
}

export async function getFamilyInvites() {
  try {
    const response = await apiRequest('/family-groups/invites')
    return response
  } catch (error) {
    console.error('Error fetching family invites:', error)
    throw error
  }
}

export async function acceptFamilyInvite(inviteId) {
  try {
    const response = await apiRequest(`/family-groups/invites/${inviteId}/accept`, {
      method: 'POST',
    })
    return response
  } catch (error) {
    console.error('Error accepting family invite:', error)
    throw error
  }
}

export async function declineFamilyInvite(inviteId) {
  try {
    const response = await apiRequest(`/family-groups/invites/${inviteId}/decline`, {
      method: 'POST',
    })
    return response
  } catch (error) {
    console.error('Error declining family invite:', error)
    throw error
  }
}

export async function cancelFamilyInvite(inviteId) {
  try {
    const response = await apiRequest(`/family-groups/invites/${inviteId}`, {
      method: 'DELETE',
    })
    return response
  } catch (error) {
    console.error('Error canceling family invite:', error)
    throw error
  }
}

export async function leaveFamilyGroup(groupId) {
  try {
    const response = await apiRequest(`/family-groups/${groupId}/leave`, {
      method: 'POST',
    })
    return response
  } catch (error) {
    console.error('Error leaving family group:', error)
    throw error
  }
}

export async function transferFamilyOwner(groupId, memberId) {
  try {
    const response = await apiRequest(`/family-groups/${groupId}/owner`, {
      method: 'PUT',
      body: { memberId },
    })
    return response
  } catch (error) {
    console.error('Error transferring family owner:', error)
    throw error
  }
}

// Recent Activities API
export async function getRecentActivities(page = 1, limit = 5) {
  try {
    const response = await apiRequest(`/statistics/recent-activities?page=${page}&limit=${limit}`)
    return response
  } catch (error) {
    console.error('Error fetching recent activities:', error)
    throw error
  }
}

// Statistics APIs
export async function getPurchaseStatistics(period = 'month', offset = 0) {
  try {
    const params = new URLSearchParams({ period })
    if (offset) {
      params.set('offset', offset)
    }
    const response = await apiRequest(`/statistics/purchases?${params.toString()}`)
    return response
  } catch (error) {
    console.error('Error fetching purchase statistics:', error)
    throw error
  }
}

export async function getWasteStatistics(period = 'month', offset = 0) {
  try {
    const params = new URLSearchParams({ period })
    if (offset) {
      params.set('offset', offset)
    }
    const response = await apiRequest(`/statistics/waste?${params.toString()}`)
    return response
  } catch (error) {
    console.error('Error fetching waste statistics:', error)
    throw error
  }
}

export async function getConsumptionStatistics(period = 'month', offset = 0) {
  try {
    const params = new URLSearchParams({ period })
    if (offset) {
      params.set('offset', offset)
    }
    const response = await apiRequest(`/statistics/consumption?${params.toString()}`)
    return response
  } catch (error) {
    console.error('Error fetching consumption statistics:', error)
    throw error
  }
}

// Export APIs - Download CSV reports
export async function downloadExportFile(endpoint, filename) {
  try {
    const token = getAuthToken()
    const view = getViewMode()
    
    const url = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin)
    if (view) {
      url.searchParams.set('view', view)
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`)
    }
    
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || 'report'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
    
    return { success: true }
  } catch (error) {
    console.error('Error downloading export file:', error)
    throw error
  }
}

export async function exportPurchaseStatisticsCSV(period = 'month') {
  return downloadExportFile(`/export/purchases/csv?period=${period}`, `bao-cao-mua-sam-${period}.csv`)
}

export async function exportWasteStatisticsCSV(period = 'month') {
  return downloadExportFile(`/export/waste/csv?period=${period}`, `bao-cao-lang-phi-${period}.csv`)
}

export async function exportConsumptionStatisticsCSV(period = 'month') {
  return downloadExportFile(`/export/consumption/csv?period=${period}`, `bao-cao-tieu-thu-${period}.csv`)
}

export async function exportDashboardOverviewCSV() {
  return downloadExportFile('/export/dashboard/csv', 'bao-cao-dashboard.csv')
}

// FridgeItem APIs
export async function getFridgeItems() {
  try {
    const response = await apiRequest('/fridge-items')
    return response
  } catch (error) {
    console.error('Error fetching fridge items:', error)
    throw error
  }
}

// Category APIs
export async function getCategories() {
  try {
    const response = await apiRequest('/categories')
    return response
  } catch (error) {
    console.error('Error fetching categories:', error)
    throw error
  }
}

// Unit APIs
export async function getUnits() {
  try {
    const response = await apiRequest('/units')
    return response
  } catch (error) {
    console.error('Error fetching units:', error)
    throw error
  }
}

// FoodItem APIs
export async function getFoodItems(search = '', includeInactive = false) {
  try {
    const params = new URLSearchParams()
    if (search) {
      params.set('search', search)
    }
    if (includeInactive) {
      params.set('includeInactive', 'true')
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await apiRequest(`/food-items${query}`)
    return response
  } catch (error) {
    console.error('Error fetching food items:', error)
    throw error
  }
}

export async function createFoodItem(foodItemData) {
  try {
    const response = await apiRequest('/food-items', {
      method: 'POST',
      body: foodItemData
    })
    return response
  } catch (error) {
    console.error('Error creating food item:', error)
    throw error
  }
}

// Helper: Find or create FoodItem by name
async function findOrCreateFoodItem(name, categoryName) {
  try {
    // First, try to find existing FoodItem
    const categoriesResponse = await apiRequest('/categories')
    const categories = categoriesResponse.data?.categories || []
    const category = categories.find(c => c.name === categoryName)
    
    if (!category) {
      throw new Error(`Category "${categoryName}" not found`)
    }

    const foodItemsResponse = await apiRequest('/food-items')
    const foodItems = foodItemsResponse.data?.foodItems || []
    let foodItem = foodItems.find(f => f.name.toLowerCase() === name.toLowerCase())
    
    if (!foodItem) {
      // Create new FoodItem
      const createResponse = await apiRequest('/food-items', {
        method: 'POST',
        body: {
          name: name,
          categoryId: category._id,
          description: `Auto-created from fridge item: ${name}`
        }
      })
      foodItem = createResponse.data?.foodItem
    }
    
    return foodItem
  } catch (error) {
    console.error('Error finding/creating FoodItem:', error)
    throw error
  }
}

// Helper: Find or create Unit by name/abbreviation
async function findOrCreateUnit(unitString) {
  try {
    const unitsResponse = await apiRequest('/units')
    const units = unitsResponse.data?.units || []
    
    // Try to find by abbreviation first, then by name
    let unit = units.find(u => 
      u.abbreviation?.toLowerCase() === unitString.toLowerCase() ||
      u.name?.toLowerCase() === unitString.toLowerCase()
    )
    
    if (!unit) {
      // Create new Unit
      const createResponse = await apiRequest('/units', {
        method: 'POST',
        body: {
          name: unitString,
          abbreviation: unitString,
          type: 'count' // Default type
        }
      })
      unit = createResponse.data?.unit
    }
    
    return unit
  } catch (error) {
    console.error('Error finding/creating Unit:', error)
    throw error
  }
}

// Helper: Parse quantity string (e.g., "1.8 kg" -> { quantity: 1.8, unit: "kg" })
function parseQuantityString(quantityStr) {
  if (!quantityStr) return { quantity: 0, unit: '' }
  
  const match = String(quantityStr).match(/^([\d.]+)\s*(.+)?$/)
  if (match) {
    return {
      quantity: parseFloat(match[1]) || 0,
      unit: match[2]?.trim() || ''
    }
  }
  
  // If no match, try to parse as number only
  const num = parseFloat(quantityStr)
  return {
    quantity: isNaN(num) ? 0 : num,
    unit: ''
  }
}

// Create FridgeItem from frontend format (name, category, quantity string)
export async function createFridgeItemFromFrontend(item) {
  try {
    // Use simple endpoint that handles everything
    const response = await apiRequest('/fridge-items/simple', {
      method: 'POST',
      body: {
        name: item.name,
        category: item.category,
        quantity: item.quantity, // Can be string like "1.8 kg"
        expiryDate: item.expiryDate,
        purchaseDate: item.purchaseDate,
        shelfLifeDays: item.shelfLifeDays,
        saveToCatalog: item.saveToCatalog,
        storageLocation: item.storageLocation || 'Ngăn mát',
        price: item.price || 0
      }
    })
    
    return response
  } catch (error) {
    console.error('Error creating fridge item:', error)
    throw error
  }
}

export async function deleteFridgeItem(id) {
  try {
    const response = await apiRequest(`/fridge-items/${id}`, {
      method: 'DELETE'
    })
    return response
  } catch (error) {
    console.error('Error deleting fridge item:', error)
    throw error
  }
}

// ShoppingList APIs
export async function getShoppingLists() {
  try {
    const response = await apiRequest('/shopping-lists')
    return response
  } catch (error) {
    console.error('Error fetching shopping lists:', error)
    throw error
  }
}

export async function createShoppingList(shoppingListData) {
  try {
    const response = await apiRequest('/shopping-lists', {
      method: 'POST',
      body: shoppingListData
    })
    return response
  } catch (error) {
    console.error('Error creating shopping list:', error)
    throw error
  }
}

export async function updateShoppingListItem(listId, itemId, itemData) {
  try {
    const response = await apiRequest(`/shopping-lists/${listId}/item/${itemId}`, {
      method: 'PUT',
      body: itemData
    })
    return response
  } catch (error) {
    console.error('Error updating shopping list item:', error)
    throw error
  }
}

export async function updateShoppingList(listId, listData) {
  try {
    const response = await apiRequest(`/shopping-lists/${listId}`, {
      method: 'PUT',
      body: listData
    })
    return response
  } catch (error) {
    console.error('Error updating shopping list:', error)
    throw error
  }
}

export async function completeShoppingList(listId) {
  try {
    const response = await apiRequest(`/shopping-lists/${listId}/complete`, {
      method: 'PUT'
    })
    return response
  } catch (error) {
    console.error('Error completing shopping list:', error)
    throw error
  }
}

export async function deleteShoppingList(listId) {
  try {
    const response = await apiRequest(`/shopping-lists/${listId}`, {
      method: 'DELETE'
    })
    return response
  } catch (error) {
    console.error('Error deleting shopping list:', error)
    throw error
  }
}

// Recipe APIs
export async function toggleFavoriteRecipe(recipeId) {
  try {
    const response = await apiRequest(`/recipes/${recipeId}/toggle-favorite`, {
      method: 'POST',
    })
    return response
  } catch (error) {
    console.error('Error toggling favorite recipe:', error)
    throw error
  }
}

export async function getSuggestedRecipes() {
  try {
    const response = await apiRequest('/recipes/suggest')
    // If API returns empty recipes, fallback to mock
    const recipes = response.data?.recipes || []
    if (recipes.length === 0) {
      console.warn('API returned empty recipes, falling back to mock data')
      // Dynamic import to avoid circular dependencies
      const { mockRecipes } = await import('../data/mockData.js')
      return {
        success: true,
        data: {
          recipes: mockRecipes || []
        }
      }
    }
    return response
  } catch (error) {
    console.error('Error fetching suggested recipes:', error)
    // Fallback to mock data if API fails
    console.warn('Falling back to mock recipes data')
    // Dynamic import to avoid circular dependencies
    const { mockRecipes } = await import('../data/mockData.js')
    return {
      success: true,
      data: {
        recipes: mockRecipes || []
      }
    }
  }
}

export async function checkRecipeIngredients(recipeId) {
  try {
    const response = await apiRequest(`/recipes/${recipeId}/check-ingredients`)
    return response
  } catch (error) {
    console.error('Error checking recipe ingredients:', error)
    throw error
  }
}

export async function cookRecipeApi(recipeId) {
  try {
    const response = await apiRequest(`/recipes/${recipeId}/cook`, {
      method: 'POST'
    })
    return response
  } catch (error) {
    console.error('Error cooking recipe:', error)
    throw error
  }
}

// MealPlan APIs
export async function getMealPlans() {
  try {
    const response = await apiRequest('/meal-plans')
    return response
  } catch (error) {
    console.error('Error fetching meal plans:', error)
    throw error
  }
}

export async function getMealPlanById(id) {
  try {
    const response = await apiRequest(`/meal-plans/${id}`)
    return response
  } catch (error) {
    console.error('Error fetching meal plan:', error)
    throw error
  }
}

export async function createMealPlan(mealPlanData) {
  try {
    const response = await apiRequest('/meal-plans', {
      method: 'POST',
      body: mealPlanData
    })
    return response
  } catch (error) {
    console.error('Error creating meal plan:', error)
    throw error
  }
}

export async function updateMealPlan(id, mealPlanData) {
  try {
    const response = await apiRequest(`/meal-plans/${id}`, {
      method: 'PUT',
      body: mealPlanData
    })
    return response
  } catch (error) {
    console.error('Error updating meal plan:', error)
    throw error
  }
}

export async function deleteMealPlan(id) {
  try {
    const response = await apiRequest(`/meal-plans/${id}`, {
      method: 'DELETE'
    })
    return response
  } catch (error) {
    console.error('Error deleting meal plan:', error)
    throw error
  }
}

export async function generateShoppingListFromMealPlan(id) {
  try {
    const response = await apiRequest(`/meal-plans/${id}/generate-shopping-list`, {
      method: 'POST'
    })
    return response
  } catch (error) {
    console.error('Error generating shopping list from meal plan:', error)
    throw error
  }
}

// Notification APIs
export async function getNotifications() {
  try {
    const response = await apiRequest('/notifications')
    return response
  } catch (error) {
    console.error('Error fetching notifications:', error)
    throw error
  }
}

export async function getUnreadNotifications() {
  try {
    const response = await apiRequest('/notifications/unread')
    return response
  } catch (error) {
    console.error('Error fetching unread notifications:', error)
    throw error
  }
}

export async function markNotificationAsRead(notificationId) {
  try {
    const response = await apiRequest(`/notifications/${notificationId}/read`, {
      method: 'PUT'
    })
    return response
  } catch (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const response = await apiRequest('/notifications/read-all', {
      method: 'PUT'
    })
    return response
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    throw error
  }
}
