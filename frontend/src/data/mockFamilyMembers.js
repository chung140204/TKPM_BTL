// Mock family members for demo real-time updates

export const mockFamilyMembers = [
  { id: "member-1", name: "Nguyễn Văn A", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user1" },
  { id: "member-2", name: "Nguyễn Thị B", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user2" },
  { id: "member-3", name: "Trần Văn D", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user3" },
  { id: "member-4", name: "Lê Thị E", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user4" },
]

// Get random member for demo
export function getRandomMember() {
  return mockFamilyMembers[Math.floor(Math.random() * mockFamilyMembers.length)]
}

