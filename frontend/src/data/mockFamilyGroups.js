// Mock family groups data for demo

export const mockFamilyGroups = [
  {
    id: "family-1",
    name: "Gia đình Nguyễn",
    members: ["Nguyễn Văn A", "Nguyễn Thị B", "Nguyễn Văn C"]
  },
  {
    id: "family-2",
    name: "Nhà trọ số 5",
    members: ["Trần Văn D", "Lê Thị E"]
  },
  {
    id: "family-3",
    name: "Phòng trọ chung",
    members: ["Phạm Văn F", "Hoàng Thị G", "Vũ Văn H"]
  },
]

// Get family group by ID
export function getFamilyGroupById(id) {
  return mockFamilyGroups.find(group => group.id === id) || null
}

