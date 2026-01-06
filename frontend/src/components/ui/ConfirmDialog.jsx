import { useEffect } from "react"
import { Button } from "./Button"
import { AlertTriangle } from "lucide-react"

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  variant = "default",
  loading = false
}) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && !loading) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose, loading])

  const handleConfirm = () => {
    if (!loading) {
      onConfirm()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 animate-in fade-in-0"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="relative z-50 w-full max-w-md rounded-xl border bg-card shadow-lg animate-in fade-in-0 zoom-in-95">
        <div className="p-6 space-y-4">
          {/* Icon and Title */}
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 rounded-full p-3 ${
              variant === "destructive" 
                ? "bg-red-100 dark:bg-red-900/20" 
                : "bg-blue-100 dark:bg-blue-900/20"
            }`}>
              <AlertTriangle className={`h-6 w-6 ${
                variant === "destructive" 
                  ? "text-red-600 dark:text-red-400" 
                  : "text-blue-600 dark:text-blue-400"
              }`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2 leading-tight">{title}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              variant={variant === "destructive" ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={loading}
              className={variant === "destructive" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
            >
              {loading ? "Đang xử lý..." : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

