import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { 
  Refrigerator, 
  AlertTriangle, 
  ShoppingCart, 
  TrendingDown,
  Calendar,
  Loader2,
  Package,
  Utensils,
  Bell,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { mockDashboardStats, mockWasteData, mockCategoryData } from "@/data/mockData"
import { getDashboardOverview, getRecentActivities } from "@/utils/api"

const COLORS = ["#22C55E", "#10b981", "#16a34a", "#ef4444", "#f59e0b"]

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activities, setActivities] = useState([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        console.log('Fetching dashboard data from API...')
        const response = await getDashboardOverview()
        console.log('Dashboard API response:', response)
        
        if (response.success && response.data) {
          // Use data from API
          console.log('Using data from database:', response.data)
          setDashboardData(response.data)
        } else {
          // API returned error response
          console.warn('API returned error response:', response)
          setError(response.message || 'API trả về lỗi')
          // Still try to use API data if available, otherwise use mock
          if (response.data) {
            setDashboardData(response.data)
          } else {
            setDashboardData({
              totalFridgeItems: mockDashboardStats.totalFridgeItems,
              expiringSoon: mockDashboardStats.expiringSoon,
              shoppingListCount: mockDashboardStats.shoppingListCount,
              wasteReduction: mockDashboardStats.wasteReduction,
              wasteData: mockWasteData,
              categoryData: mockCategoryData,
            })
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        // Only fallback to mock data if API call completely fails (network error, etc.)
        setError(err.message || 'Không thể kết nối đến server')
        setDashboardData({
          totalFridgeItems: mockDashboardStats.totalFridgeItems,
          expiringSoon: mockDashboardStats.expiringSoon,
          shoppingListCount: mockDashboardStats.shoppingListCount,
          wasteReduction: mockDashboardStats.wasteReduction,
          wasteData: mockWasteData,
          categoryData: mockCategoryData,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Fetch recent activities
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setActivitiesLoading(true)
        const response = await getRecentActivities(currentPage, 5)
        if (response.success && response.data) {
          setActivities(response.data.activities || [])
          if (response.data.pagination) {
            setPagination(response.data.pagination)
          }
        } else {
          // Fallback to mock data
          setActivities([
            { action: "Thêm cà chua vào tủ lạnh", time: "2 giờ trước", type: "fridge_add", icon: "Package" },
            { action: "Tạo danh sách mua sắm mới", time: "5 giờ trước", type: "shopping_create", icon: "ShoppingCart" },
            { action: "Hoàn thành nấu món Cơm rang thập cẩm", time: "1 ngày trước", type: "recipe_cook", icon: "Utensils" },
          ])
          setPagination({
            totalPages: 1,
            totalCount: 3,
            hasNextPage: false,
            hasPrevPage: false
          })
        }
      } catch (err) {
        console.error('Error fetching activities:', err)
        // Fallback to mock data
        setActivities([
          { action: "Thêm cà chua vào tủ lạnh", time: "2 giờ trước", type: "fridge_add", icon: "Package" },
          { action: "Tạo danh sách mua sắm mới", time: "5 giờ trước", type: "shopping_create", icon: "ShoppingCart" },
          { action: "Hoàn thành nấu món Cơm rang thập cẩm", time: "1 ngày trước", type: "recipe_cook", icon: "Utensils" },
        ])
        setPagination({
          totalPages: 1,
          totalCount: 3,
          hasNextPage: false,
          hasPrevPage: false
        })
      } finally {
        setActivitiesLoading(false)
      }
    }

    fetchActivities()
    
    // Refresh activities every 30 seconds (only if on first page)
    if (currentPage === 1) {
      const interval = setInterval(() => {
        fetchActivities()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [currentPage])

  // ALWAYS use dashboardData from API if available (from database)
  // Only use mock data if API completely failed (network error, etc.)
  const data = dashboardData || {
    totalFridgeItems: mockDashboardStats.totalFridgeItems,
    expiringSoon: mockDashboardStats.expiringSoon,
    shoppingListCount: mockDashboardStats.shoppingListCount,
    wasteReduction: mockDashboardStats.wasteReduction,
    wasteData: mockWasteData,
    categoryData: mockCategoryData,
  }
  
  // Check if we're using real data from database
  const isUsingDatabaseData = dashboardData !== null && !error

  const stats = [
    {
      title: "Tổng thực phẩm",
      value: data.totalFridgeItems,
      icon: Refrigerator,
      change: "+12%",
      trend: "up",
    },
    {
      title: "Sắp hết hạn",
      value: data.expiringSoon,
      icon: AlertTriangle,
      change: "-5%",
      trend: "down",
      variant: "warning",
    },
    {
      title: "Danh sách mua sắm",
      value: data.shoppingListCount,
      icon: ShoppingCart,
      change: "+2",
      trend: "up",
    },
    {
      title: "Giảm lãng phí",
      value: `${data.wasteReduction}%`,
      icon: TrendingDown,
      change: data.wasteReduction > 0 ? `-${Math.abs(data.wasteReduction)}%` : `+${Math.abs(data.wasteReduction)}%`,
      trend: data.wasteReduction > 0 ? "down" : "up",
      variant: "success",
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Tổng quan hệ thống quản lý thực phẩm</p>
        </div>
        {isUsingDatabaseData ? (
          <Badge variant="outline" className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20">
            ✓ Dữ liệu từ Database
          </Badge>
        ) : error ? (
          <Badge variant="outline" className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">
            ⚠ Đang dùng dữ liệu demo ({error})
          </Badge>
        ) : null}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <span className={stat.trend === "up" ? "text-green-500" : "text-red-500"}>
                    {stat.change}
                  </span>
                  <span>so với tháng trước</span>
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lãng phí thực phẩm theo tháng</CardTitle>
            <CardDescription>Xu hướng giảm lãng phí trong 6 tháng qua</CardDescription>
          </CardHeader>
          <CardContent>
            {!data.wasteData || data.wasteData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">Chưa có dữ liệu lãng phí</p>
                <p className="text-xs mt-1">Dữ liệu sẽ hiển thị khi có thông tin về thực phẩm hết hạn</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.wasteData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="waste" fill="#22C55E" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phân bố theo danh mục</CardTitle>
            <CardDescription>Tỷ lệ thực phẩm trong tủ lạnh</CardDescription>
          </CardHeader>
          <CardContent>
            {!data.categoryData || data.categoryData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">Chưa có dữ liệu phân bố</p>
                <p className="text-xs mt-1">Dữ liệu sẽ hiển thị khi có thực phẩm trong tủ lạnh</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#22C55E"
                    dataKey="value"
                  >
                    {data.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow duration-300" style={{ backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }}>
        <CardHeader className="border-b" style={{ borderColor: '#DCFCE7' }}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#DCFCE7' }}>
                  <Calendar className="h-5 w-5" style={{ color: '#22C55E' }} />
                </div>
                Hoạt động gần đây
              </CardTitle>
              <CardDescription className="mt-2">Các thao tác mới nhất trong hệ thống</CardDescription>
            </div>
            {pagination.totalCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {pagination.totalCount} hoạt động
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {activitiesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity, index) => {
                // Map icon string to component
                const iconMap = {
                  'Package': Package,
                  'ShoppingCart': ShoppingCart,
                  'Utensils': Utensils,
                  'AlertTriangle': AlertTriangle,
                  'Bell': Bell,
                  'Calendar': Calendar
                }
                const IconComponent = iconMap[activity.icon] || Calendar
                
                // Color based on type - use green for primary actions
                const colorMap = {
                  'fridge_add': 'bg-green-500/10 text-green-600 dark:text-green-400',
                  'shopping_create': 'bg-green-500/10 text-green-600 dark:text-green-400',
                  'shopping_complete': 'bg-green-500/10 text-green-600 dark:text-green-400',
                  'recipe_cook': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
                  'recipe_cooked': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
                  'expiry_reminder': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
                  'shopping_update': 'bg-green-500/10 text-green-600 dark:text-green-400'
                }
                const iconColor = colorMap[activity.type] || 'bg-green-500/10 text-green-600 dark:text-green-400'

                return (
                  <div 
                    key={index} 
                    className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors group"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconColor} transition-transform group-hover:scale-110`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{activity.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Chưa có hoạt động nào</p>
            </div>
          )}

          {/* Pagination Controls */}
          {!activitiesLoading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t mt-6">
              <div className="text-sm text-muted-foreground">
                Trang {pagination.page} / {pagination.totalPages} ({pagination.totalCount} hoạt động)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={!pagination.hasPrevPage || activitiesLoading}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Trước
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={activitiesLoading}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={!pagination.hasNextPage || activitiesLoading}
                  className="gap-1"
                >
                  Sau
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

