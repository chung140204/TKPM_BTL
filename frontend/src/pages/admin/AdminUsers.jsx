import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { showToast } from "@/components/ui/Toast"
import { getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } from "@/utils/api"
import { ROLES } from "@/utils/roles"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"

const roleLabels = {
  [ROLES.USER]: "Người dùng",
  [ROLES.HOMEMAKER]: "Nội trợ",
  [ROLES.ADMIN]: "Quản trị viên"
}

const emptyUserForm = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  role: ROLES.USER,
  isActive: true
}

export function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userForm, setUserForm] = useState(emptyUserForm)
  const [userSubmitting, setUserSubmitting] = useState(false)
  const [confirmUserDelete, setConfirmUserDelete] = useState(null)

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await getAdminUsers()
      if (response.success) {
        setUsers(response.data?.users || [])
      }
    } catch (error) {
      console.error("Admin users error:", error)
      showToast(error.message || "Không thể tải danh sách user", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const openCreateUser = () => {
    setEditingUser(null)
    setUserForm(emptyUserForm)
    setUserDialogOpen(true)
  }

  const openEditUser = (user) => {
    setEditingUser(user)
    setUserForm({
      fullName: user.fullName || "",
      email: user.email || "",
      password: "",
      phone: user.phone || "",
      role: user.role || ROLES.USER,
      isActive: user.isActive !== false
    })
    setUserDialogOpen(true)
  }

  const handleUserSubmit = async (event) => {
    event.preventDefault()
    setUserSubmitting(true)

    try {
      if (editingUser) {
        const payload = {
          fullName: userForm.fullName,
          phone: userForm.phone,
          role: userForm.role,
          isActive: userForm.isActive
        }
        await updateAdminUser(editingUser._id, payload)
        showToast("Cập nhật user thành công", "success")
      } else {
        if (!userForm.email || !userForm.password) {
          showToast("Vui lòng nhập email và mật khẩu", "warning")
          setUserSubmitting(false)
          return
        }
        await createAdminUser({
          fullName: userForm.fullName,
          email: userForm.email,
          password: userForm.password,
          phone: userForm.phone || undefined,
          role: userForm.role
        })
        showToast("Tạo user thành công", "success")
      }

      setUserDialogOpen(false)
      await loadUsers()
    } catch (error) {
      console.error("User submit error:", error)
      showToast(error.message || "Không thể lưu user", "error")
    } finally {
      setUserSubmitting(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!confirmUserDelete) return
    try {
      await deleteAdminUser(confirmUserDelete._id)
      showToast("Xóa user thành công", "success")
      setConfirmUserDelete(null)
      await loadUsers()
    } catch (error) {
      console.error("Delete user error:", error)
      showToast(error.message || "Không thể xóa user", "error")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Quản trị người dùng</h1>
        <p className="text-muted-foreground">Quản lý tài khoản, vai trò và trạng thái hoạt động.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Danh sách người dùng</CardTitle>
          <Button onClick={openCreateUser} className="gap-2">
            <Plus className="h-4 w-4" />
            Thêm user
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Họ tên</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Vai trò</th>
                  <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                      Chưa có người dùng nào.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="border-t">
                      <td className="px-4 py-3">{user.fullName}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{roleLabels[user.role] || user.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {user.isActive ? (
                          <Badge variant="success">Hoạt động</Badge>
                        ) : (
                          <Badge variant="danger">Bị khóa</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditUser(user)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setConfirmUserDelete(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        isOpen={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        title={editingUser ? "Cập nhật người dùng" : "Tạo người dùng mới"}
      >
        <form className="space-y-4" onSubmit={handleUserSubmit}>
          <div className="space-y-2">
            <Label htmlFor="userFullName">Họ tên</Label>
            <Input
              id="userFullName"
              value={userForm.fullName}
              onChange={(e) => setUserForm((prev) => ({ ...prev, fullName: e.target.value }))}
              required
            />
          </div>

          {!editingUser && (
            <>
              <div className="space-y-2">
                <Label htmlFor="userEmail">Email</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userPassword">Mật khẩu</Label>
                <Input
                  id="userPassword"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="userPhone">Số điện thoại</Label>
            <Input
              id="userPhone"
              value={userForm.phone}
              onChange={(e) => setUserForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="userRole">Vai trò</Label>
            <select
              id="userRole"
              value={userForm.role}
              onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value={ROLES.USER}>Người dùng</option>
              <option value={ROLES.HOMEMAKER}>Nội trợ</option>
              <option value={ROLES.ADMIN}>Quản trị viên</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="userActive"
              type="checkbox"
              checked={userForm.isActive}
              onChange={(e) => setUserForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            <Label htmlFor="userActive">Tài khoản đang hoạt động</Label>
          </div>

          <Button type="submit" className="w-full" disabled={userSubmitting}>
            {userSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : editingUser ? "Cập nhật" : "Tạo user"}
          </Button>
        </form>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(confirmUserDelete)}
        onClose={() => setConfirmUserDelete(null)}
        onConfirm={handleDeleteUser}
        title="Xóa người dùng"
        message={`Bạn có chắc muốn xóa ${confirmUserDelete?.fullName || "user"}?`}
        confirmText="Xóa"
        cancelText="Hủy"
        variant="destructive"
      />
    </div>
  )
}
