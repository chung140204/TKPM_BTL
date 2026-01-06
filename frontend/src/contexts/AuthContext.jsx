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
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("viewMode") || "personal"
  })

  const navigate = useNavigate()

  useEffect(() => {
    if (user && !user.familyGroupId && viewMode === "family") {
      setViewMode("personal")
      localStorage.setItem("viewMode", "personal")
    }
  }, [user, viewMode])

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

    const hasFamily = !!userData?.familyGroupId
    const storedView = localStorage.getItem("viewMode")
    const nextView = hasFamily && storedView === "family" ? "family" : "personal"
    setViewMode(nextView)
    localStorage.setItem("viewMode", nextView)
  }

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("authToken")
    localStorage.removeItem("token")
    localStorage.removeItem("theme")
    localStorage.removeItem("userProfile")
    localStorage.removeItem("viewMode")
    setViewMode("personal")
    navigate("/login")
  }

  const updateUser = (partial) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...partial }
      localStorage.setItem("userProfile", JSON.stringify(next))
      const hasFamily = !!next?.familyGroupId
      if (!hasFamily) {
        setViewMode("personal")
        localStorage.setItem("viewMode", "personal")
      }
      return next
    })
  }

  const setView = (nextView) => {
    const normalized = nextView === "family" && user?.familyGroupId ? "family" : "personal"
    setViewMode(normalized)
    localStorage.setItem("viewMode", normalized)
    window.location.reload()
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, updateUser, viewMode, setView }}>
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
