import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { 
  Refrigerator, 
  AlertTriangle, 
  ShoppingCart, 
  TrendingDown,
  Calendar,
  Loader2
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { mockDashboardStats, mockWasteData, mockCategoryData } from "@/data/mockData"
import { getDashboardOverview } from "@/utils/api"

const COLORS = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6"]

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.wasteData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="waste" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phân bố theo danh mục</CardTitle>
            <CardDescription>Tỷ lệ thực phẩm trong tủ lạnh</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Hoạt động gần đây</CardTitle>
          <CardDescription>Các thao tác mới nhất trong hệ thống</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: "Thêm cà chua vào tủ lạnh", time: "2 giờ trước", type: "add" },
              { action: "Tạo danh sách mua sắm mới", time: "5 giờ trước", type: "create" },
              { action: "Hoàn thành nấu món Cơm rang thập cẩm", time: "1 ngày trước", type: "cook" },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-4 border-b pb-4 last:border-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

