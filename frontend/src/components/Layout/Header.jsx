import { Moon, Sun, Bell, Search, CheckCheck } from "lucide-react"
import { useState } from "react"
import { useLocation } from "react-router-dom"
import { mockUser } from "@/data/mockData"
import { Dropdown } from "@/components/ui/Dropdown"
import { Button } from "@/components/ui/Button"
import { mockNotifications } from "@/data/mockNotifications"

export function Header({ onThemeToggle, isDark, searchQuery, onSearchChange }) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState(mockNotifications)
  const location = useLocation()

  const unreadCount = notifications.filter(n => !n.isRead).length

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true }))
    )
  }

  const handleNotificationClick = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    )
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
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Không có thông báo
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification.id)}
                      className={`cursor-pointer border-b p-3 transition-colors hover:bg-accent ${
                        !notification.isRead ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 h-2 w-2 rounded-full ${
                          !notification.isRead ? "bg-primary" : "bg-transparent"
                        }`} />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            !notification.isRead ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.time}
                          </p>
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
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-3">
          <img
            src={mockUser.avatar}
            alt={mockUser.name}
            className="h-8 w-8 rounded-full"
          />
          <div className="hidden md:block">
            <p className="text-sm font-medium">{mockUser.name}</p>
            <p className="text-xs text-muted-foreground">{mockUser.email}</p>
          </div>
        </div>
      </div>
    </header>
  )
}

