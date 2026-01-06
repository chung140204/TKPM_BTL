import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { ShoppingCart, Loader2, Mail, Lock, Leaf } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { login as apiLogin } from "@/utils/api"
import { ROLES } from "@/utils/roles"

export function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()

  const getDefaultRoute = (role) => (
    role === ROLES.ADMIN ? "/admin/stats" : "/"
  )

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(getDefaultRoute(user?.role))
    }
  }, [isAuthenticated, navigate, user?.role])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Try to login via API
      const response = await apiLogin(email, password)
      
      if (response.success && response.data) {
        // Save token
        if (response.data.token) {
          localStorage.setItem('authToken', response.data.token)
          localStorage.setItem('token', response.data.token) // Also save as 'token' for compatibility
        }
        
        // Update auth context with user info if available
        login(response.data.user)
        navigate(getDefaultRoute(response.data.user?.role))
      } else {
        throw new Error(response.message || 'Đăng nhập thất bại')
      }
    } catch (err) {
      console.error('Login error:', err)
      // Fallback to mock login if API fails
      if (err.message.includes('Failed to fetch') || err.message.includes('API Error')) {
        // API not available, use mock login with fallback user
        console.warn('API not available, using mock login')
        login({ fullName: 'Demo User', email, role: ROLES.USER })
        navigate(getDefaultRoute(ROLES.USER))
      } else {
        setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.')
      }
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
                <p className="text-xs text-emerald-900/70">Quản lý thực phẩm thông minh – Giảm lãng phí</p>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-sm rounded-3xl bg-white/80 backdrop-blur shadow-lg border border-emerald-100 px-6 py-8">
                <div className="relative mx-auto h-64 w-64">
                  {/* Illustration built from Lucide icons */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100" />
                  <div className="absolute inset-4 rounded-3xl border border-emerald-100 bg-white/70 shadow-inner" />
                  <div className="absolute left-4 right-4 top-6 h-3 rounded-full bg-emerald-100" />
                  <div className="absolute left-6 top-10 h-8 w-3 rounded bg-emerald-200" />
                  <div className="absolute right-6 top-10 h-8 w-3 rounded bg-emerald-200" />
                  <div className="absolute inset-x-8 top-16 h-1 bg-emerald-100 rounded-full" />

                  <div className="absolute left-10 bottom-14 flex items-center gap-2">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center shadow-sm border border-emerald-200">
                      <ShoppingCart className="h-8 w-8 text-emerald-500" />
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

          {/* Right login card */}
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
                        Đăng nhập hệ thống
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
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="remember"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <Label htmlFor="remember" className="text-sm font-normal cursor-pointer text-slate-600">
                        Ghi nhớ đăng nhập
                      </Label>
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
                        Đang đăng nhập...
                      </>
                    ) : (
                      "Đăng nhập"
                    )}
                  </Button>
                  <p className="mt-1 text-center text-sm text-muted-foreground">
                    Chưa có tài khoản?{" "}
                    <Link to="/register" className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                      Đăng ký
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

