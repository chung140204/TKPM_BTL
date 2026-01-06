import { useState } from "react"
import { NavLink } from "react-router-dom"
import { 
  LayoutDashboard, 
  Refrigerator, 
  ChefHat, 
  ShoppingCart, 
  BarChart3,
  Calendar,
  LogOut,
  Shield,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { ROLES } from "@/utils/roles"

const userNavItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/fridge", icon: Refrigerator, label: "Tủ lạnh" },
  { path: "/family-groups", icon: Users, label: "Nhóm gia đình" },
  { path: "/recipes", icon: ChefHat, label: "Gợi ý món ăn" },
  { path: "/meal-planner", icon: Calendar, label: "Kế hoạch bữa ăn", roles: [ROLES.HOMEMAKER] },
  { path: "/shopping", icon: ShoppingCart, label: "Danh sách mua sắm" },
  { path: "/statistics", icon: BarChart3, label: "Thống kê" },
]

const adminNavItems = [
  { path: "/admin/stats", icon: BarChart3, label: "Thống kê" },
  { path: "/admin/users", icon: Shield, label: "Quản trị người dùng" },
  { path: "/admin/recipes", icon: ChefHat, label: "Quản lý thực đơn" },
]

export function Sidebar() {
  const { logout, user } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const navItems = user?.role === ROLES.ADMIN ? adminNavItems : userNavItems

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = () => {
    logout()
    setShowLogoutConfirm(false)
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-primary">Smart Grocery</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.filter((item) => {
          if (!item.roles) return true
          return item.roles.includes(user?.role)
        }).map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )
              }
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-5 w-5" />
          Đăng xuất
        </button>
      </div>
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Xác nhận đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất?"
        confirmText="Đăng xuất"
        cancelText="Hủy"
        variant="destructive"
      />
    </div>
  )
}
