import { useState } from "react"
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
import { TrendingDown, TrendingUp, AlertTriangle, ShoppingCart, Utensils, Calendar } from "lucide-react"

export function Statistics() {
  const [timePeriod, setTimePeriod] = useState("month") // week, month, year

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Thống kê & Báo cáo</h1>
          <p className="text-muted-foreground">
            Phân tích xu hướng tiêu thụ và lãng phí thực phẩm
          </p>
        </div>
        {/* Time Period Filter */}
        <div className="flex gap-2">
          <Button
            variant={timePeriod === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("week")}
          >
            Tuần
          </Button>
          <Button
            variant={timePeriod === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("month")}
          >
            Tháng
          </Button>
          <Button
            variant={timePeriod === "year" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("year")}
          >
            Năm
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Thực phẩm đã mua</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">610 kg</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              <span className="text-blue-500">+5%</span> so với kỳ trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Thực phẩm đã tiêu thụ</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">555 kg</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+8%</span> so với kỳ trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng lãng phí</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">55 kg</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingDown className="h-3 w-3 text-green-500" />
              <span className="text-green-500">-35%</span> so với kỳ trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ lãng phí</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6.2%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingDown className="h-3 w-3 text-green-500" />
              <span className="text-green-500">-2.1%</span> so với kỳ trước
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 1. Thống kê thực phẩm đã mua theo thời gian */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Thống kê thực phẩm đã mua theo thời gian
          </CardTitle>
          <CardDescription>
            Xu hướng mua sắm thực phẩm trong {timePeriod === "week" ? "tuần" : timePeriod === "month" ? "tháng" : "năm"} qua
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockStatistics.purchaseVsConsumption}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="purchased" fill="#3b82f6" name="Đã mua (kg)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 2. Phân tích xu hướng tiêu thụ thực phẩm */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              Xu hướng tiêu thụ thực phẩm
            </CardTitle>
            <CardDescription>Phân tích xu hướng tiêu thụ trong gia đình</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockStatistics.purchaseVsConsumption}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="consumed"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Đã tiêu thụ (kg)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 3. Báo cáo số lượng thực phẩm bị lãng phí do hết hạn */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Lãng phí theo thời gian
            </CardTitle>
            <CardDescription>Báo cáo số lượng thực phẩm bị lãng phí do hết hạn</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockStatistics.wasteOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="waste"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Lãng phí (kg)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danh mục lãng phí nhiều nhất</CardTitle>
            <CardDescription>Top 5 danh mục có tỷ lệ lãng phí cao</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockStatistics.mostWastedCategories.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.category}</span>
                    <span className="text-muted-foreground">{item.amount} kg ({item.percentage}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase vs Consumption */}
      <Card>
        <CardHeader>
          <CardTitle>Mua sắm vs Tiêu thụ</CardTitle>
          <CardDescription>So sánh lượng mua và tiêu thụ trong 6 tháng</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={mockStatistics.purchaseVsConsumption}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="purchased" fill="#3b82f6" name="Đã mua (kg)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="consumed" fill="#10b981" name="Đã tiêu thụ (kg)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="wasted" fill="#ef4444" name="Lãng phí (kg)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

