import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { getAdminStats } from "@/utils/api"
import { showToast } from "@/components/ui/Toast"
import { Users, ChefHat, Home, CalendarDays, Loader2 } from "lucide-react"

export function AdminStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const statsCards = useMemo(() => ([
    {
      title: "Tổng người dùng",
      value: stats?.totalUsers ?? 0,
      icon: Users
    },
    {
      title: "Tổng công thức công khai",
      value: stats?.totalRecipes ?? 0,
      icon: ChefHat
    },
    {
      title: "Nhóm gia đình",
      value: stats?.totalFamilyGroups ?? 0,
      icon: Home
    },
    {
      title: "User mới tuần này",
      value: stats?.newUsersThisWeek ?? 0,
      icon: CalendarDays
    }
  ]), [stats])

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true)
        const response = await getAdminStats()
        if (response.success) {
          setStats(response.data)
        }
      } catch (error) {
        console.error("Admin stats error:", error)
        showToast(error.message || "Không thể tải thống kê admin", "error")
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Thống kê hệ thống</h1>
        <p className="text-muted-foreground">Tổng quan chỉ số nền tảng.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <Icon className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tải...
                  </div>
                ) : (
                  <div className="text-2xl font-bold">{card.value}</div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
