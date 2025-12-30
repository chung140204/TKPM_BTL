import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { MainLayout } from "@/components/Layout/MainLayout"
import { Login } from "@/pages/Login"
import { Dashboard } from "@/pages/Dashboard"
import { Fridge } from "@/pages/Fridge"
import { Recipes } from "@/pages/Recipes"
import { Shopping } from "@/pages/Shopping"
import { Statistics } from "@/pages/Statistics"
import { MealPlanner } from "@/pages/MealPlanner"

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fridge"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Fridge />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipes"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Recipes />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/shopping"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Shopping />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/statistics"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Statistics />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/meal-planner"
        element={
          <ProtectedRoute>
            <MainLayout>
              <MealPlanner />
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

