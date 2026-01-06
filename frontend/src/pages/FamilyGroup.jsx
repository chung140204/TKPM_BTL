import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Badge } from "@/components/ui/Badge"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { showToast } from "@/components/ui/Toast"
import { useAuth } from "@/contexts/AuthContext"
import {
  getFamilyGroups,
  createFamilyGroup,
  updateFamilyGroup,
  addFamilyMember,
  updateFamilyMemberRole,
  removeFamilyMember,
  getFamilyInvites,
  acceptFamilyInvite,
  declineFamilyInvite,
  leaveFamilyGroup,
  transferFamilyOwner
} from "@/utils/api"
import { ROLES } from "@/utils/roles"
import { Users, UserPlus, Crown, Loader2, LogOut } from "lucide-react"

const roleLabels = {
  [ROLES.USER]: "Người dùng",
  [ROLES.HOMEMAKER]: "Nội trợ",
  [ROLES.ADMIN]: "Quản trị viên"
}

export function FamilyGroup() {
  const { user, updateUser } = useAuth()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [invitesLoading, setInvitesLoading] = useState(true)
  const [invites, setInvites] = useState([])
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [groupName, setGroupName] = useState("")
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmTransfer, setConfirmTransfer] = useState(null)

  const currentUserId = user?.id || user?._id

  const currentGroup = useMemo(() => {
    if (!groups.length) return null
    if (user?.familyGroupId) {
      return groups.find((group) => group._id === user.familyGroupId) || groups[0]
    }
    return groups[0]
  }, [groups, user?.familyGroupId])

  const isOwner = useMemo(() => {
    if (!currentGroup || !currentUserId) return false
    return currentGroup.members?.some(
      (member) =>
        (member.userId?._id || member.userId) === currentUserId &&
        member.role === "owner"
    )
  }, [currentGroup, currentUserId])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const response = await getFamilyGroups()
      const fetchedGroups = response.data?.familyGroups || []
      setGroups(fetchedGroups)

      if (!user?.familyGroupId && fetchedGroups.length > 0) {
        updateUser({ familyGroupId: fetchedGroups[0]._id })
      }

      if (fetchedGroups[0]?.name) {
        setGroupName(fetchedGroups[0].name)
      }
    } catch (error) {
      console.error("Family group error:", error)
      showToast(error.message || "Không thể tải nhóm gia đình", "error")
    } finally {
      setLoading(false)
    }
  }

  const loadInvites = async () => {
    try {
      setInvitesLoading(true)
      const response = await getFamilyInvites()
      setInvites(response.data?.invites || [])
    } catch (error) {
      console.error("Invite error:", error)
    } finally {
      setInvitesLoading(false)
    }
  }

  useEffect(() => {
    loadGroups()
    loadInvites()
  }, [])

  useEffect(() => {
    if (currentGroup?.name) {
      setGroupName(currentGroup.name)
    }
  }, [currentGroup?.name])

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      showToast("Vui lòng nhập tên nhóm", "warning")
      return
    }

    try {
      setCreating(true)
      const response = await createFamilyGroup({ name: groupName.trim() })
      showToast(response.message || "Tạo nhóm thành công", "success")
      const createdGroup = response.data?.familyGroup
      if (createdGroup?._id) {
        updateUser({ familyGroupId: createdGroup._id })
      }
      await loadGroups()
    } catch (error) {
      console.error("Create group error:", error)
      showToast(error.message || "Không thể tạo nhóm gia đình", "error")
    } finally {
      setCreating(false)
    }
  }

  const handleRenameGroup = async () => {
    if (!currentGroup) return
    if (!groupName.trim()) {
      showToast("Tên nhóm không được để trống", "warning")
      return
    }

    try {
      setRenaming(true)
      const response = await updateFamilyGroup(currentGroup._id, { name: groupName.trim() })
      showToast(response.message || "Cập nhật tên nhóm thành công", "success")
      await loadGroups()
    } catch (error) {
      console.error("Rename group error:", error)
      showToast(error.message || "Không thể cập nhật tên nhóm", "error")
    } finally {
      setRenaming(false)
    }
  }

  const handleInvite = async () => {
    if (!currentGroup) return
    if (!inviteEmail.trim()) {
      showToast("Vui lòng nhập email", "warning")
      return
    }

    try {
      setInviting(true)
      const response = await addFamilyMember(currentGroup._id, { email: inviteEmail.trim() })
      showToast(response.message || "Mời thành viên thành công", "success")
      setInviteEmail("")
      await loadGroups()
    } catch (error) {
      console.error("Invite error:", error)
      showToast(error.message || "Không thể mời thành viên", "error")
    } finally {
      setInviting(false)
    }
  }

  const handleAcceptInvite = async (inviteId) => {
    try {
      const response = await acceptFamilyInvite(inviteId)
      showToast(response.message || "Đã tham gia nhóm", "success")
      if (response.data?.familyGroupId) {
        updateUser({ familyGroupId: response.data.familyGroupId })
      }
      await loadGroups()
      await loadInvites()
    } catch (error) {
      console.error("Accept invite error:", error)
      showToast(error.message || "Không thể chấp nhận lời mời", "error")
    }
  }

  const handleDeclineInvite = async (inviteId) => {
    try {
      const response = await declineFamilyInvite(inviteId)
      showToast(response.message || "Đã từ chối lời mời", "success")
      await loadInvites()
    } catch (error) {
      console.error("Decline invite error:", error)
      showToast(error.message || "Không thể từ chối lời mời", "error")
    }
  }

  const handleUpdateMemberRole = async (memberId, role) => {
    if (!currentGroup) return
    try {
      await updateFamilyMemberRole(currentGroup._id, memberId, { role })
      showToast("Cập nhật vai trò thành công", "success")
      await loadGroups()
    } catch (error) {
      console.error("Update role error:", error)
      showToast(error.message || "Không thể cập nhật vai trò", "error")
    }
  }

  const handleRemoveMember = async () => {
    if (!currentGroup || !confirmRemove) return
    try {
      await removeFamilyMember(currentGroup._id, confirmRemove.userId)
      showToast("Xóa thành viên thành công", "success")
      setConfirmRemove(null)
      await loadGroups()
    } catch (error) {
      console.error("Remove member error:", error)
      showToast(error.message || "Không thể xóa thành viên", "error")
    }
  }

  const handleLeaveGroup = async () => {
    if (!currentGroup) return
    try {
      const response = await leaveFamilyGroup(currentGroup._id)
      showToast(response.message || "Đã rời nhóm", "success")
      setConfirmLeave(false)
      updateUser({ familyGroupId: null })
      await loadGroups()
      await loadInvites()
    } catch (error) {
      console.error("Leave group error:", error)
      showToast(error.message || "Không thể rời nhóm", "error")
    }
  }

  const handleTransferOwner = async () => {
    if (!currentGroup || !confirmTransfer) return
    try {
      const response = await transferFamilyOwner(currentGroup._id, confirmTransfer.userId)
      showToast(response.message || "Đã chuyển trưởng nhóm", "success")
      setConfirmTransfer(null)
      await loadGroups()
    } catch (error) {
      console.error("Transfer owner error:", error)
      showToast(error.message || "Không thể chuyển trưởng nhóm", "error")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Đang tải nhóm gia đình...
      </div>
    )
  }

  if (!currentGroup) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Nhóm gia đình</h1>
          <p className="text-muted-foreground">
            Bạn chưa thuộc nhóm nào. Tạo nhóm để chia sẻ tủ lạnh và thực đơn.
          </p>
        </div>

        {invitesLoading ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải lời mời...
          </div>
        ) : invites.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Lời mời tham gia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invites.map((invite) => (
                <div key={invite._id} className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold">{invite.familyGroupId?.name || "Nhóm gia đình"}</div>
                    <div className="text-sm text-muted-foreground">
                      Mời bởi: {invite.invitedBy?.fullName || invite.invitedBy?.email || "Không rõ"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAcceptInvite(invite._id)}>
                      Tham gia
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeclineInvite(invite._id)}>
                      Từ chối
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Tạo nhóm gia đình</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Tên nhóm</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ví dụ: Gia đình của mình"
              />
            </div>
            <Button onClick={handleCreateGroup} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                "Tạo nhóm"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Nhóm gia đình</h1>
          <p className="text-muted-foreground">
            Chia sẻ dữ liệu giữa các thành viên trong nhóm.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit gap-1">
          <Users className="h-4 w-4" />
          {currentGroup.members?.length || 0} thành viên
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin nhóm</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="groupName">Tên nhóm</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={!isOwner}
              />
            </div>
            {isOwner ? (
              <Button onClick={handleRenameGroup} disabled={renaming}>
                {renaming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu tên nhóm"
                )}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setConfirmLeave(true)} className="gap-2">
                <LogOut className="h-4 w-4" />
                Rời nhóm
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Tạo bởi: {currentGroup.createdBy?.fullName || "Không xác định"}
          </div>
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Mời thành viên</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="inviteEmail">Email thành viên</Label>
                <Input
                  id="inviteEmail"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <Button onClick={handleInvite} disabled={inviting} className="gap-2">
                <UserPlus className="h-4 w-4" />
                {inviting ? "Đang mời..." : "Gửi lời mời"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Thành viên nhóm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Thành viên</th>
                  <th className="px-4 py-3 text-left font-medium">Vai trò nhóm</th>
                  <th className="px-4 py-3 text-left font-medium">Vai trò hệ thống</th>
                  {isOwner && <th className="px-4 py-3 text-right font-medium">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {(currentGroup.members || []).map((member) => {
                  const memberUser = member.userId || {}
                  const memberId = memberUser._id || member.userId
                  const isMemberOwner = member.role === "owner"
                  return (
                    <tr key={memberId} className="border-t">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{memberUser.fullName || "Không tên"}</span>
                          {isMemberOwner && (
                            <Badge variant="warning" className="gap-1">
                              <Crown className="h-3 w-3" />
                              Trưởng nhóm
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{memberUser.email || ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        {isMemberOwner ? "Trưởng nhóm" : "Thành viên"}
                      </td>
                      <td className="px-4 py-3">
                        {isOwner && !isMemberOwner ? (
                          <select
                            value={memberUser.role || ROLES.USER}
                            onChange={(e) => handleUpdateMemberRole(memberId, e.target.value)}
                            className="rounded-md border border-input bg-background px-3 py-1 text-sm"
                          >
                            <option value={ROLES.USER}>Người dùng</option>
                            <option value={ROLES.HOMEMAKER}>Nội trợ</option>
                          </select>
                        ) : (
                          roleLabels[memberUser.role] || memberUser.role || "Người dùng"
                        )}
                      </td>
                      {isOwner && (
                      <td className="px-4 py-3 text-right">
                        {!isMemberOwner && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setConfirmTransfer({
                                  userId: memberId,
                                  name: memberUser.fullName || memberUser.email
                                })
                              }
                            >
                              Trao quyền
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                setConfirmRemove({
                                  userId: memberId,
                                  name: memberUser.fullName || memberUser.email
                                })
                              }
                            >
                              Xóa
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={Boolean(confirmRemove)}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleRemoveMember}
        title="Xóa thành viên"
        message={`Bạn có chắc muốn xóa ${confirmRemove?.name || "thành viên"} khỏi nhóm?`}
        confirmText="Xóa"
        cancelText="Hủy"
        variant="destructive"
      />

      <ConfirmDialog
        isOpen={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={handleLeaveGroup}
        title="Rời nhóm gia đình"
        message="Bạn có chắc chắn muốn rời nhóm? Dữ liệu cá nhân vẫn được giữ lại."
        confirmText="Rời nhóm"
        cancelText="Hủy"
        variant="destructive"
      />

      <ConfirmDialog
        isOpen={Boolean(confirmTransfer)}
        onClose={() => setConfirmTransfer(null)}
        onConfirm={handleTransferOwner}
        title="Trao quyền trưởng nhóm"
        message={`Bạn có chắc muốn trao quyền trưởng nhóm cho ${confirmTransfer?.name || "thành viên"}?`}
        confirmText="Trao quyền"
        cancelText="Hủy"
        variant="destructive"
      />
    </div>
  )
}
