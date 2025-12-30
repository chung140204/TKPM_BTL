// Mock notifications data

export const mockNotifications = [
  {
    id: "1",
    title: "Thực phẩm sắp hết hạn",
    message: "Cà chua sẽ hết hạn sau 2 ngày",
    time: "5 phút trước",
    isRead: false,
    type: "expiry_reminder",
  },
  {
    id: "2",
    title: "Danh sách mua sắm mới",
    message: "Bạn có danh sách mua sắm mới từ gia đình",
    time: "1 giờ trước",
    isRead: false,
    type: "shopping_list",
  },
  {
    id: "3",
    title: "Gợi ý món ăn",
    message: "Có 3 món ăn mới phù hợp với thực phẩm của bạn",
    time: "2 giờ trước",
    isRead: true,
    type: "recipe_suggestion",
  },
  {
    id: "4",
    title: "Thực phẩm đã hết hạn",
    message: "Cá hồi đã hết hạn và cần được xử lý",
    time: "3 giờ trước",
    isRead: false,
    type: "expired",
  },
  {
    id: "5",
    title: "Meal plan sắp bắt đầu",
    message: "Kế hoạch bữa ăn tuần này sẽ bắt đầu vào ngày mai",
    time: "1 ngày trước",
    isRead: true,
    type: "meal_plan",
  },
]

