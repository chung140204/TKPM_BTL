import { useEffect, useState } from "react"
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react"
import { cn } from "@/lib/utils"

const TOAST_DURATION = 5000 // 5 seconds

export function Toast({ message, type = "info", isOpen, onClose, duration = TOAST_DURATION }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => {
          onClose?.()
        }, 300) // Wait for fade out animation
      }, duration)

      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [isOpen, duration, onClose])

  if (!isOpen) return null

  const icons = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
    warning: AlertTriangle,
  }

  const styles = {
    success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
    error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
    info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
    warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200",
  }

  const iconColors = {
    success: "text-green-600 dark:text-green-400",
    error: "text-red-600 dark:text-red-400",
    info: "text-blue-600 dark:text-blue-400",
    warning: "text-yellow-600 dark:text-yellow-400",
  }

  const Icon = icons[type] || Info

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <div
        className={cn(
          "pointer-events-auto rounded-lg border shadow-lg p-4 min-w-[320px] max-w-md",
          "animate-in slide-in-from-top-5 fade-in-0",
          isVisible ? "animate-in" : "animate-out fade-out-0 slide-out-to-top-5",
          styles[type]
        )}
      >
        <div className="flex items-start gap-3">
          <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", iconColors[type])} />
          <div className="flex-1">
            <p className="text-sm font-medium whitespace-pre-line leading-relaxed">{message}</p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false)
              setTimeout(() => onClose?.(), 300)
            }}
            className="flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Toast Provider Component
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = (message, type = "info", duration = TOAST_DURATION) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type, duration }])
    return id
  }

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  // Expose showToast globally
  useEffect(() => {
    window.showToast = showToast
    return () => {
      delete window.showToast
    }
  }, [])

  return (
    <>
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          isOpen={true}
          onClose={() => removeToast(toast.id)}
          duration={toast.duration}
        />
      ))}
    </>
  )
}

// Helper function to show toast
export function showToast(message, type = "info", duration = TOAST_DURATION) {
  if (typeof window !== "undefined" && window.showToast) {
    return window.showToast(message, type, duration)
  }
  // Fallback to alert if ToastProvider is not mounted
  alert(message)
}

