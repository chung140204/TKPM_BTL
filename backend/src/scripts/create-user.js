/**
 * Create User Script
 * Tạo tài khoản user mới trong database
 * 
 * Chạy: node src/scripts/create-user.js
 * 
 * Hoặc với thông tin tùy chỉnh:
 * node src/scripts/create-user.js email password fullName
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const User = require('../models/User.model');

const createUser = async () => {
  try {
    // Kiểm tra MONGODB_URI
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ Lỗi: Không tìm thấy MONGODB_URI trong file .env');
      console.error('💡 Vui lòng kiểm tra file backend/.env có chứa MONGODB_URI không');
      console.error('💡 Nếu dùng MongoDB Atlas, hãy đảm bảo MONGODB_URI có dạng:');
      console.error('   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database');
      process.exit(1);
    }

    console.log('🔄 Đang kết nối MongoDB...');
    console.log(`   URI: ${mongoUri.replace(/:[^:@]+@/, ':****@')}`); // Ẩn password
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Kết nối MongoDB thành công');

    // Lấy thông tin từ command line arguments hoặc sử dụng giá trị mặc định
    const args = process.argv.slice(2);
    const email = args[0] || `user${Date.now()}@example.com`;
    const password = args[1] || 'user123';
    const fullName = args[2] || `Người dùng ${new Date().toLocaleDateString('vi-VN')}`;
    const phone = args[3] || null;

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ Email đã được sử dụng:', email);
      console.log('💡 Vui lòng sử dụng email khác');
      await mongoose.connection.close();
      process.exit(1);
    }

    // Tạo user mới
    console.log('👤 Đang tạo user mới...');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Full Name: ${fullName}`);
    if (phone) {
      console.log(`   Phone: ${phone}`);
    }

    const user = await User.create({
      email,
      password, // Password sẽ được hash tự động bởi User model
      fullName,
      phone: phone || null,
      role: 'user',
      isActive: true
    });

    console.log('✅ Đã tạo user thành công!');
    console.log('\n📋 Thông tin tài khoản:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Full Name: ${user.fullName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Phone: ${user.phone || 'Chưa có'}`);
    console.log(`   Active: ${user.isActive ? 'Có' : 'Không'}`);
    console.log(`   Created At: ${user.createdAt.toLocaleString('vi-VN')}`);
    
    console.log('\n🔑 Thông tin đăng nhập:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);

    await mongoose.connection.close();
    console.log('\n✅ Hoàn tất!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi tạo user:', error.message);
    
    // Xử lý các lỗi cụ thể
    if (error.name === 'MongooseServerSelectionError' || error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Lỗi kết nối MongoDB:');
      console.error('   1. Kiểm tra MongoDB Atlas có đang hoạt động không');
      console.error('   2. Kiểm tra Network Access trong MongoDB Atlas đã cho phép IP của bạn');
      console.error('   3. Kiểm tra MONGODB_URI trong file backend/.env có đúng không');
      console.error('   4. Nếu dùng MongoDB local, đảm bảo MongoDB service đang chạy');
    } else if (error.code === 11000) {
      console.error('💡 Email đã tồn tại trong database');
    } else if (error.name === 'ValidationError') {
      console.error('💡 Dữ liệu không hợp lệ:', error.message);
    }
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Chạy script
createUser();

