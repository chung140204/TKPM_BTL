import { useState, useEffect, createContext, useContext } from "react"
import { useLocation } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

const SearchContext = createContext(null)

export function useSearch() {
  return useContext(SearchContext)
}

export function MainLayout({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme")
    return saved ? saved === "dark" : false
  })
  const [searchQuery, setSearchQuery] = useState("")
  const location = useLocation()

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [isDark])

  // Clear search when navigating to different pages
  useEffect(() => {
    setSearchQuery("")
  }, [location.pathname])

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  return (
    <SearchContext.Provider value={searchQuery}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            onThemeToggle={toggleTheme}
            isDark={isDark}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <main className="flex-1 overflow-y-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SearchContext.Provider>
  )
}

