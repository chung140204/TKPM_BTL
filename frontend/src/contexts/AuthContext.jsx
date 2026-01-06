import { createContext, useContext, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token")
    const isAuth = localStorage.getItem("isAuthenticated") === "true"
    return !!(token && isAuth)
  })

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("userProfile")
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return null
      }
    }
    return null
  })

  const navigate = useNavigate()

  // Keep auth state in sync with token on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token")
    const isAuth = localStorage.getItem("isAuthenticated") === "true"

    if (!token && isAuth) {
      setIsAuthenticated(false)
      localStorage.removeItem("isAuthenticated")
      setUser(null)
      localStorage.removeItem("userProfile")
    }
  }, [])

  const login = (userData) => {
    setIsAuthenticated(true)
    localStorage.setItem("isAuthenticated", "true")

    if (userData) {
      setUser(userData)
      localStorage.setItem("userProfile", JSON.stringify(userData))
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("authToken")
    localStorage.removeItem("token")
    localStorage.removeItem("theme")
    localStorage.removeItem("userProfile")
    navigate("/login")
  }

  const updateUser = (partial) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...partial }
      localStorage.setItem("userProfile", JSON.stringify(next))
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}

