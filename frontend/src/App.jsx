import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { ToastProvider } from "@/components/ui/Toast"
import { MainLayout } from "@/components/Layout/MainLayout"
import { Login } from "@/pages/Login"
import { Register } from "@/pages/Register"
import { Dashboard } from "@/pages/Dashboard"
import { Fridge } from "@/pages/Fridge"
import { Recipes } from "@/pages/Recipes"
import { Shopping } from "@/pages/Shopping"
import { Statistics } from "@/pages/Statistics"
import { MealPlanner } from "@/pages/MealPlanner"
import { Profile } from "@/pages/Profile"
import { ChangePassword } from "@/pages/ChangePassword"
import { FamilyGroup } from "@/pages/FamilyGroup"
import { AdminStats } from "@/pages/admin/AdminStats"
import { AdminUsers } from "@/pages/admin/AdminUsers"
import { AdminRecipes } from "@/pages/admin/AdminRecipes"
import { ROLES } from "@/utils/roles"

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" />
}

function RoleRoute({ allowedRoles, redirectTo = "/", children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (!allowedRoles.includes(user.role)) return <Navigate to={redirectTo} />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.USER, ROLES.HOMEMAKER]} redirectTo="/admin/stats">
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Profile />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ChangePassword />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fridge"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.USER, ROLES.HOMEMAKER]} redirectTo="/admin/stats">
              <MainLayout>
                <Fridge />
              </MainLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipes"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.USER, ROLES.HOMEMAKER]} redirectTo="/admin/stats">
              <MainLayout>
                <Recipes />
              </MainLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/shopping"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.USER, ROLES.HOMEMAKER]} redirectTo="/admin/stats">
              <MainLayout>
                <Shopping />
              </MainLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family-groups"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.USER, ROLES.HOMEMAKER]} redirectTo="/admin/stats">
              <MainLayout>
                <FamilyGroup />
              </MainLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/statistics"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.USER, ROLES.HOMEMAKER]} redirectTo="/admin/stats">
              <MainLayout>
                <Statistics />
              </MainLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/meal-planner"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.HOMEMAKER]} redirectTo="/admin/stats">
              <MainLayout>
                <MealPlanner />
              </MainLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route path="/admin" element={<Navigate to="/admin/stats" replace />} />
      <Route
        path="/admin/stats"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.ADMIN]} redirectTo="/">
              <MainLayout>
                <AdminStats />
              </MainLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.ADMIN]} redirectTo="/">
              <MainLayout>
                <AdminUsers />
              </MainLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/recipes"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.ADMIN]} redirectTo="/">
              <MainLayout>
                <AdminRecipes />
              </MainLayout>
            </RoleRoute>
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
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
