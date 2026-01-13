/**
 * CSV Export Utility
 * Các hàm tiện ích để xuất dữ liệu ra CSV
 */

const { stringify } = require('csv-stringify/sync');

/**
 * Helper function để làm tròn số
 * @param {number} value - Giá trị cần làm tròn
 * @param {number} decimals - Số chữ số thập phân (mặc định: 2)
 * @returns {number} - Số đã được làm tròn
 */
const roundNumber = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 0;
  }
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Xuất dữ liệu thống kê mua sắm ra CSV
 */
exports.exportPurchaseStatistics = (data) => {
  const rows = [];
  
  // Header
  rows.push(['BÁO CÁO THỐNG KÊ MUA SẮM']);
  rows.push([]);
  rows.push(['Kỳ báo cáo', data.period || 'month']);
  rows.push(['Tổng số lượng (kg)', roundNumber(data.totalItems || 0)]);
  rows.push([]);
  
  // Top items
  if (data.topItems && data.topItems.length > 0) {
    rows.push(['TOP THỰC PHẨM MUA NHIỀU NHẤT']);
    rows.push(['Tên thực phẩm', 'Số lượng (kg)']);
    data.topItems.forEach(item => {
      rows.push([
        item.foodItemName || 'N/A',
        roundNumber(item.totalQuantity || 0)
      ]);
    });
    rows.push([]);
  }
  
  // By category
  if (data.byCategory && data.byCategory.length > 0) {
    rows.push(['PHÂN BỐ THEO DANH MỤC']);
    rows.push(['Danh mục', 'Số lượng (kg)']);
    data.byCategory.forEach(cat => {
      rows.push([
        cat.categoryName || 'Chưa phân loại',
        roundNumber(cat.totalQuantity || 0)
      ]);
    });
  }
  
  return stringify(rows, {
    bom: true, // UTF-8 BOM for Excel
    encoding: 'utf8'
  });
};

/**
 * Xuất dữ liệu thống kê lãng phí ra CSV
 */
exports.exportWasteStatistics = (data) => {
  const rows = [];
  
  rows.push(['BÁO CÁO THỐNG KÊ LÃNG PHÍ']);
  rows.push([]);
  rows.push(['Tổng số items lãng phí', data.totalWastedItems || 0]);
  rows.push(['Tổng số lượng lãng phí (kg)', roundNumber(data.totalWastedQuantity || 0)]);
  rows.push([]);
  
  // Top wasted items
  if (data.topWastedItems && data.topWastedItems.length > 0) {
    rows.push(['TOP THỰC PHẨM LÃNG PHÍ NHIỀU NHẤT']);
    rows.push(['Tên thực phẩm', 'Số lượng (kg)']);
    data.topWastedItems.forEach(item => {
      rows.push([
        item.foodItemName || 'N/A',
        roundNumber(item.totalQuantity || 0)
      ]);
    });
    rows.push([]);
  }
  
  // By category
  if (data.byCategory && data.byCategory.length > 0) {
    rows.push(['LÃNG PHÍ THEO DANH MỤC']);
    rows.push(['Danh mục', 'Số lượng (kg)']);
    data.byCategory.forEach(cat => {
      rows.push([
        cat.categoryName || 'Chưa phân loại',
        roundNumber(cat.totalQuantity || 0)
      ]);
    });
    rows.push([]);
  }
  
  // Trend
  if (data.trend && data.trend.length > 0) {
    rows.push(['XU HƯỚNG LÃNG PHÍ THEO THỜI GIAN']);
    rows.push(['Ngày', 'Số items', 'Số lượng (kg)']);
    data.trend.forEach(item => {
      rows.push([
        item.date || 'N/A',
        item.wastedItems || 0,
        roundNumber(item.totalQuantity || 0)
      ]);
    });
  }
  
  return stringify(rows, {
    bom: true,
    encoding: 'utf8'
  });
};

/**
 * Xuất dữ liệu thống kê tiêu thụ ra CSV
 */
exports.exportConsumptionStatistics = (data) => {
  const rows = [];
  
  rows.push(['BÁO CÁO THỐNG KÊ TIÊU THỤ']);
  rows.push([]);
  rows.push(['Tỷ lệ lãng phí (%)', roundNumber(data.wasteRate || 0, 2)]);
  rows.push([]);
  
  // Consumption trend
  if (data.consumptionTrend && data.consumptionTrend.length > 0) {
    rows.push(['XU HƯỚNG TIÊU THỤ THEO THỜI GIAN']);
    rows.push(['Ngày', 'Đã mua (kg)', 'Đã tiêu thụ (kg)', 'Đã lãng phí (kg)']);
    data.consumptionTrend.forEach(item => {
      rows.push([
        item.date || 'N/A',
        roundNumber(item.purchased || 0),
        roundNumber(item.used || 0),
        roundNumber(item.wasted || 0)
      ]);
    });
    rows.push([]);
  }
  
  // Top consumed items
  if (data.topConsumedItems && data.topConsumedItems.length > 0) {
    rows.push(['TOP THỰC PHẨM TIÊU THỤ NHIỀU NHẤT']);
    rows.push(['Tên thực phẩm', 'Số lần sử dụng', 'Tổng số lượng (kg)']);
    data.topConsumedItems.forEach(item => {
      rows.push([
        item.foodItemName || 'N/A',
        item.timesUsed || 0,
        roundNumber(item.totalQuantity || 0)
      ]);
    });
  }
  
  return stringify(rows, {
    bom: true,
    encoding: 'utf8'
  });
};

/**
 * Xuất dữ liệu dashboard tổng quan ra CSV
 */
exports.exportDashboardOverview = (data) => {
  const rows = [];
  
  rows.push(['BÁO CÁO TỔNG QUAN DASHBOARD']);
  rows.push([]);
  rows.push(['Tổng số thực phẩm trong tủ lạnh', data.totalFridgeItems || 0]);
  rows.push(['Số thực phẩm sắp hết hạn', data.expiringSoon || 0]);
  rows.push(['Số danh sách mua sắm', data.shoppingListCount || 0]);
  rows.push(['Giảm lãng phí (%)', roundNumber(data.wasteReduction || 0, 2)]);
  rows.push([]);
  
  // Waste data by month
  if (data.wasteData && data.wasteData.length > 0) {
    rows.push(['LÃNG PHÍ THEO THÁNG (6 THÁNG GẦN NHẤT)']);
    rows.push(['Tháng', 'Lãng phí (kg)']);
    data.wasteData.forEach(item => {
      rows.push([
        item.month || 'N/A',
        roundNumber(item.waste || 0)
      ]);
    });
    rows.push([]);
  }
  
  // Category distribution
  if (data.categoryData && data.categoryData.length > 0) {
    rows.push(['PHÂN BỐ THEO DANH MỤC']);
    rows.push(['Danh mục', 'Số lượng (kg)', 'Tỷ lệ (%)']);
    data.categoryData.forEach(item => {
      rows.push([
        item.name || 'Chưa phân loại',
        roundNumber(item.value || 0),
        roundNumber(item.percentage || 0, 2)
      ]);
    });
  }
  
  return stringify(rows, {
    bom: true,
    encoding: 'utf8'
  });
};
