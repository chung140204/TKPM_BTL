import { createContext, useContext, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if token exists and is valid
    const token = localStorage.getItem("authToken") || localStorage.getItem("token")
    const isAuth = localStorage.getItem("isAuthenticated") === "true"
    return !!(token && isAuth)
  })
  const navigate = useNavigate()

  // Check token validity on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token")
    const isAuth = localStorage.getItem("isAuthenticated") === "true"
    
    // If no token but marked as authenticated, clear auth state
    if (!token && isAuth) {
      setIsAuthenticated(false)
      localStorage.removeItem("isAuthenticated")
    }
  }, [])

  const login = () => {
    setIsAuthenticated(true)
    localStorage.setItem("isAuthenticated", "true")
  }

  const logout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("authToken")
    localStorage.removeItem("token")
    localStorage.removeItem("theme") // Optional: clear theme preference
    navigate("/login")
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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

