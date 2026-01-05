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
        defaultStorageLocation: 'Ngăn mát',
        createdBy: adminUser._id
      },
      {
        name: 'Hành tây',
        categoryId: categoryRauCu._id,
        defaultUnit: unitKg._id,
        description: 'Hành tây',
        averageExpiryDays: 30,
        defaultStorageLocation: 'Nhiệt độ phòng',
        createdBy: adminUser._id
      },
      {
        name: 'Tỏi',
        categoryId: categoryRauCu._id,
        defaultUnit: unitCai._id,
        description: 'Tỏi',
        averageExpiryDays: 60,
        defaultStorageLocation: 'Nhiệt độ phòng',
        createdBy: adminUser._id
      },
      {
        name: 'Rau muống',
        categoryId: categoryRauCu._id,
        defaultUnit: unitBo._id,
        description: 'Rau muống tươi',
        averageExpiryDays: 3,
        defaultStorageLocation: 'Ngăn mát',
        createdBy: adminUser._id
      },
      // Thịt cá
      {
        name: 'Thịt heo',
        categoryId: categoryThitCa._id,
        defaultUnit: unitKg._id,
        description: 'Thịt heo tươi',
        averageExpiryDays: 3,
        defaultStorageLocation: 'Ngăn đông',
        createdBy: adminUser._id
      },
      {
        name: 'Thịt bò',
        categoryId: categoryThitCa._id,
        defaultUnit: unitKg._id,
        description: 'Thịt bò tươi',
        averageExpiryDays: 3,
        defaultStorageLocation: 'Ngăn đông',
        createdBy: adminUser._id
      },
      {
        name: 'Cá',
        categoryId: categoryThitCa._id,
        defaultUnit: unitKg._id,
        description: 'Cá tươi',
        averageExpiryDays: 2,
        defaultStorageLocation: 'Ngăn đông',
        createdBy: adminUser._id
      },
      {
        name: 'Tôm',
        categoryId: categoryThitCa._id,
        defaultUnit: unitKg._id,
        description: 'Tôm tươi',
        averageExpiryDays: 2,
        defaultStorageLocation: 'Ngăn đông',
        createdBy: adminUser._id
      },
      // Đồ khô
      {
        name: 'Gạo',
        categoryId: categoryDoKho._id,
        defaultUnit: unitKg._id,
        description: 'Gạo trắng',
        averageExpiryDays: 365,
        defaultStorageLocation: 'Nhiệt độ phòng',
        createdBy: adminUser._id
      },
      {
        name: 'Mì tôm',
        categoryId: categoryDoKho._id,
        defaultUnit: unitGoi._id,
        description: 'Mì tôm',
        averageExpiryDays: 180,
        defaultStorageLocation: 'Nhiệt độ phòng',
        createdBy: adminUser._id
      },
      // Đồ uống
      {
        name: 'Sữa tươi',
        categoryId: categoryDoUong._id,
        defaultUnit: unitLitre._id,
        description: 'Sữa tươi',
        averageExpiryDays: 7,
        defaultStorageLocation: 'Ngăn mát',
        createdBy: adminUser._id
      },
      {
        name: 'Nước mắm',
        categoryId: categoryGiaVi._id,
        defaultUnit: unitChai._id,
        description: 'Nước mắm',
        averageExpiryDays: 365,
        defaultStorageLocation: 'Nhiệt độ phòng',
        createdBy: adminUser._id
      }
    ]);
    console.log('✅ Đã tạo', foodItems.length, 'FoodItems');

    // Tìm foodItem IDs
    const gao = foodItems.find(f => f.name === 'Gạo');
    const caChua = foodItems.find(f => f.name === 'Cà chua');
    const thitHeo = foodItems.find(f => f.name === 'Thịt heo');
    const thitBo = foodItems.find(f => f.name === 'Thịt bò');
    const ca = foodItems.find(f => f.name === 'Cá');
    const tom = foodItems.find(f => f.name === 'Tôm');
    const hanhTay = foodItems.find(f => f.name === 'Hành tây');
    const toi = foodItems.find(f => f.name === 'Tỏi');
    const rauMuong = foodItems.find(f => f.name === 'Rau muống');
    const miTom = foodItems.find(f => f.name === 'Mì tôm');
    const suaTuoi = foodItems.find(f => f.name === 'Sữa tươi');

    // 6. Tạo Recipes (công thức mẫu)
    console.log('🍳 Đang tạo Recipes...');
    const recipes = await Recipe.insertMany([
      {
        name: 'Cơm rang thập cẩm',
        description: 'Món cơm rang ngon miệng với nhiều nguyên liệu',
        image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
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
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
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
      },
      {
        name: 'Rau muống xào tỏi',
        description: 'Món rau xào đơn giản, thơm mùi tỏi',
        image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800',
        servings: 2,
        prepTime: 10,
        cookTime: 8,
        difficulty: 'easy',
        category: 'Rau',
        ingredients: [
          {
            foodItemId: rauMuong._id,
            quantity: 1,
            unitId: unitBo._id,
            notes: 'Rửa sạch, để ráo'
          },
          {
            foodItemId: toi._id,
            quantity: 3,
            unitId: unitCai._id,
            notes: 'Băm nhỏ'
          }
        ],
        instructions: [
          {
            step: 1,
            description: 'Phi thơm tỏi với chút dầu ăn'
          },
          {
            step: 2,
            description: 'Cho rau muống vào xào nhanh tay'
          },
          {
            step: 3,
            description: 'Nêm nếm vừa ăn và tắt bếp'
          }
        ],
        tags: ['nhanh', 'rau', 'dễ làm'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: new Date(),
        favoriteCount: 0
      },
      {
        name: 'Thịt bò xào hành tây',
        description: 'Thịt bò mềm, hành tây thơm ngọt',
        image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
        servings: 3,
        prepTime: 15,
        cookTime: 12,
        difficulty: 'medium',
        category: 'Món chính',
        ingredients: [
          {
            foodItemId: thitBo._id,
            quantity: 0.4,
            unitId: unitKg._id,
            notes: 'Thái lát mỏng'
          },
          {
            foodItemId: hanhTay._id,
            quantity: 0.2,
            unitId: unitKg._id,
            notes: 'Cắt múi cau'
          },
          {
            foodItemId: toi._id,
            quantity: 2,
            unitId: unitCai._id,
            notes: 'Băm nhỏ'
          }
        ],
        instructions: [
          {
            step: 1,
            description: 'Ướp thịt bò với gia vị trong 10 phút'
          },
          {
            step: 2,
            description: 'Phi thơm tỏi, cho thịt bò vào xào nhanh'
          },
          {
            step: 3,
            description: 'Cho hành tây vào đảo đều, nêm nếm vừa ăn'
          }
        ],
        tags: ['thịt bò', 'xào', 'món mặn'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: new Date(),
        favoriteCount: 0
      },
      {
        name: 'Cá kho cà chua',
        description: 'Cá kho đậm đà với cà chua',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        servings: 4,
        prepTime: 20,
        cookTime: 35,
        difficulty: 'medium',
        category: 'Món chính',
        ingredients: [
          {
            foodItemId: ca._id,
            quantity: 0.6,
            unitId: unitKg._id,
            notes: 'Làm sạch, cắt khúc'
          },
          {
            foodItemId: caChua._id,
            quantity: 0.3,
            unitId: unitKg._id,
            notes: 'Cắt múi'
          },
          {
            foodItemId: hanhTay._id,
            quantity: 0.1,
            unitId: unitKg._id,
            notes: 'Thái lát'
          },
          {
            foodItemId: toi._id,
            quantity: 2,
            unitId: unitCai._id,
            notes: 'Băm nhỏ'
          }
        ],
        instructions: [
          {
            step: 1,
            description: 'Ướp cá với gia vị trong 15 phút'
          },
          {
            step: 2,
            description: 'Phi thơm tỏi, xào cà chua và hành tây'
          },
          {
            step: 3,
            description: 'Cho cá vào kho lửa nhỏ đến khi thấm'
          }
        ],
        tags: ['cá', 'kho', 'đậm đà'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: new Date(),
        favoriteCount: 0
      },
      {
        name: 'Canh rau muống nấu tôm',
        description: 'Canh thanh mát với tôm tươi',
        image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
        servings: 3,
        prepTime: 15,
        cookTime: 15,
        difficulty: 'easy',
        category: 'Canh',
        ingredients: [
          {
            foodItemId: rauMuong._id,
            quantity: 1,
            unitId: unitBo._id,
            notes: 'Rửa sạch'
          },
          {
            foodItemId: tom._id,
            quantity: 0.3,
            unitId: unitKg._id,
            notes: 'Làm sạch'
          },
          {
            foodItemId: toi._id,
            quantity: 2,
            unitId: unitCai._id,
            notes: 'Đập dập'
          }
        ],
        instructions: [
          {
            step: 1,
            description: 'Đun sôi nước, cho tỏi và tôm vào nấu'
          },
          {
            step: 2,
            description: 'Cho rau muống vào, nêm nếm vừa ăn'
          },
          {
            step: 3,
            description: 'Tắt bếp khi rau vừa chín tới'
          }
        ],
        tags: ['canh', 'tôm', 'rau'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: new Date(),
        favoriteCount: 0
      },
      {
        name: 'Cơm bò xào cà chua',
        description: 'Cơm nóng ăn cùng bò xào cà chua',
        image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
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
            notes: 'Nấu cơm'
          },
          {
            foodItemId: thitBo._id,
            quantity: 0.3,
            unitId: unitKg._id,
            notes: 'Thái lát'
          },
          {
            foodItemId: caChua._id,
            quantity: 0.2,
            unitId: unitKg._id,
            notes: 'Cắt múi'
          }
        ],
        instructions: [
          {
            step: 1,
            description: 'Nấu cơm chín và để riêng'
          },
          {
            step: 2,
            description: 'Xào thịt bò cho chín tái'
          },
          {
            step: 3,
            description: 'Cho cà chua vào xào cùng, nêm nếm vừa ăn'
          }
        ],
        tags: ['cơm', 'bò', 'cà chua'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: new Date(),
        favoriteCount: 0
      },
      {
        name: 'Mì tôm bò',
        description: 'Mì tôm ăn kèm thịt bò cho bữa nhanh',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        servings: 2,
        prepTime: 5,
        cookTime: 7,
        difficulty: 'easy',
        category: 'Món chính',
        ingredients: [
          {
            foodItemId: miTom._id,
            quantity: 2,
            unitId: unitGoi._id,
            notes: 'Gói mì'
          },
          {
            foodItemId: thitBo._id,
            quantity: 0.2,
            unitId: unitKg._id,
            notes: 'Thái lát mỏng'
          },
          {
            foodItemId: hanhTay._id,
            quantity: 0.1,
            unitId: unitKg._id,
            notes: 'Thái lát'
          }
        ],
        instructions: [
          {
            step: 1,
            description: 'Xào thịt bò và hành tây cho thơm'
          },
          {
            step: 2,
            description: 'Nấu mì tôm theo hướng dẫn trên gói'
          },
          {
            step: 3,
            description: 'Cho thịt bò vào bát mì và thưởng thức'
          }
        ],
        tags: ['mì', 'nhanh', 'bò'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: new Date(),
        favoriteCount: 0
      },
      {
        name: 'Sữa tươi nóng',
        description: 'Đồ uống đơn giản, dễ làm',
        image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800',
        servings: 2,
        prepTime: 2,
        cookTime: 3,
        difficulty: 'easy',
        category: 'Đồ uống',
        ingredients: [
          {
            foodItemId: suaTuoi._id,
            quantity: 1,
            unitId: unitLitre._id,
            notes: 'Hâm nóng'
          }
        ],
        instructions: [
          {
            step: 1,
            description: 'Đổ sữa vào nồi nhỏ'
          },
          {
            step: 2,
            description: 'Hâm nóng nhẹ, không để sôi'
          }
        ],
        tags: ['đồ uống', 'nhanh'],
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
