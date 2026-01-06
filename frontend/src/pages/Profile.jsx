import { useState, useRef, useEffect } from "react"
import { Camera, Mail, Phone, User as UserIcon } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { showToast } from "@/components/ui/Toast"

export function Profile() {
  const { user, updateUser } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName || "")
  const [email] = useState(user?.email || "")
  const [phone, setPhone] = useState(user?.phone || "")
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "")
  const [avatarFile, setAvatarFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setFullName(user?.fullName || "")
    setPhone(user?.phone || "")
    setAvatarPreview(user?.avatar || "")
  }, [user])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn file hình ảnh hợp lệ", "error")
      return
    }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      // In real app: call API to update profile + upload avatar
      // Here we update local auth state and show toast
      updateUser({
        fullName,
        phone,
        avatar: avatarPreview || user?.avatar || ""
      })

      showToast("Cập nhật thông tin tài khoản thành công", "success")
    } catch (error) {
      console.error("Error updating profile:", error)
      showToast("Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.", "error")
    } finally {
      setSaving(false)
    }
  }

  const initial = fullName?.[0]?.toUpperCase() || user?.fullName?.[0]?.toUpperCase() || "U"

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tài khoản của bạn</h1>
        <p className="text-sm text-muted-foreground">
          Xem và cập nhật thông tin cá nhân cho tài khoản Smart Grocery.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Hồ sơ cá nhân</CardTitle>
          <CardDescription>Thông tin được dùng để cá nhân hóa trải nghiệm của bạn.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <div className="relative">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="group relative flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-emerald-300 bg-emerald-50/60 overflow-hidden"
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-emerald-600">
                      {initial}
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Ảnh đại diện</p>
                <p>Nhấn vào vòng tròn để tải ảnh lên. Nên dùng ảnh vuông, rõ nét.</p>
                <p className="text-xs">Ảnh chỉ lưu cục bộ trong phiên bản demo.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    required
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="pl-9 bg-muted cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Phone className="h-4 w-4" />
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0123 456 789"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


