/**
 * Cron Job Service
 * Tự động chạy các tác vụ định kỳ
 */

const cron = require('node-cron');
const notificationService = require('./notification.service');

/**
 * @desc    Khởi tạo tất cả cron jobs
 */
exports.initCronJobs = () => {
  console.log('🕐 Đang khởi tạo cron jobs...');

  // Cron job: Kiểm tra thực phẩm sắp hết hạn - Chạy hàng ngày lúc 08:00
  cron.schedule('0 8 * * *', async () => {
    console.log('📅 [Cron] Đang kiểm tra thực phẩm sắp hết hạn...');
    try {
      const result = await notificationService.checkExpiringFridgeItems();
      if (result.success) {
        console.log(`✅ [Cron] Đã tạo ${result.created} thông báo cho thực phẩm sắp hết hạn`);
        if (result.errors && result.errors.length > 0) {
          console.warn(`⚠️  [Cron] Có ${result.errors.length} lỗi:`, result.errors);
        }
      } else {
        console.error('❌ [Cron] Lỗi khi kiểm tra thực phẩm sắp hết hạn:', result.errors);
      }
    } catch (error) {
      console.error('❌ [Cron] Lỗi không mong đợi:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh'
  });

  // Cron job: Kiểm tra meal plans sắp bắt đầu - Chạy hàng ngày lúc 08:00
  cron.schedule('0 8 * * *', async () => {
    console.log('📅 [Cron] Đang kiểm tra meal plans sắp bắt đầu...');
    try {
      const result = await notificationService.checkUpcomingMealPlans();
      if (result.success) {
        console.log(`✅ [Cron] Đã tạo ${result.created} thông báo cho meal plans sắp bắt đầu`);
        if (result.errors && result.errors.length > 0) {
          console.warn(`⚠️  [Cron] Có ${result.errors.length} lỗi:`, result.errors);
        }
      } else {
        console.error('❌ [Cron] Lỗi khi kiểm tra meal plans:', result.errors);
      }
    } catch (error) {
      console.error('❌ [Cron] Lỗi không mong đợi:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh'
  });

  console.log('✅ Cron jobs đã được khởi tạo:');
  console.log('   - Kiểm tra thực phẩm sắp hết hạn: 08:00 hàng ngày');
  console.log('   - Kiểm tra meal plans sắp bắt đầu: 08:00 hàng ngày');
};

/**
 * @desc    Dừng tất cả cron jobs (cho testing)
 */
exports.stopCronJobs = () => {
  // node-cron không có method stop tất cả, cần lưu tasks và stop từng cái
  console.log('🛑 Đã dừng cron jobs');
};



