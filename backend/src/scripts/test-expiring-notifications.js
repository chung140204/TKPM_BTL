/**
 * Test Script for Expiring Food Notifications
 * Chạy thủ công để test cron job và notification creation
 * 
 * Usage: node src/scripts/test-expiring-notifications.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const notificationService = require('../services/notification.service');
const FridgeItem = require('../models/FridgeItem.model');
const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const FoodItem = require('../models/FoodItem.model');
const Unit = require('../models/Unit.model');
const Category = require('../models/Category.model');

async function testExpiringNotifications() {
  try {
    console.log('🔗 Đang kết nối MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery_shopping', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Đã kết nối MongoDB\n');

    // 1. Lấy hoặc tạo test user
    let testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      console.log('📝 Tạo test user...');
      testUser = await User.create({
        email: 'test@example.com',
        password: 'test123456',
        fullName: 'Test User',
        role: 'user'
      });
      console.log('✅ Đã tạo test user:', testUser.email);
    } else {
      console.log('✅ Sử dụng test user:', testUser.email);
    }

    // 2. Lấy hoặc tạo Category, Unit, FoodItem
    let category = await Category.findOne({ name: 'Rau củ' });
    if (!category) {
      category = await Category.create({ name: 'Rau củ', description: 'Test category' });
    }

    let unit = await Unit.findOne({ name: 'kg' });
    if (!unit) {
      unit = await Unit.create({ name: 'kilogram', abbreviation: 'kg', type: 'weight' });
    }

    let foodItem = await FoodItem.findOne({ name: 'Cà chua' });
    if (!foodItem) {
      foodItem = await FoodItem.create({
        name: 'Cà chua',
        categoryId: category._id,
        defaultUnit: unit._id,
        createdBy: testUser._id
      });
    }

    console.log('\n📦 Tạo test FridgeItems với các expiryDate khác nhau...\n');

    const now = new Date();
    // Use start of today for consistency
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    
    // Item 1: Expiring today (0 days) - end of today
    const today = new Date(startOfToday);
    today.setHours(23, 59, 59, 999);
    
    // Item 2: Expiring in 1 day - end of tomorrow
    const tomorrow = new Date(startOfToday);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    
    // Item 3: Expiring in 2 days - end of day after tomorrow
    const dayAfterTomorrow = new Date(startOfToday);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    dayAfterTomorrow.setHours(23, 59, 59, 999);
    
    // Item 4: Expiring in 3 days - end of 3 days later
    const threeDaysLater = new Date(startOfToday);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    threeDaysLater.setHours(23, 59, 59, 999);
    
    // Item 5: Already expired (yesterday) - start of yesterday
    const yesterday = new Date(startOfToday);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    console.log('📅 Debug expiryDate:');
    console.log(`   - Today: ${today.toLocaleString('vi-VN')}`);
    console.log(`   - Tomorrow: ${tomorrow.toLocaleString('vi-VN')}`);
    console.log(`   - DayAfterTomorrow: ${dayAfterTomorrow.toLocaleString('vi-VN')}`);
    console.log(`   - ThreeDaysLater: ${threeDaysLater.toLocaleString('vi-VN')}`);
    console.log(`   - Yesterday: ${yesterday.toLocaleString('vi-VN')}\n`);

    // Xóa các test items cũ
    await FridgeItem.deleteMany({ 
      userId: testUser._id,
      foodItemId: foodItem._id 
    });

    // Tạo test items
    const testItems = [
      {
        userId: testUser._id,
        foodItemId: foodItem._id,
        unitId: unit._id,
        quantity: 1,
        expiryDate: today,
        status: 'available',
        purchaseDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        userId: testUser._id,
        foodItemId: foodItem._id,
        unitId: unit._id,
        quantity: 1,
        expiryDate: tomorrow,
        status: 'available',
        purchaseDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        userId: testUser._id,
        foodItemId: foodItem._id,
        unitId: unit._id,
        quantity: 1,
        expiryDate: dayAfterTomorrow,
        status: 'available',
        purchaseDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        userId: testUser._id,
        foodItemId: foodItem._id,
        unitId: unit._id,
        quantity: 1,
        expiryDate: threeDaysLater,
        status: 'available',
        purchaseDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        userId: testUser._id,
        foodItemId: foodItem._id,
        unitId: unit._id,
        quantity: 1,
        expiryDate: yesterday,
        status: 'available',
        purchaseDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      }
    ];

    const createdItems = await FridgeItem.insertMany(testItems);
    console.log('✅ Đã tạo 5 test FridgeItems:');
    createdItems.forEach((item, index) => {
      const daysLeft = item.getDaysLeft();
      console.log(`   ${index + 1}. Expiry: ${item.expiryDate.toLocaleDateString('vi-VN')} (${daysLeft} ngày còn lại)`);
    });

    // 3. Xóa notifications cũ của test user
    await Notification.deleteMany({ userId: testUser._id });
    console.log('\n🧹 Đã xóa notifications cũ\n');

    // 4. Debug: Kiểm tra items trước khi chạy check
    console.log('\n🔍 Debug: Kiểm tra items trước khi chạy check...');
    const itemsBeforeCheck = await FridgeItem.find({ userId: testUser._id })
      .populate('foodItemId', 'name')
      .populate('userId', 'email');
    
    itemsBeforeCheck.forEach(item => {
      const daysLeft = item.getDaysLeft();
      console.log(`   - ${item.foodItemId.name}: expiryDate=${item.expiryDate.toLocaleDateString('vi-VN')}, status=${item.status}, daysLeft=${daysLeft}`);
    });

    // 5. Chạy checkExpiringFridgeItems
    console.log('\n🔄 Đang chạy checkExpiringFridgeItems()...\n');
    const result = await notificationService.checkExpiringFridgeItems();

    console.log('📊 Kết quả:');
    console.log(`   - Success: ${result.success}`);
    console.log(`   - Created notifications: ${result.created}`);
    if (result.errors && result.errors.length > 0) {
      console.log(`   - Errors: ${result.errors.length}`);
      result.errors.forEach(err => console.log(`     * ${JSON.stringify(err)}`));
    }
    
    // Debug: Kiểm tra tại sao không tạo notification
    if (result.created === 0) {
      console.log('\n⚠️  Không có notification nào được tạo. Đang kiểm tra...');
      const allExpiringItems = await FridgeItem.find({
        status: 'expiring_soon',
        quantity: { $gt: 0 }
      })
        .populate('foodItemId', 'name')
        .populate('userId', 'email');
      
      console.log(`   - Tìm thấy ${allExpiringItems.length} items với status 'expiring_soon'`);
      
      for (const item of allExpiringItems) {
        const daysLeft = item.getDaysLeft();
        console.log(`   - Item: ${item.foodItemId?.name || 'Unknown'}, daysLeft=${daysLeft}, userId=${item.userId?._id || item.userId}`);
        
        if (daysLeft < 0 || daysLeft > 3) {
          console.log(`     ⚠️  Bỏ qua vì daysLeft=${daysLeft} (không trong khoảng 0-3)`);
        }
        
        const existingNotif = await Notification.findOne({
          userId: item.userId?._id || item.userId,
          type: 'expiring_soon',
          relatedId: item._id,
          relatedType: 'FridgeItem'
        });
        
        if (existingNotif) {
          console.log(`     ⚠️  Đã có notification rồi: ${existingNotif._id}`);
        }
      }
    }

    // 5. Kiểm tra status của items
    console.log('\n📋 Kiểm tra status của FridgeItems:');
    const updatedItems = await FridgeItem.find({ userId: testUser._id }).populate('foodItemId', 'name');
    updatedItems.forEach(item => {
      const daysLeft = item.getDaysLeft();
      console.log(`   - ${item.foodItemId.name}: status=${item.status}, daysLeft=${daysLeft}`);
    });

    // 6. Kiểm tra notifications đã tạo
    console.log('\n🔔 Kiểm tra Notifications đã tạo:');
    const notifications = await Notification.find({ userId: testUser._id })
      .sort({ createdAt: -1 });
    
    if (notifications.length === 0) {
      console.log('   ⚠️  Không có notification nào được tạo');
    } else {
      notifications.forEach((notif, index) => {
        console.log(`   ${index + 1}. [${notif.type}] ${notif.title}`);
        console.log(`      Message: ${notif.message}`);
        console.log(`      RelatedId: ${notif.relatedId}`);
        console.log(`      IsRead: ${notif.isRead}`);
        console.log(`      Created: ${notif.createdAt.toLocaleString('vi-VN')}`);
        console.log('');
      });
    }

    // 7. Test duplicate prevention
    console.log('🔄 Chạy lại checkExpiringFridgeItems() để test duplicate prevention...\n');
    const result2 = await notificationService.checkExpiringFridgeItems();
    console.log(`   - Created notifications lần 2: ${result2.created}`);
    if (result2.created === 0) {
      console.log('   ✅ Duplicate prevention hoạt động đúng!');
    } else {
      console.log('   ⚠️  Có thể có duplicate notifications');
    }

    console.log('\n✅ Test hoàn tất!');
    console.log('\n💡 Để xem trong frontend:');
    console.log(`   1. Đăng nhập với email: ${testUser.email}`);
    console.log('   2. Click vào icon notification (bell) ở header');
    console.log('   3. Click vào notification để navigate đến /fridge');

  } catch (error) {
    console.error('❌ Lỗi:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Đã đóng kết nối MongoDB');
  }
}

// Chạy test
if (require.main === module) {
  testExpiringNotifications()
    .then(() => {
      console.log('\n✨ Test script hoàn thành!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script thất bại:', error);
      process.exit(1);
    });
}

module.exports = testExpiringNotifications;

