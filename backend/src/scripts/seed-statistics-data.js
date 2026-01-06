/**
 * Seed Statistics Data Script
 * Tạo dữ liệu mẫu cho phần Thống kê (mua sắm, lãng phí, tiêu thụ, dashboard)
 *
 * Chạy: 
 *   node src/scripts/seed-statistics-data.js                    (seed cho user mặc định)
 *   node src/scripts/seed-statistics-data.js <email>            (seed cho user theo email)
 *   node src/scripts/seed-statistics-data.js <userId>           (seed cho user theo ID)
 *
 * Ví dụ:
 *   node src/scripts/seed-statistics-data.js user@test.com
 *   node src/scripts/seed-statistics-data.js 507f1f77bcf86cd799439011
 *
 * LƯU Ý:
 * - Yêu cầu đã chạy seed.js trước để có User, FoodItem, Unit, Recipe.
 * - Script này KHÔNG xóa dữ liệu cũ, chỉ thêm thêm dữ liệu demo.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User.model');
const FoodItem = require('../models/FoodItem.model');
const Unit = require('../models/Unit.model');
const ShoppingList = require('../models/ShoppingList.model');
const FridgeItem = require('../models/FridgeItem.model');
const ConsumptionLog = require('../models/ConsumptionLog.model');
const Notification = require('../models/Notification.model');

async function seedStatisticsData() {
  try {
    console.log('🔄 Đang kết nối MongoDB cho seed thống kê...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
      autoIndex: false
    });
    console.log('✅ Kết nối MongoDB thành công');

    // 1. Tìm user - có thể chỉ định qua command line argument
    const userEmailOrId = process.argv[2]; // Lấy argument đầu tiên từ command line
    
    let user = null;
    
    if (userEmailOrId) {
      // Nếu có argument, tìm user theo email hoặc _id
      console.log(`🔍 Đang tìm user: ${userEmailOrId}`);
      
      // Thử tìm theo email trước
      user = await User.findOne({ email: userEmailOrId });
      
      // Nếu không tìm thấy theo email, thử tìm theo _id
      if (!user && mongoose.Types.ObjectId.isValid(userEmailOrId)) {
        user = await User.findById(userEmailOrId);
      }
      
      if (!user) {
        throw new Error(`Không tìm thấy user với email hoặc ID: ${userEmailOrId}`);
      }
      
      console.log(`✅ Tìm thấy user: ${user.email} (${user.fullName || 'N/A'})`);
    } else {
      // Nếu không có argument, dùng logic cũ (fallback)
      console.log('ℹ️  Không có email/ID được chỉ định, đang tìm user mặc định...');
      user =
        (await User.findOne({ email: 'user@test.com' })) ||
        (await User.findOne({ role: 'user' })) ||
        (await User.findOne({}));

      if (!user) {
        throw new Error('Không tìm thấy user để gán dữ liệu thống kê. Hãy chạy seed.js trước hoặc chỉ định email/ID user.');
      }

      console.log('👤 Sử dụng user mặc định:', user.email);
    }

    // 2. Lấy một số FoodItem & Unit phổ biến
    const [gao, thitHeo, thitBo, caChua, rauMuong] = await Promise.all([
      FoodItem.findOne({ name: 'Gạo' }),
      FoodItem.findOne({ name: 'Thịt heo' }),
      FoodItem.findOne({ name: 'Thịt bò' }),
      FoodItem.findOne({ name: 'Cà chua' }),
      FoodItem.findOne({ name: 'Rau muống' })
    ]);

    const unitKg = await Unit.findOne({ name: 'kg' });
    const unitBo = await Unit.findOne({ name: 'bó' });

    if (!gao || !thitHeo || !thitBo || !caChua || !rauMuong || !unitKg || !unitBo) {
      throw new Error('Thiếu FoodItem hoặc Unit. Hãy chắc chắn đã chạy seed.js.');
    }

    const now = new Date();

    // Helper để tạo ngày trong quá khứ N ngày
    const daysAgo = (n) => {
      const d = new Date(now);
      d.setDate(d.getDate() - n);
      return d;
    };

    console.log('🛒 Đang tạo Shopping Lists demo...');

    // 3. Tạo vài shopping lists đã hoàn thành trong 30 ngày gần đây
    const listsData = [
      {
        name: 'Đi chợ cuối tuần',
        daysAgo: 3,
        items: [
          { food: gao, qty: 2, unit: unitKg, price: 20000, reason: 'expired' },
          { food: thitHeo, qty: 1, unit: unitKg, price: 120000, reason: 'missing_ingredient' }
        ]
      },
      {
        name: 'Đi chợ giữa tuần',
        daysAgo: 10,
        items: [
          { food: thitBo, qty: 0.8, unit: unitKg, price: 180000, reason: 'missing_ingredient' },
          { food: caChua, qty: 0.5, unit: unitKg, price: 25000, reason: 'expired' }
        ]
      },
      {
        name: 'Đi chợ đầu tháng',
        daysAgo: 25,
        items: [
          { food: gao, qty: 5, unit: unitKg, price: 18000, reason: 'expired' },
          { food: rauMuong, qty: 3, unit: unitBo, price: 5000, reason: 'expired' }
        ]
      }
    ];

    const createdLists = [];

    for (const config of listsData) {
      const completedAt = daysAgo(config.daysAgo);
      const plannedDate = daysAgo(config.daysAgo + 1);

      const items = config.items.map((it) => ({
        foodItemId: it.food._id,
        quantity: it.qty,
        unitId: it.unit._id,
        reason: it.reason,
        isBought: true,
        status: 'completed',
        purchasedBy: user._id,
        purchasedAt: completedAt,
        price: it.price
      }));

      const list = await ShoppingList.create({
        name: config.name,
        userId: user._id,
        plannedDate,
        status: 'completed',
        isAutoGenerated: false,
        items,
        completedAt
      });

      createdLists.push(list);
    }

    console.log(`✅ Đã tạo ${createdLists.length} shopping lists demo`);

    console.log('🥦 Đang tạo FridgeItems demo (available / expired / expiring_soon)...');

    // 4. Tạo một số FridgeItems với các trạng thái khác nhau
    const fridgeItems = [];

    // Gạo còn dùng được
    fridgeItems.push(
      await FridgeItem.create({
        userId: user._id,
        foodItemId: gao._id,
        quantity: 3,
        unitId: unitKg._id,
        price: 18000,
        purchaseDate: daysAgo(25),
        expiryDate: daysAgo(-160), // còn lâu mới hết hạn
        storageLocation: 'Nhiệt độ phòng',
        status: 'available',
        source: 'manual'
      })
    );

    // Thịt heo đã hết hạn (waste) - tạo điểm dữ liệu lãng phí ở nhiều ngày khác nhau
    const expiredConfigs = [
      { qty: 1.2, daysExpiredAgo: 3 },  // mới hết hạn gần đây
      { qty: 0.8, daysExpiredAgo: 10 }, // hết hạn 10 ngày trước
      { qty: 0.5, daysExpiredAgo: 18 }  // hết hạn 18 ngày trước
    ];

    for (const cfg of expiredConfigs) {
      const createdAt = daysAgo(cfg.daysExpiredAgo);
      fridgeItems.push(
        await FridgeItem.create({
          userId: user._id,
          foodItemId: thitHeo._id,
          quantity: cfg.qty,
          unitId: unitKg._id,
          price: 130000,
          purchaseDate: daysAgo(cfg.daysExpiredAgo + 2),
          expiryDate: daysAgo(cfg.daysExpiredAgo), // hết hạn cùng ngày createdAt
          storageLocation: 'Ngăn đông',
          status: 'expired',
          source: 'shopping_list',
          sourceShoppingListId: createdLists[0]._id,
          createdAt,
          updatedAt: createdAt
        })
      );
    }

    // Cà chua sắp hết hạn
    fridgeItems.push(
      await FridgeItem.create({
        userId: user._id,
        foodItemId: caChua._id,
        quantity: 0.6,
        unitId: unitKg._id,
        price: 26000,
        purchaseDate: daysAgo(2),
        expiryDate: daysAgo(-1), // 1 ngày nữa hết hạn
        storageLocation: 'Ngăn mát',
        status: 'expiring_soon',
        source: 'shopping_list',
        sourceShoppingListId: createdLists[1]._id
      })
    );

    // Rau muống đã dùng hết (không tính vào lãng phí nhưng để dashboard có dữ liệu used_up)
    fridgeItems.push(
      await FridgeItem.create({
        userId: user._id,
        foodItemId: rauMuong._id,
        quantity: 0,
        unitId: unitBo._id,
        price: 5000,
        purchaseDate: daysAgo(1),
        expiryDate: daysAgo(-1),
        storageLocation: 'Ngăn mát',
        status: 'used_up',
        source: 'shopping_list',
        sourceShoppingListId: createdLists[2]._id
      })
    );

    console.log(`✅ Đã tạo ${fridgeItems.length} fridge items demo`);

    console.log('🍽️ Đang tạo ConsumptionLogs demo...');

    // 5. Tạo một số consumption logs để thống kê tiêu thụ
    const logsData = [
      {
        food: gao,
        unit: unitKg,
        qty: 0.5,
        days: 2
      },
      {
        food: thitBo,
        unit: unitKg,
        qty: 0.3,
        days: 4
      },
      {
        food: caChua,
        unit: unitKg,
        qty: 0.2,
        days: 5
      },
      {
        food: rauMuong,
        unit: unitBo,
        qty: 1,
        days: 1
      }
    ];

    for (const logCfg of logsData) {
      const createdAt = daysAgo(logCfg.days);
      await ConsumptionLog.create({
        userId: user._id,
        foodItemId: logCfg.food._id,
        unitId: logCfg.unit._id,
        quantity: logCfg.qty,
        source: 'manual',
        createdAt,
        updatedAt: createdAt
      });
    }

    console.log(`✅ Đã tạo ${logsData.length} consumption logs demo`);

    console.log('🔔 Đang tạo một vài notification demo cho thống kê món ăn và hoạt động gần đây...');

    // 6. Tạo một vài notification recipe_cooked và shopping_update để Dashboard / Recent Activities có dữ liệu
    const recipeCookedNotif = await Notification.create({
      userId: user._id,
      type: 'recipe_cooked',
      title: 'Đã nấu món Canh chua cá',
      message: 'Bạn vừa nấu món Canh chua cá.',
      relatedId: null,
      relatedType: 'Recipe',
      isRead: false,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1)
    });

    const shoppingNotif = await Notification.create({
      userId: user._id,
      type: 'shopping_update',
      title: 'Hoàn thành danh sách mua sắm',
      message: `Bạn đã hoàn thành danh sách mua sắm "${createdLists[0].name}"`,
      relatedId: createdLists[0]._id,
      relatedType: 'ShoppingList',
      isRead: false,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3)
    });

    console.log('✅ Đã tạo notifications demo:', recipeCookedNotif._id.toString(), shoppingNotif._id.toString());

    console.log('\n🎉 Seed dữ liệu thống kê hoàn tất!');
    console.log(`\n📊 Dữ liệu đã được thêm cho user: ${user.email} (${user.fullName || 'N/A'})`);
    console.log('\n💡 Để seed cho user khác, chạy:');
    console.log('   node src/scripts/seed-statistics-data.js <email-hoặc-userId>');
    console.log('   Ví dụ: node src/scripts/seed-statistics-data.js user@example.com');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu thống kê:', error);
    process.exit(1);
  }
}

seedStatisticsData();


