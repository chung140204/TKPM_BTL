/**
 * Seed Data Script
 * Khởi tạo dữ liệu mẫu cho database
 * 
 * Chạy: node src/scripts/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User.model');
const Category = require('../models/Category.model');
const Unit = require('../models/Unit.model');
const FoodItem = require('../models/FoodItem.model');
const Recipe = require('../models/Recipe.model');

const seedData = async () => {
  try {
    console.log('🔄 Đang kết nối MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery_shopping');
    console.log('✅ Kết nối MongoDB thành công');

    // Xóa dữ liệu cũ (optional - chỉ dùng cho development)
    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️  Đang xóa dữ liệu cũ...');
      await User.deleteMany({});
      await Category.deleteMany({});
      await Unit.deleteMany({});
      await FoodItem.deleteMany({});
      await Recipe.deleteMany({});
      console.log('✅ Đã xóa dữ liệu cũ');
    }

    // 1. Tạo Admin User
    console.log('👤 Đang tạo Admin user...');
    // Không hash password ở đây, để User model tự hash trong pre-save hook
    const adminUser = await User.create({
      email: 'admin@grocery.com',
      password: 'admin123', // Password plain text, sẽ được hash tự động
      fullName: 'Quản trị viên',
      role: 'admin',
      isActive: true
    });
    console.log('✅ Đã tạo Admin user:', adminUser.email);

    // 2. Tạo Test User
    console.log('👤 Đang tạo Test user...');
    // Không hash password ở đây, để User model tự hash trong pre-save hook
    const testUser = await User.create({
      email: 'user@test.com',
      password: 'user123', // Password plain text, sẽ được hash tự động
      fullName: 'Người dùng Test',
      role: 'user',
      isActive: true
    });
    console.log('✅ Đã tạo Test user:', testUser.email);

    // 3. Tạo Categories
    console.log('📁 Đang tạo Categories...');
    const categories = await Category.insertMany([
      {
        name: 'Rau củ',
        description: 'Các loại rau củ quả tươi',
        icon: '🥬',
        color: '#4CAF50',
        createdBy: adminUser._id
      },
      {
        name: 'Thịt cá',
        description: 'Thịt, cá, hải sản',
        icon: '🥩',
        color: '#F44336',
        createdBy: adminUser._id
      },
      {
        name: 'Đồ khô',
        description: 'Gạo, mì, đậu, ngũ cốc',
        icon: '🌾',
        color: '#FF9800',
        createdBy: adminUser._id
      },
      {
        name: 'Đồ uống',
        description: 'Nước, sữa, nước ngọt',
        icon: '🥤',
        color: '#2196F3',
        createdBy: adminUser._id
      },
      {
        name: 'Gia vị',
        description: 'Muối, đường, nước mắm, dầu ăn',
        icon: '🧂',
        color: '#9C27B0',
        createdBy: adminUser._id
      },
      {
        name: 'Đồ đông lạnh',
        description: 'Thực phẩm đông lạnh',
        icon: '🧊',
        color: '#00BCD4',
        createdBy: adminUser._id
      }
    ]);
    console.log('✅ Đã tạo', categories.length, 'Categories');

    // 4. Tạo Units
    console.log('📏 Đang tạo Units...');
    const units = await Unit.insertMany([
      { name: 'kg', abbreviation: 'kg', type: 'weight' },
      { name: 'gram', abbreviation: 'g', type: 'weight' },
      { name: 'lít', abbreviation: 'l', type: 'volume' },
      { name: 'ml', abbreviation: 'ml', type: 'volume' },
      { name: 'cái', abbreviation: 'cái', type: 'count' },
      { name: 'gói', abbreviation: 'gói', type: 'package' },
      { name: 'hộp', abbreviation: 'hộp', type: 'package' },
      { name: 'chai', abbreviation: 'chai', type: 'package' },
      { name: 'bó', abbreviation: 'bó', type: 'count' },
      { name: 'củ', abbreviation: 'củ', type: 'count' }
    ]);
    console.log('✅ Đã tạo', units.length, 'Units');

    // Tìm unit IDs để sử dụng
    const unitKg = units.find(u => u.name === 'kg');
    const unitGram = units.find(u => u.name === 'gram');
    const unitLitre = units.find(u => u.name === 'lít');
    const unitCai = units.find(u => u.name === 'cái');
    const unitGoi = units.find(u => u.name === 'gói');
    const unitBo = units.find(u => u.name === 'bó');
    const unitChai = units.find(u => u.name === 'chai');

    // 5. Tạo FoodItems
    console.log('🍎 Đang tạo FoodItems...');
    const categoryRauCu = categories.find(c => c.name === 'Rau củ');
    const categoryThitCa = categories.find(c => c.name === 'Thịt cá');
    const categoryDoKho = categories.find(c => c.name === 'Đồ khô');
    const categoryDoUong = categories.find(c => c.name === 'Đồ uống');
    const categoryGiaVi = categories.find(c => c.name === 'Gia vị');

    const foodItems = await FoodItem.insertMany([
      // Rau củ
      {
        name: 'Cà chua',
        categoryId: categoryRauCu._id,
        defaultUnit: unitKg._id,
        description: 'Cà chua tươi',
        averageExpiryDays: 7,
        createdBy: adminUser._id
      },
      {
        name: 'Hành tây',
        categoryId: categoryRauCu._id,
        defaultUnit: unitKg._id,
        description: 'Hành tây',
        averageExpiryDays: 30,
        createdBy: adminUser._id
      },
      {
        name: 'Tỏi',
        categoryId: categoryRauCu._id,
        defaultUnit: unitCai._id,
        description: 'Tỏi',
        averageExpiryDays: 60,
        createdBy: adminUser._id
      },
      {
        name: 'Rau muống',
        categoryId: categoryRauCu._id,
        defaultUnit: unitBo._id,
        description: 'Rau muống tươi',
        averageExpiryDays: 3,
        createdBy: adminUser._id
      },
      // Thịt cá
      {
        name: 'Thịt heo',
        categoryId: categoryThitCa._id,
        defaultUnit: unitKg._id,
        description: 'Thịt heo tươi',
        averageExpiryDays: 3,
        createdBy: adminUser._id
      },
      {
        name: 'Thịt bò',
        categoryId: categoryThitCa._id,
        defaultUnit: unitKg._id,
        description: 'Thịt bò tươi',
        averageExpiryDays: 3,
        createdBy: adminUser._id
      },
      {
        name: 'Cá',
        categoryId: categoryThitCa._id,
        defaultUnit: unitKg._id,
        description: 'Cá tươi',
        averageExpiryDays: 2,
        createdBy: adminUser._id
      },
      {
        name: 'Tôm',
        categoryId: categoryThitCa._id,
        defaultUnit: unitKg._id,
        description: 'Tôm tươi',
        averageExpiryDays: 2,
        createdBy: adminUser._id
      },
      // Đồ khô
      {
        name: 'Gạo',
        categoryId: categoryDoKho._id,
        defaultUnit: unitKg._id,
        description: 'Gạo trắng',
        averageExpiryDays: 365,
        createdBy: adminUser._id
      },
      {
        name: 'Mì tôm',
        categoryId: categoryDoKho._id,
        defaultUnit: unitGoi._id,
        description: 'Mì tôm',
        averageExpiryDays: 180,
        createdBy: adminUser._id
      },
      // Đồ uống
      {
        name: 'Sữa tươi',
        categoryId: categoryDoUong._id,
        defaultUnit: unitLitre._id,
        description: 'Sữa tươi',
        averageExpiryDays: 7,
        createdBy: adminUser._id
      },
      {
        name: 'Nước mắm',
        categoryId: categoryGiaVi._id,
        defaultUnit: unitChai._id,
        description: 'Nước mắm',
        averageExpiryDays: 365,
        createdBy: adminUser._id
      }
    ]);
    console.log('✅ Đã tạo', foodItems.length, 'FoodItems');

    // Tìm foodItem IDs
    const gao = foodItems.find(f => f.name === 'Gạo');
    const caChua = foodItems.find(f => f.name === 'Cà chua');
    const thitHeo = foodItems.find(f => f.name === 'Thịt heo');
    const hanhTay = foodItems.find(f => f.name === 'Hành tây');
    const toi = foodItems.find(f => f.name === 'Tỏi');

    // 6. Tạo Recipes (công thức mẫu)
    console.log('🍳 Đang tạo Recipes...');
    const recipes = await Recipe.insertMany([
      {
        name: 'Cơm rang thập cẩm',
        description: 'Món cơm rang ngon miệng với nhiều nguyên liệu',
        servings: 4,
        prepTime: 15,
        cookTime: 20,
        difficulty: 'medium',
        category: 'Món chính',
        ingredients: [
          {
            foodItemId: gao._id,
            quantity: 0.5,
            unitId: unitKg._id,
            notes: 'Cơm nguội'
          },
          {
            foodItemId: thitHeo._id,
            quantity: 0.3,
            unitId: unitKg._id,
            notes: 'Thái nhỏ'
          },
          {
            foodItemId: caChua._id,
            quantity: 0.2,
            unitId: unitKg._id,
            notes: 'Thái hạt lựu'
          },
          {
            foodItemId: hanhTay._id,
            quantity: 0.1,
            unitId: unitKg._id,
            notes: 'Thái nhỏ'
          }
        ],
        instructions: [
          {
            step: 1,
            description: 'Rửa sạch và chuẩn bị tất cả nguyên liệu'
          },
          {
            step: 2,
            description: 'Thái thịt heo và cà chua thành hạt lựu nhỏ'
          },
          {
            step: 3,
            description: 'Phi thơm hành tây và tỏi'
          },
          {
            step: 4,
            description: 'Xào thịt heo cho chín'
          },
          {
            step: 5,
            description: 'Cho cơm nguội vào xào cùng'
          },
          {
            step: 6,
            description: 'Nêm nếm gia vị vừa ăn'
          }
        ],
        tags: ['nhanh', 'dễ làm', 'ngon'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: new Date(),
        favoriteCount: 0
      },
      {
        name: 'Canh chua cá',
        description: 'Canh chua cá truyền thống',
        servings: 4,
        prepTime: 20,
        cookTime: 30,
        difficulty: 'medium',
        category: 'Canh',
        ingredients: [
          {
            foodItemId: foodItems.find(f => f.name === 'Cá')._id,
            quantity: 0.5,
            unitId: unitKg._id,
            notes: 'Làm sạch'
          },
          {
            foodItemId: caChua._id,
            quantity: 0.3,
            unitId: unitKg._id,
            notes: 'Thái lát'
          }
        ],
        instructions: [
          {
            step: 1,
            description: 'Làm sạch cá, cắt khúc'
          },
          {
            step: 2,
            description: 'Nấu nước dùng với cà chua'
          },
          {
            step: 3,
            description: 'Cho cá vào nấu chín'
          },
          {
            step: 4,
            description: 'Nêm nếm gia vị'
          }
        ],
        tags: ['canh', 'cá', 'truyền thống'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: new Date(),
        favoriteCount: 0
      }
    ]);
    console.log('✅ Đã tạo', recipes.length, 'Recipes');

    console.log('\n🎉 Seed data hoàn tất!');
    console.log('\n📝 Thông tin đăng nhập:');
    console.log('   Admin: admin@grocery.com / admin123');
    console.log('   User:  user@test.com / user123');
    console.log('\n✅ Database đã sẵn sàng sử dụng!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed data:', error);
    process.exit(1);
  }
};

// Chạy seed
seedData();

