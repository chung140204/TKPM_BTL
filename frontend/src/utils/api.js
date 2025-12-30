// API utility functions for backend communication

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem('authToken') || localStorage.getItem('token')
}

// Make API request
async function apiRequest(endpoint, options = {}) {
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
    console.log(`API Request: ${config.method} ${API_BASE_URL}${endpoint}`, config)
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
    
    console.log(`API Response Status: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('API Error Response:', errorData)
      throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`)
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

// Statistics APIs
export async function getPurchaseStatistics(period = 'month') {
  try {
    const response = await apiRequest(`/statistics/purchases?period=${period}`)
    return response
  } catch (error) {
    console.error('Error fetching purchase statistics:', error)
    throw error
  }
}

export async function getWasteStatistics(period = 'month') {
  try {
    const response = await apiRequest(`/statistics/waste?period=${period}`)
    return response
  } catch (error) {
    console.error('Error fetching waste statistics:', error)
    throw error
  }
}

export async function getConsumptionStatistics(period = 'month') {
  try {
    const response = await apiRequest(`/statistics/consumption?period=${period}`)
    return response
  } catch (error) {
    console.error('Error fetching consumption statistics:', error)
    throw error
  }
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

