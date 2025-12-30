// Preservation tips mapping by category
export const preservationTips = {
  "Rau củ": "Bảo quản ngăn mát 2–4°C, để trong túi hoặc hộp kín",
  "Thịt cá": "Bảo quản ngăn đông -18°C hoặc ngăn mát 0–4°C, đóng gói kín",
  "Trái cây": "Ngăn mát hoặc nhiệt độ phòng tùy loại, tránh ánh nắng trực tiếp",
  "Đồ uống": "Ngăn mát, tránh ánh nắng, đậy kín sau khi mở",
  "Khác": "Bảo quản theo hướng dẫn nhà sản xuất, kiểm tra nhãn mác",
}

// Get preservation tip for a category
export function getPreservationTip(category) {
  return preservationTips[category] || preservationTips["Khác"]
}

