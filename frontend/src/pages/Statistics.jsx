import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { mockStatistics } from "@/data/mockData"
import { TrendingDown, TrendingUp, AlertTriangle, ShoppingCart, Utensils, Calendar, Loader2, BarChart3, PieChart } from "lucide-react"
import { getPurchaseStatistics, getWasteStatistics, getConsumptionStatistics } from "@/utils/api"

export function Statistics() {
  const [timePeriod, setTimePeriod] = useState("month") // week, month, year
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statisticsData, setStatisticsData] = useState(null)

  // Fetch statistics data from API
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all statistics in parallel
        const [purchaseRes, wasteRes, consumptionRes] = await Promise.all([
          getPurchaseStatistics(timePeriod),
          getWasteStatistics(timePeriod),
          getConsumptionStatistics(timePeriod)
        ])

        // Check if any API call failed
        if (!purchaseRes.success || !wasteRes.success || !consumptionRes.success) {
          const errors = []
          if (!purchaseRes.success) errors.push(`Purchase: ${purchaseRes.message || 'Lỗi không xác định'}`)
          if (!wasteRes.success) errors.push(`Waste: ${wasteRes.message || 'Lỗi không xác định'}`)
          if (!consumptionRes.success) errors.push(`Consumption: ${consumptionRes.message || 'Lỗi không xác định'}`)
          throw new Error(`API errors: ${errors.join(', ')}`)
        }

        // Transform data for charts
        const purchaseData = purchaseRes.data || {}
        const wasteData = wasteRes.data || {}
        const consumptionData = consumptionRes.data || {}

        console.log('Purchase data:', purchaseData)
        console.log('Waste data:', wasteData)
        console.log('Consumption data:', consumptionData)

        // Transform consumptionTrend to purchaseVsConsumption format
        const consumptionTrend = consumptionData.consumptionTrend || []
        const purchaseVsConsumption = consumptionTrend.length > 0 
          ? consumptionTrend.map((item, index) => {
              // Format date for display
              const date = new Date(item.date)
              let monthLabel = ''
              
              if (timePeriod === 'week') {
                monthLabel = `Ngày ${date.getDate()}/${date.getMonth() + 1}`
              } else if (timePeriod === 'month') {
                // Group by week for month view
                const weekNum = Math.ceil(date.getDate() / 7)
                monthLabel = `Tuần ${weekNum}`
              } else {
                // Year view: show month
                const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
                monthLabel = monthNames[date.getMonth()] || `Tháng ${date.getMonth() + 1}`
              }

              return {
                month: monthLabel || `Item ${index + 1}`,
                purchased: Math.round((item.purchased || 0) * 10) / 10,
                consumed: Math.round((item.used || 0) * 10) / 10,
                wasted: Math.round((item.wasted || 0) * 10) / 10
              }
            })
          : [] // Empty array if no data

        // Transform waste trend
        const wasteTrend = wasteData.trend || []
        const wasteOverTime = wasteTrend.length > 0
          ? wasteTrend.map(item => {
              const date = new Date(item.date)
              let dateLabel = ''
              
              if (timePeriod === 'week') {
                dateLabel = `${date.getDate()}/${date.getMonth() + 1}`
              } else if (timePeriod === 'month') {
                dateLabel = date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })
              } else {
                dateLabel = date.toLocaleDateString('vi-VN', { month: 'short' })
              }
              
              return {
                date: dateLabel,
                waste: Math.round((item.totalQuantity || 0) * 10) / 10
              }
            })
          : [] // Empty array if no data

        // Transform most wasted categories
        const byCategory = wasteData.byCategory || []
        const mostWastedCategories = byCategory.length > 0
          ? byCategory.slice(0, 5).map((item, index, array) => {
              const total = array.reduce((sum, cat) => sum + (cat.totalQuantity || 0), 0)
              return {
                category: item.categoryName || 'Chưa phân loại',
                amount: Math.round((item.totalQuantity || 0) * 10) / 10,
                percentage: total > 0 ? Math.round(((item.totalQuantity || 0) / total) * 100) : 0
              }
            })
          : [] // Empty array if no data

        // Calculate summary stats
        const totalPurchased = purchaseData.totalItems || 0
        const totalConsumed = consumptionTrend.reduce((sum, item) => sum + (item.used || 0), 0)
        const totalWasted = wasteData.totalWastedAmount || wasteData.totalWastedItems || 0
        const wasteRate = consumptionData.wasteRate || (totalConsumed > 0 ? (totalWasted / totalConsumed) * 100 : 0)

        console.log('Calculated stats:', {
          totalPurchased,
          totalConsumed,
          totalWasted,
          wasteRate
        })

        setStatisticsData({
          totalPurchased: Math.round(totalPurchased * 10) / 10,
          totalConsumed: Math.round(totalConsumed * 10) / 10,
          totalWasted: Math.round(totalWasted * 10) / 10,
          wasteRate: Math.round(wasteRate * 100) / 100,
          purchaseVsConsumption,
          wasteOverTime,
          mostWastedCategories
        })
      } catch (err) {
        console.error('Error fetching statistics:', err)
        setError(err.message || 'Không thể kết nối đến server')
        
        // Only use empty data, not mock data - to show that data is from database
        setStatisticsData({
          totalPurchased: 0,
          totalConsumed: 0,
          totalWasted: 0,
          wasteRate: 0,
          purchaseVsConsumption: [],
          wasteOverTime: [],
          mostWastedCategories: []
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStatistics()
  }, [timePeriod])

  // Use statisticsData if available, otherwise use empty data (not mock)
  const data = statisticsData || {
    totalPurchased: 0,
    totalConsumed: 0,
    totalWasted: 0,
    wasteRate: 0,
    purchaseVsConsumption: [],
    wasteOverTime: [],
    mostWastedCategories: []
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Đang tải dữ liệu thống kê...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Thống kê & Báo cáo
            </h1>
          </div>
          <p className="text-muted-foreground ml-12">
            Phân tích xu hướng tiêu thụ và lãng phí thực phẩm
          </p>
        </div>
        <div className="flex items-center gap-4">
          {error ? (
            <Badge variant="outline" className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200">
              ⚠ Lỗi: {error}
            </Badge>
          ) : statisticsData ? (
            <Badge variant="outline" className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200">
              ✓ Dữ liệu từ Database
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Đang tải...
            </Badge>
          )}
          {/* Time Period Filter */}
          <div className="flex gap-2 bg-muted/50 p-1 rounded-lg">
            <Button
              variant={timePeriod === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimePeriod("week")}
              className={timePeriod === "week" ? "shadow-sm" : ""}
            >
              Tuần
            </Button>
            <Button
              variant={timePeriod === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimePeriod("month")}
              className={timePeriod === "month" ? "shadow-sm" : ""}
            >
              Tháng
            </Button>
            <Button
              variant={timePeriod === "year" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimePeriod("year")}
              className={timePeriod === "year" ? "shadow-sm" : ""}
            >
              Năm
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/30 dark:bg-green-800/20 rounded-full -mr-16 -mt-16 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-green-700 dark:text-green-300">Thực phẩm đã mua</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <ShoppingCart className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-green-900 dark:text-green-100 mb-1">{data.totalPurchased} kg</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              <span className="text-green-600 font-medium">+5%</span>
              <span className="text-muted-foreground">so với kỳ trước</span>
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/30 dark:bg-green-800/20 rounded-full -mr-16 -mt-16 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-green-700 dark:text-green-300">Thực phẩm đã tiêu thụ</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <Utensils className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-green-900 dark:text-green-100 mb-1">{data.totalConsumed} kg</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              <span className="text-green-600 font-medium">+8%</span>
              <span className="text-muted-foreground">so với kỳ trước</span>
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-200/30 dark:bg-red-800/20 rounded-full -mr-16 -mt-16 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-300">Tổng lãng phí</CardTitle>
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-red-900 dark:text-red-100 mb-1">{data.totalWasted} kg</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
              <TrendingDown className="h-3.5 w-3.5 text-green-600" />
              <span className="text-green-600 font-medium">-35%</span>
              <span className="text-muted-foreground">so với kỳ trước</span>
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/30 dark:bg-purple-800/20 rounded-full -mr-16 -mt-16 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300">Tỷ lệ lãng phí</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <PieChart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-1">{data.wasteRate}%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
              <TrendingDown className="h-3.5 w-3.5 text-green-600" />
              <span className="text-green-600 font-medium">-2.1%</span>
              <span className="text-muted-foreground">so với kỳ trước</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 1. Thống kê thực phẩm đã mua theo thời gian */}
      <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-b" style={{ backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }}>
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-green-500/10">
              <ShoppingCart className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            Thống kê thực phẩm đã mua theo thời gian
          </CardTitle>
          <CardDescription className="mt-2">
            Xu hướng mua sắm thực phẩm trong {timePeriod === "week" ? "tuần" : timePeriod === "month" ? "tháng" : "năm"} qua
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {data.purchaseVsConsumption && data.purchaseVsConsumption.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.purchaseVsConsumption} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="purchasedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="purchased" fill="url(#purchasedGradient)" name="Đã mua (kg)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-80 text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có dữ liệu mua sắm trong khoảng thời gian này</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 2. Phân tích xu hướng tiêu thụ thực phẩm */}
        <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-b">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Utensils className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              Xu hướng tiêu thụ thực phẩm
            </CardTitle>
            <CardDescription className="mt-2">Phân tích xu hướng tiêu thụ trong gia đình</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {data.purchaseVsConsumption && data.purchaseVsConsumption.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data.purchaseVsConsumption} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="consumedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line
                  type="monotone"
                  dataKey="consumed"
                  stroke="#22C55E"
                  strokeWidth={3}
                  name="Đã tiêu thụ (kg)"
                  dot={{ fill: '#22C55E', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <defs>
                  <linearGradient id="consumedArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                <div className="text-center">
                  <Utensils className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Chưa có dữ liệu tiêu thụ trong khoảng thời gian này</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Báo cáo số lượng thực phẩm bị lãng phí do hết hạn */}
        <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-b">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              Lãng phí theo thời gian
            </CardTitle>
            <CardDescription className="mt-2">Báo cáo số lượng thực phẩm bị lãng phí do hết hạn</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {data.wasteOverTime && data.wasteOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data.wasteOverTime} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="wasteGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line
                  type="monotone"
                  dataKey="waste"
                  stroke="#ef4444"
                  strokeWidth={3}
                  name="Lãng phí (kg)"
                  dot={{ fill: '#ef4444', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Chưa có dữ liệu lãng phí trong khoảng thời gian này</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow duration-300 md:col-span-2">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-b">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <PieChart className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              Danh mục lãng phí nhiều nhất
            </CardTitle>
            <CardDescription className="mt-2">Top 5 danh mục có tỷ lệ lãng phí cao</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-5">
              {data.mostWastedCategories.length > 0 ? (
                data.mostWastedCategories.map((item, index) => {
                  const colors = ['bg-gradient-to-r from-red-500 to-red-600', 'bg-gradient-to-r from-orange-500 to-orange-600', 'bg-gradient-to-r from-yellow-500 to-yellow-600', 'bg-gradient-to-r from-amber-500 to-amber-600', 'bg-gradient-to-r from-stone-500 to-stone-600']
                  return (
                    <div key={index} className="space-y-2.5 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${colors[index] || 'bg-primary'}`} />
                          <span className="font-semibold text-base">{item.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">{item.amount} kg</span>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {item.percentage}%
                          </Badge>
                        </div>
                      </div>
                      <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${colors[index] || 'bg-primary'} shadow-sm`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Chưa có dữ liệu lãng phí</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase vs Consumption */}
      <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/20 border-b">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Mua sắm vs Tiêu thụ
          </CardTitle>
          <CardDescription className="mt-2">So sánh lượng mua, tiêu thụ và lãng phí theo thời gian</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {data.purchaseVsConsumption && data.purchaseVsConsumption.length > 0 ? (
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={data.purchaseVsConsumption} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="purchasedBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="consumedBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="wastedBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  padding: '12px'
                }} 
              />
              <Legend 
                wrapperStyle={{ paddingTop: '30px' }}
                iconType="circle"
              />
              <Bar dataKey="purchased" fill="url(#purchasedBarGradient)" name="Đã mua (kg)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="consumed" fill="url(#consumedBarGradient)" name="Đã tiêu thụ (kg)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="wasted" fill="url(#wastedBarGradient)" name="Lãng phí (kg)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[420px] text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có dữ liệu để so sánh mua sắm và tiêu thụ</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

