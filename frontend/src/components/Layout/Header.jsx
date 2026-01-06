import { Moon, Sun, Bell, Search, CheckCheck, User, LogOut, UserCircle2, KeyRound } from "lucide-react"
import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Dropdown } from "@/components/ui/Dropdown"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { useAuth } from "@/contexts/AuthContext"
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/utils/api"

export function Header({ onThemeToggle, isDark, searchQuery, onSearchChange }) {
  const { user, isAuthenticated, logout } = useAuth()
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Fetch notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications()
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      
      // Listen for refresh events (when items are added/updated)
      const handleRefresh = () => {
        fetchNotifications()
      }
      window.addEventListener('refreshNotifications', handleRefresh)
      
      return () => {
        clearInterval(interval)
        window.removeEventListener('refreshNotifications', handleRefresh)
      }
    }
  }, [isAuthenticated])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await getNotifications()
      if (response.success && response.data?.notifications) {
        setNotifications(response.data.notifications.map(n => ({
          id: n._id || n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          relatedId: n.relatedId,
          relatedType: n.relatedType,
          isRead: n.isRead,
          createdAt: n.createdAt,
          time: formatTime(n.createdAt)
        })))
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins} phút trước`
    if (diffHours < 24) return `${diffHours} giờ trước`
    if (diffDays < 7) return `${diffDays} ngày trước`
    
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead()
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      )
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id)
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        )
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }

    // Navigate based on notification type
    if (notification.type === 'expiring_soon' || notification.type === 'expired') {
      if (notification.relatedType === 'FridgeItem') {
        navigate('/fridge')
        // Close dropdown
        setIsNotificationOpen(false)
      }
    }
  }

  // Determine placeholder based on current page
  const getSearchPlaceholder = () => {
    if (location.pathname === "/fridge") return "Tìm kiếm thực phẩm..."
    if (location.pathname === "/recipes") return "Tìm kiếm món ăn..."
    if (location.pathname === "/shopping") return "Tìm kiếm danh sách..."
    return "Tìm kiếm..."
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={getSearchPlaceholder()}
            value={searchQuery || ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-10 w-64 rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="relative rounded-lg p-2 hover:bg-accent transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <Dropdown
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
            className="max-h-96 overflow-hidden"
          >
            <div className="p-2">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <h3 className="text-sm font-semibold">Thông báo</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="h-7 text-xs"
                  >
                    <CheckCheck className="mr-1 h-3 w-3" />
                    Đánh dấu tất cả
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Đang tải...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Không có thông báo
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`cursor-pointer border-b p-3 transition-colors hover:bg-accent ${
                        !notification.isRead ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                          !notification.isRead ? "bg-primary" : "bg-transparent"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${
                            !notification.isRead ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 break-words">
                            {notification.message}
                          </p>
                          {notification.time && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.time}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Dropdown>
        </div>
        <button
          onClick={onThemeToggle}
          className="rounded-lg p-2 hover:bg-accent transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* User avatar & menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                setIsUserMenuOpen((prev) => !prev)
              }
            }}
            className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.fullName || "User avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-primary">
                  {user?.fullName?.[0]?.toUpperCase() || "U"}
                </span>
              )}
            </div>
            <div className="hidden md:flex flex-col items-start text-left">
              <span className="text-sm font-medium leading-tight max-w-[140px] truncate">
                {user?.fullName || "User"}
              </span>
              <span className="text-xs text-muted-foreground max-w-[160px] truncate">
                {user?.email || ""}
              </span>
            </div>
          </button>

          <Dropdown
            isOpen={isUserMenuOpen}
            onClose={() => setIsUserMenuOpen(false)}
            className="w-56"
          >
            <div className="py-1">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                onClick={() => {
                  navigate("/profile")
                  setIsUserMenuOpen(false)
                }}
              >
                <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                <span>Profile</span>
              </button>

              <div className="my-1 border-t" />

              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                onClick={() => {
                  navigate("/change-password")
                  setIsUserMenuOpen(false)
                }}
              >
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <span>Change Password</span>
              </button>

              <div className="my-1 border-t" />

              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
                onClick={() => {
                  setIsUserMenuOpen(false)
                  setShowLogoutConfirm(true)
                }}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </Dropdown>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false)
          logout()
        }}
        title="Đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi Smart Grocery?"
        confirmText="Đăng xuất"
        cancelText="Hủy"
        variant="destructive"
      />
    </header>
  )
}

