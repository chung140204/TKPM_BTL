import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { ShoppingCart, Loader2, Mail, Lock, Phone, User, Leaf } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { register as apiRegister } from "@/utils/api"
import { ROLES } from "@/utils/roles"
import { showToast } from "@/components/ui/Toast"

export function Register() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState(ROLES.USER)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  // Nếu đã đăng nhập thì chuyển về trang chủ
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/")
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp")
      setLoading(false)
      return
    }

    try {
      const response = await apiRegister(email, password, fullName, phone || undefined, role)

      if (response.success) {
        // Thông báo đăng ký thành công và chuyển về màn hình đăng nhập
        showToast("Đăng ký tài khoản thành công. Vui lòng đăng nhập bằng tài khoản vừa tạo.", "success")
        navigate("/login")
      } else {
        throw new Error(response.message || "Đăng ký thất bại")
      }
    } catch (err) {
      console.error("Register error:", err)
      setError(err.message || "Đăng ký thất bại. Vui lòng thử lại.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-5xl grid gap-8 md:grid-cols-2 items-center">
          {/* Left illustration / visual-first */}
          <div className="hidden md:flex flex-col justify-between h-full rounded-3xl bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-50 px-8 py-8 shadow-sm border border-emerald-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                <ShoppingCart className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-700">Smart Grocery</p>
                <p className="text-xs text-emerald-900/70">Bắt đầu quản lý thực phẩm thông minh</p>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-sm rounded-3xl bg-white/80 backdrop-blur shadow-lg border border-emerald-100 px-6 py-8">
                <div className="relative mx-auto h-64 w-64">
                  {/* Illustration similar style to Login */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100" />
                  <div className="absolute inset-4 rounded-3xl border border-emerald-100 bg-white/70 shadow-inner" />
                  <div className="absolute left-4 right-4 top-6 h-3 rounded-full bg-emerald-100" />
                  <div className="absolute left-6 top-10 h-8 w-3 rounded bg-emerald-200" />
                  <div className="absolute right-6 top-10 h-8 w-3 rounded bg-emerald-200" />
                  <div className="absolute inset-x-8 top-16 h-1 bg-emerald-100 rounded-full" />

                  <div className="absolute left-9 bottom-14 flex items-center gap-2">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center shadow-sm border border-emerald-200">
                      <User className="h-8 w-8 text-emerald-500" />
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center shadow-sm border border-emerald-200">
                      <Leaf className="h-7 w-7 text-emerald-500" />
                    </div>
                  </div>

                  <div className="absolute right-10 bottom-12 flex items-center gap-3">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center shadow-sm border border-emerald-200">
                      <ShoppingCart className="h-9 w-9 text-emerald-600" />
                    </div>
                  </div>

                  <div className="absolute left-1/2 -translate-x-1/2 bottom-6 h-2 w-24 rounded-full bg-emerald-100" />
                </div>
              </div>
            </div>
          </div>

          {/* Right register card */}
          <div className="w-full">
            <Card className="w-full shadow-xl rounded-3xl border border-emerald-100 bg-white/95 backdrop-blur">
              <CardHeader className="space-y-1">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
                      <ShoppingCart className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-slate-900">
                        Tạo tài khoản mới
                      </CardTitle>
                      <CardDescription className="text-sm text-slate-500">
                        Smart Grocery & Meal Planning System
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Họ và tên</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <User className="h-4 w-4" />
                      </span>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Nguyễn Văn A"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="pl-9 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 focus-visible:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Vai trò</Label>
                    <select
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 focus-visible:border-emerald-500"
                    >
                      <option value={ROLES.USER}>Người dùng</option>
                      <option value={ROLES.HOMEMAKER}>Nội trợ</option>
                    </select>
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
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-9 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 focus-visible:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mật khẩu</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Lock className="h-4 w-4" />
                      </span>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-9 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 focus-visible:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Lock className="h-4 w-4" />
                      </span>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="pl-9 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 focus-visible:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại (tuỳ chọn)</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Phone className="h-4 w-4" />
                      </span>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="0123 456 789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-9 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 focus-visible:border-emerald-500"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-150"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tạo tài khoản...
                      </>
                    ) : (
                      "Đăng ký"
                    )}
                  </Button>

                  <p className="mt-1 text-center text-sm text-muted-foreground">
                    Đã có tài khoản?{" "}
                    <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                      Đăng nhập
                    </Link>
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <footer className="w-full pb-4 text-center text-xs text-slate-400">
        © Smart Grocery System – TKPM
      </footer>
    </div>
  )
}


