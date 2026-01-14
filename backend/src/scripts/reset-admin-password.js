/**
 * Reset Admin Password Script
 * Reset password cho admin user hoặc tạo mới nếu chưa tồn tại
 * 
 * Chạy: node src/scripts/reset-admin-password.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');

const resetAdminPassword = async () => {
  try {
    console.log('🔄 Đang kết nối MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('✅ Kết nối MongoDB thành công');

    const adminEmail = 'admin@grocery.com';
    const adminPassword = 'password123'; // Password mới

    // Tìm admin user
    let adminUser = await User.findOne({ email: adminEmail });

    if (adminUser) {
      console.log('👤 Tìm thấy admin user, đang reset password...');
      // Update password (sẽ được hash tự động bởi pre-save hook)
      adminUser.password = adminPassword;
      adminUser.isActive = true;
      adminUser.role = 'admin';
      await adminUser.save();
      console.log('✅ Đã reset password cho admin user');
    } else {
      console.log('👤 Không tìm thấy admin user, đang tạo mới...');
      // Tạo admin user mới
      adminUser = await User.create({
        email: adminEmail,
        password: adminPassword, // Sẽ được hash tự động
        fullName: 'Quản trị viên',
        role: 'admin',
        isActive: true
      });
      console.log('✅ Đã tạo admin user mới');
    }

    console.log('\n📝 Thông tin đăng nhập:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n✅ Hoàn tất!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
};

// Chạy script
resetAdminPassword();

