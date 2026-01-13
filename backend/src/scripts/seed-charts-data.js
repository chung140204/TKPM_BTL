/**
 * Seed Charts Data Script
 * Tạo dữ liệu mẫu cho các biểu đồ ở Dashboard và Statistics
 *
 * Chạy: node src/scripts/seed-charts-data.js
 *
 * LƯU Ý:
 * - Yêu cầu đã chạy seed.js trước để có User, FoodItem, Unit, Category.
 * - Script này tạo dữ liệu cho 6 tháng gần nhất để hiển thị biểu đồ.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User.model');
const FoodItem = require('../models/FoodItem.model');
const Unit = require('../models/Unit.model');
const Category = require('../models/Category.model');
const ShoppingList = require('../models/ShoppingList.model');
const FridgeItem = require('../models/FridgeItem.model');
const ConsumptionLog = require('../models/ConsumptionLog.model');

async function seedChartsData() {
  try {
    console.log('🔄 Đang kết nối MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Kết nối MongoDB thành công');

    // 1. Tìm user demo
    const user = await User.findOne({ email: 'user@test.com' }) || 
                 await User.findOne({ role: 'user' }) || 
                 await User.findOne({});

    if (!user) {
      throw new Error('Không tìm thấy user. Hãy chạy seed.js trước.');
    }

    console.log('👤 Sử dụng user:', user.email);

    // 2. Lấy categories và food items
    const categories = await Category.find({});
    if (categories.length === 0) {
      throw new Error('Không tìm thấy categories. Hãy chạy seed.js trước.');
    }

    // Tạo categories nếu chưa có đủ
    const requiredCategories = ['Thịt cá', 'Đồ khô', 'Rau củ', 'Trái cây', 'Sữa và sản phẩm từ sữa'];
    const categoryMap = {};
    
    for (const catName of requiredCategories) {
      let category = await Category.findOne({ name: catName });
      if (!category) {
        category = await Category.create({
          name: catName,
          description: `Danh mục ${catName}`
        });
        console.log(`✅ Đã tạo category: ${catName}`);
      }
      categoryMap[catName] = category;
    }

    // Lấy các categories hiện có
    const thitCa = categoryMap['Thịt cá'] || categories.find(c => c.name.includes('Thịt') || c.name.includes('cá')) || categories[0];
    const doKho = categoryMap['Đồ khô'] || categories.find(c => c.name.includes('khô') || c.name.includes('Đồ')) || categories[1] || categories[0];
    const rauCu = categoryMap['Rau củ'] || categories.find(c => c.name.includes('Rau') || c.name.includes('củ')) || categories[2] || categories[0];
    const traiCay = categoryMap['Trái cây'] || categories.find(c => c.name.includes('Trái') || c.name.includes('cây')) || categories[3] || categories[0];
    const sua = categoryMap['Sữa và sản phẩm từ sữa'] || categories.find(c => c.name.includes('Sữa')) || categories[4] || categories[0];

    // 3. Lấy hoặc tạo food items
    const unitKg = await Unit.findOne({ name: 'kg' }) || await Unit.findOne({});
    const unitBo = await Unit.findOne({ name: 'bó' }) || await Unit.findOne({});
    const unitCai = await Unit.findOne({ name: 'cái' }) || await Unit.findOne({});

    if (!unitKg || !unitBo || !unitCai) {
      throw new Error('Không tìm thấy units. Hãy chạy seed.js trước.');
    }

    // Tạo food items nếu chưa có
    const foodItems = {};
    const foodItemsToCreate = [
      { name: 'Thịt heo', category: thitCa, unit: unitKg },
      { name: 'Thịt bò', category: thitCa, unit: unitKg },
      { name: 'Cá hồi', category: thitCa, unit: unitKg },
      { name: 'Gạo', category: doKho, unit: unitKg },
      { name: 'Mì tôm', category: doKho, unit: unitCai },
      { name: 'Cà chua', category: rauCu, unit: unitKg },
      { name: 'Rau muống', category: rauCu, unit: unitBo },
      { name: 'Cà rốt', category: rauCu, unit: unitKg },
      { name: 'Chuối', category: traiCay, unit: unitKg },
      { name: 'Táo', category: traiCay, unit: unitKg },
      { name: 'Sữa tươi', category: sua, unit: unitCai },
      { name: 'Phô mai', category: sua, unit: unitCai }
    ];

    for (const food of foodItemsToCreate) {
      let foodItem = await FoodItem.findOne({ name: food.name });
      if (!foodItem) {
        foodItem = await FoodItem.create({
          name: food.name,
          categoryId: food.category._id,
          defaultUnit: food.unit._id
        });
        console.log(`✅ Đã tạo food item: ${food.name}`);
      }
      foodItems[food.name] = foodItem;
    }

    const now = new Date();

    // Helper functions
    const daysAgo = (n) => {
      const d = new Date(now);
      d.setDate(d.getDate() - n);
      return d;
    };

    const monthsAgo = (n) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - n);
      return d;
    };

    console.log('📊 Đang tạo dữ liệu cho biểu đồ Dashboard và Statistics...');

    // 4. Tạo dữ liệu cho các cards trên Dashboard
    console.log('📋 Tạo dữ liệu cho Dashboard cards...');
    
    // 4.1. Tạo 3 FridgeItems với status 'available' (Tổng thực phẩm = 3)
    const dashboardFoods = [
      { name: 'Thịt heo', category: thitCa, unit: unitKg, qty: 1.5 },
      { name: 'Gạo', category: doKho, unit: unitKg, qty: 2.0 },
      { name: 'Cà chua', category: rauCu, unit: unitKg, qty: 0.8 }
    ];
    
    for (const food of dashboardFoods) {
      const foodItem = foodItems[food.name];
      if (foodItem) {
        await FridgeItem.create({
          userId: user._id,
          foodItemId: foodItem._id,
          quantity: food.qty,
          unitId: food.unit._id,
          price: Math.floor(Math.random() * 50000) + 10000,
          purchaseDate: daysAgo(Math.floor(Math.random() * 10) + 5),
          expiryDate: daysAgo(-Math.floor(Math.random() * 20) - 5), // Còn hạn lâu
          storageLocation: 'Ngăn mát',
          status: 'available',
          source: 'manual'
        });
      }
    }
    console.log('✅ Đã tạo 3 FridgeItems available (Tổng thực phẩm = 3)');

    // 4.2. Tạo 1 FridgeItem với status 'expiring_soon' (Sắp hết hạn = 1)
    const expiringFood = foodItems['Rau muống'] || foodItems['Cà chua'];
    if (expiringFood) {
      await FridgeItem.create({
        userId: user._id,
        foodItemId: expiringFood._id,
        quantity: 0.5,
        unitId: expiringFood.defaultUnit,
        price: Math.floor(Math.random() * 20000) + 5000,
        purchaseDate: daysAgo(2),
        expiryDate: daysAgo(-1), // Sắp hết hạn (1 ngày nữa)
        storageLocation: 'Ngăn mát',
        status: 'expiring_soon',
        source: 'manual'
      });
    }
    console.log('✅ Đã tạo 1 FridgeItem expiring_soon (Sắp hết hạn = 1)');

    // 4.2. Tạo 6 ShoppingList (Danh sách mua sắm = 6)
    const shoppingListNames = [
      'Danh sách mua sắm tuần này',
      'Danh sách mua sắm cuối tuần',
      'Danh sách mua sắm thứ 2',
      'Danh sách mua sắm thứ 4',
      'Danh sách mua sắm thứ 6',
      'Danh sách mua sắm chủ nhật'
    ];

    for (let i = 0; i < 6; i++) {
      const foodKeys = Object.keys(foodItems);
      const selectedFoods = foodKeys.slice(0, Math.floor(Math.random() * 3) + 2); // 2-4 items
      
      const items = selectedFoods.map(foodName => {
        const foodItem = foodItems[foodName];
        return {
          foodItemId: foodItem._id,
          quantity: Math.random() * 1.5 + 0.3,
          unitId: foodItem.defaultUnit,
          reason: ['expired', 'used_up', 'expiring_soon', 'missing_ingredient'][Math.floor(Math.random() * 4)],
          isBought: Math.random() > 0.3, // 70% đã mua
          status: Math.random() > 0.3 ? 'completed' : 'pending'
        };
      });

      const plannedDate = daysAgo(Math.floor(Math.random() * 14));
      await ShoppingList.create({
        name: shoppingListNames[i],
        userId: user._id,
        plannedDate: plannedDate,
        status: Math.random() > 0.5 ? 'active' : 'completed',
        items: items
      });
    }
    console.log('✅ Đã tạo 6 ShoppingList');
    console.log('   → Danh sách mua sắm = 6');

    // 4.4. Tạo dữ liệu waste để có "Giảm lãng phí = 100%"
    // Để có 100% reduction: tháng này = 0, tháng trước > 0
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Tạo expired items trong tháng trước (để có waste tháng trước)
    const lastMonthWasteFood = foodItems['Thịt bò'] || foodItems['Thịt heo'];
    if (lastMonthWasteFood) {
      const lastMonthDate = new Date(lastMonthStart.getFullYear(), lastMonthStart.getMonth(), 15);
      await FridgeItem.create({
        userId: user._id,
        foodItemId: lastMonthWasteFood._id,
        quantity: 1.5,
        unitId: lastMonthWasteFood.defaultUnit,
        price: Math.floor(Math.random() * 50000) + 10000,
        purchaseDate: new Date(lastMonthDate.getTime() - 3 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(lastMonthDate.getTime() - 1 * 24 * 60 * 60 * 1000),
        storageLocation: 'Ngăn mát',
        status: 'expired',
        source: 'manual',
        createdAt: lastMonthDate,
        updatedAt: lastMonthDate
      });
    }
    // Không tạo expired items trong tháng này (để có waste = 0)
    console.log('✅ Đã tạo dữ liệu waste để có Giảm lãng phí = 100%');

    // 5. Tạo FridgeItems với status expired trong 6 tháng qua (cho wasteData chart)
    console.log('🗑️ Tạo FridgeItems expired cho biểu đồ lãng phí theo tháng...');
    
    // Tạo dữ liệu cho 6 tháng gần nhất với xu hướng giảm dần
    // Tháng 1 có waste cao nhất (1.0), các tháng sau giảm dần
    const wasteQuantities = [1.0, 0.8, 0.6, 0.4, 0.3, 0.2]; // Giảm dần theo thời gian
    
    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      
      // Tạo 3-5 expired items mỗi tháng
      const numItems = Math.floor(Math.random() * 3) + 3; // 3-5 items
      const totalWaste = wasteQuantities[monthOffset] || 0.5;
      
      for (let i = 0; i < numItems; i++) {
        const randomDay = Math.floor(Math.random() * 28) + 1;
        const createdAt = new Date(monthStart.getFullYear(), monthStart.getMonth(), randomDay);
        const expiryDate = new Date(createdAt);
        expiryDate.setDate(expiryDate.getDate() - 1); // Hết hạn 1 ngày trước
        
        const foodKeys = Object.keys(foodItems);
        const randomFood = foodItems[foodKeys[Math.floor(Math.random() * foodKeys.length)]];
        const unit = randomFood.defaultUnit;

        await FridgeItem.create({
          userId: user._id,
          foodItemId: randomFood._id,
          quantity: (totalWaste / numItems) + (Math.random() * 0.1 - 0.05), // Thêm variation nhỏ
          unitId: unit,
          price: Math.floor(Math.random() * 50000) + 10000,
          purchaseDate: new Date(createdAt.getTime() - 2 * 24 * 60 * 60 * 1000), // Mua 2 ngày trước
          expiryDate: expiryDate,
          storageLocation: 'Ngăn mát',
          status: 'expired',
          source: 'manual',
          createdAt: createdAt,
          updatedAt: createdAt
        });
      }
    }

    console.log(`✅ Đã tạo FridgeItems expired cho 6 tháng`);

    // 6. Tạo FridgeItems available với các categories khác nhau (cho categoryData pie chart)
    console.log('📦 Tạo FridgeItems available cho biểu đồ phân bố danh mục...');
    
    // Tạo distribution: Thịt cá 67%, Đồ khô 33% (như trong hình)
    const categoryDistribution = [
      { category: thitCa, items: ['Thịt heo', 'Thịt bò', 'Cá hồi'], totalQty: 10.0 }, // ~67%
      { category: doKho, items: ['Gạo', 'Mì tôm'], totalQty: 5.0 }, // ~33%
      { category: rauCu, items: ['Cà chua', 'Rau muống', 'Cà rốt'], totalQty: 2.5 },
      { category: traiCay, items: ['Chuối', 'Táo'], totalQty: 1.5 },
      { category: sua, items: ['Sữa tươi', 'Phô mai'], totalQty: 1.0 }
    ];

    for (const dist of categoryDistribution) {
      for (const itemName of dist.items) {
        const foodItem = foodItems[itemName];
        if (foodItem) {
          const qty = dist.totalQty / dist.items.length;
          // Tạo 2-3 items mỗi food để có đủ dữ liệu
          const numItems = Math.floor(Math.random() * 2) + 2;
          for (let i = 0; i < numItems; i++) {
            await FridgeItem.create({
              userId: user._id,
              foodItemId: foodItem._id,
              quantity: (qty / numItems) + (Math.random() * 0.3),
              unitId: foodItem.defaultUnit,
              price: Math.floor(Math.random() * 50000) + 10000,
              purchaseDate: daysAgo(Math.floor(Math.random() * 30)),
              expiryDate: daysAgo(-Math.floor(Math.random() * 30) - 10), // Còn hạn
              storageLocation: 'Ngăn mát',
              status: 'available',
              source: 'manual'
            });
          }
        }
      }
    }

    console.log(`✅ Đã tạo FridgeItems available cho các categories`);

    // 7. Tạo ShoppingList items với purchasedAt trong các khoảng thời gian (cho purchase statistics)
    console.log('🛒 Tạo ShoppingList items cho biểu đồ mua sắm...');
    
    // Tạo shopping lists trong 2 tuần qua (cho week view)
    // Tạo dữ liệu cho 2 ngày: Ngày 6/1 và Ngày 13/1 (như trong hình)
    const specificDates = [
      { day: 13, month: 0, year: now.getFullYear(), qty: 2.5 }, // Ngày 13/1 - 2.5 kg
      { day: 6, month: 0, year: now.getFullYear(), qty: 0.85 }  // Ngày 6/1 - 0.85 kg
    ];

    for (const dateConfig of specificDates) {
      const purchaseDate = new Date(dateConfig.year, dateConfig.month, dateConfig.day);
      const plannedDate = new Date(purchaseDate);
      plannedDate.setDate(plannedDate.getDate() - 1);
      
      const foodKeys = Object.keys(foodItems);
      const selectedFoods = foodKeys.slice(0, Math.floor(Math.random() * 4) + 3); // 3-6 items
      
      // Phân bổ quantity cho các items
      let remainingQty = dateConfig.qty;
      const items = selectedFoods.map((foodName, index) => {
        const foodItem = foodItems[foodName];
        const itemQty = index === selectedFoods.length - 1 
          ? remainingQty 
          : (remainingQty / selectedFoods.length) + (Math.random() * 0.1);
        remainingQty -= itemQty;
        
        return {
          foodItemId: foodItem._id,
          quantity: Math.max(0.1, itemQty),
          unitId: foodItem.defaultUnit,
          reason: ['expired', 'used_up', 'expiring_soon', 'missing_ingredient'][Math.floor(Math.random() * 4)],
          isBought: true,
          status: 'completed',
          purchasedBy: user._id,
          purchasedAt: purchaseDate
        };
      });

      await ShoppingList.create({
        name: `Danh sách mua sắm ngày ${dateConfig.day}/${dateConfig.month + 1}`,
        userId: user._id,
        plannedDate: plannedDate,
        status: 'completed',
        items: items,
        completedAt: purchaseDate,
        createdAt: plannedDate,
        updatedAt: purchaseDate
      });
    }

    // Tạo thêm shopping lists cho các ngày khác trong 2 tuần
    for (let day = 0; day < 14; day++) {
      if (day === 6 || day === 13) continue; // Đã tạo ở trên
      
      const purchaseDate = daysAgo(day);
      const plannedDate = daysAgo(day + 1);
      
      // Tạo shopping list với xác suất 30%
      if (Math.random() < 0.3) {
        const foodKeys = Object.keys(foodItems);
        const selectedFoods = foodKeys.slice(0, Math.floor(Math.random() * 3) + 2);
        
        const items = selectedFoods.map(foodName => {
          const foodItem = foodItems[foodName];
          return {
            foodItemId: foodItem._id,
            quantity: Math.random() * 1.5 + 0.3,
            unitId: foodItem.defaultUnit,
            reason: ['expired', 'used_up', 'expiring_soon', 'missing_ingredient'][Math.floor(Math.random() * 4)],
            isBought: true,
            status: 'completed',
            purchasedBy: user._id,
            purchasedAt: purchaseDate
          };
        });

        await ShoppingList.create({
          name: `Danh sách mua sắm ${day} ngày trước`,
          userId: user._id,
          plannedDate: plannedDate,
          status: 'completed',
          items: items,
          completedAt: purchaseDate,
          createdAt: plannedDate,
          updatedAt: purchaseDate
        });
      }
    }

    console.log(`✅ Đã tạo ShoppingList items cho 2 tuần qua`);

    // 7. Tạo ConsumptionLog entries trong các khoảng thời gian (cho consumption statistics)
    console.log('🍽️ Tạo ConsumptionLog entries cho biểu đồ tiêu thụ...');
    
    // Tạo consumption logs cho 2 ngày cụ thể (như trong hình)
    const consumptionDates = [
      { day: 6, month: 0, year: now.getFullYear(), qty: 1.0 },   // Ngày 6/1 - 1.0 kg
      { day: 13, month: 0, year: now.getFullYear(), qty: 0.5 }   // Ngày 13/1 - 0.5 kg
    ];

    for (const dateConfig of consumptionDates) {
      const consumedDate = new Date(dateConfig.year, dateConfig.month, dateConfig.day);
      
      // Tạo 3-5 consumption logs cho mỗi ngày
      const numLogs = Math.floor(Math.random() * 3) + 3;
      let remainingQty = dateConfig.qty;
      
      for (let i = 0; i < numLogs; i++) {
        const foodKeys = Object.keys(foodItems);
        const randomFood = foodItems[foodKeys[Math.floor(Math.random() * foodKeys.length)]];
        
        const itemQty = i === numLogs - 1 
          ? remainingQty 
          : (remainingQty / numLogs) + (Math.random() * 0.05);
        remainingQty -= itemQty;
        
        await ConsumptionLog.create({
          userId: user._id,
          foodItemId: randomFood._id,
          unitId: randomFood.defaultUnit,
          quantity: Math.max(0.1, itemQty),
          source: ['recipe', 'manual', 'other'][Math.floor(Math.random() * 3)],
          createdAt: consumedDate,
          updatedAt: consumedDate
        });
      }
    }

    // Tạo thêm consumption logs cho các ngày khác
    for (let day = 0; day < 14; day++) {
      if (day === 6 || day === 13) continue; // Đã tạo ở trên
      
      const consumedDate = daysAgo(day);
      
      // Tạo 1-3 consumption logs mỗi ngày với xác suất 50%
      if (Math.random() < 0.5) {
        const numLogs = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numLogs; i++) {
          const foodKeys = Object.keys(foodItems);
          const randomFood = foodItems[foodKeys[Math.floor(Math.random() * foodKeys.length)]];
          
          await ConsumptionLog.create({
            userId: user._id,
            foodItemId: randomFood._id,
            unitId: randomFood.defaultUnit,
            quantity: Math.random() * 0.8 + 0.2,
            source: ['recipe', 'manual', 'other'][Math.floor(Math.random() * 3)],
            createdAt: consumedDate,
            updatedAt: consumedDate
          });
        }
      }
    }

    console.log(`✅ Đã tạo ConsumptionLog entries cho 2 tuần qua`);

    // 9. Tạo thêm dữ liệu cho các tháng trước (cho month/year view)
    console.log('📅 Tạo dữ liệu cho các tháng trước...');
    
    // Tạo dữ liệu cho 6 tháng qua
    for (let monthOffset = 1; monthOffset <= 6; monthOffset++) {
      const monthStart = monthsAgo(monthOffset);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      // Tạo shopping lists trong tháng này
      const numShoppingDays = Math.floor(Math.random() * 10) + 5; // 5-15 ngày có mua sắm
      for (let i = 0; i < numShoppingDays; i++) {
        const randomDay = Math.floor(Math.random() * 28) + 1;
        const purchaseDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), randomDay);
        
        const foodKeys = Object.keys(foodItems);
        const selectedFoods = foodKeys.slice(0, Math.floor(Math.random() * 4) + 2);
        
        const items = selectedFoods.map(foodName => {
          const foodItem = foodItems[foodName];
          return {
            foodItemId: foodItem._id,
            quantity: Math.random() * 3 + 0.5,
            unitId: foodItem.defaultUnit,
            reason: ['expired', 'used_up', 'expiring_soon', 'missing_ingredient'][Math.floor(Math.random() * 4)],
            isBought: true,
            status: 'completed',
            purchasedBy: user._id,
            purchasedAt: purchaseDate
          };
        });

        await ShoppingList.create({
          name: `Mua sắm tháng ${monthStart.getMonth() + 1}`,
          userId: user._id,
          plannedDate: purchaseDate,
          status: 'completed',
          items: items,
          completedAt: purchaseDate,
          createdAt: purchaseDate,
          updatedAt: purchaseDate
        });
      }

      // Tạo consumption logs trong tháng này
      const numConsumptionDays = Math.floor(Math.random() * 20) + 10; // 10-30 ngày có tiêu thụ
      for (let i = 0; i < numConsumptionDays; i++) {
        const randomDay = Math.floor(Math.random() * 28) + 1;
        const consumedDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), randomDay);
        
        const foodKeys = Object.keys(foodItems);
        const randomFood = foodItems[foodKeys[Math.floor(Math.random() * foodKeys.length)]];
        
        await ConsumptionLog.create({
          userId: user._id,
          foodItemId: randomFood._id,
          unitId: randomFood.defaultUnit,
          quantity: Math.random() * 2 + 0.3,
          source: ['recipe', 'manual', 'other'][Math.floor(Math.random() * 3)],
          createdAt: consumedDate,
          updatedAt: consumedDate
        });
      }

      // Tạo expired items trong tháng này (cho waste statistics)
      const numExpiredDays = Math.floor(Math.random() * 5) + 2; // 2-7 ngày có lãng phí
      for (let i = 0; i < numExpiredDays; i++) {
        const randomDay = Math.floor(Math.random() * 28) + 1;
        const createdAt = new Date(monthStart.getFullYear(), monthStart.getMonth(), randomDay);
        const expiryDate = new Date(createdAt);
        expiryDate.setDate(expiryDate.getDate() - 1);
        
        const foodKeys = Object.keys(foodItems);
        const randomFood = foodItems[foodKeys[Math.floor(Math.random() * foodKeys.length)]];
        
        await FridgeItem.create({
          userId: user._id,
          foodItemId: randomFood._id,
          quantity: Math.random() * 1.5 + 0.3,
          unitId: randomFood.defaultUnit,
          price: Math.floor(Math.random() * 50000) + 10000,
          purchaseDate: new Date(createdAt.getTime() - 3 * 24 * 60 * 60 * 1000),
          expiryDate: expiryDate,
          storageLocation: 'Ngăn mát',
          status: 'expired',
          source: 'manual',
          createdAt: createdAt,
          updatedAt: createdAt
        });
      }
      
      // Tạo thêm expired items cho ngày 6/1 (như trong hình waste over time)
      if (monthOffset === 0) { // Tháng hiện tại
        const wasteDate = new Date(now.getFullYear(), 0, 6); // 6/1
        const expiryDate = new Date(wasteDate);
        expiryDate.setDate(expiryDate.getDate() - 1);
        
        const foodKeys = Object.keys(foodItems);
        const randomFood = foodItems[foodKeys[Math.floor(Math.random() * foodKeys.length)]];
        
        await FridgeItem.create({
          userId: user._id,
          foodItemId: randomFood._id,
          quantity: 0.95, // ~0.95 kg như trong hình
          unitId: randomFood.defaultUnit,
          price: Math.floor(Math.random() * 50000) + 10000,
          purchaseDate: new Date(wasteDate.getTime() - 2 * 24 * 60 * 60 * 1000),
          expiryDate: expiryDate,
          storageLocation: 'Ngăn mát',
          status: 'expired',
          source: 'manual',
          createdAt: wasteDate,
          updatedAt: wasteDate
        });
      }
    }

    console.log(`✅ Đã tạo dữ liệu cho 6 tháng qua`);

    console.log('\n🎉 Seed dữ liệu biểu đồ hoàn tất!');
    console.log('\n📊 Dữ liệu đã được tạo cho:');
    console.log('   - Dashboard Cards:');
    console.log('     • Tổng thực phẩm = 3');
    console.log('     • Sắp hết hạn = 1');
    console.log('     • Danh sách mua sắm = 6');
    console.log('     • Giảm lãng phí = 100%');
    console.log('   - Dashboard Charts:');
    console.log('     • wasteData (6 tháng)');
    console.log('     • categoryData (phân bố danh mục)');
    console.log('   - Statistics Charts:');
    console.log('     • purchase, consumption, waste trends');
    console.log('\n💡 Bây giờ bạn có thể xem các biểu đồ và cards với dữ liệu thực tế!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu biểu đồ:', error);
    process.exit(1);
  }
}

seedChartsData();
