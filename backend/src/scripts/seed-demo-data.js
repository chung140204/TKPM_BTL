/**
 * Seed Demo Data Script
 * Tạo dữ liệu demo sinh động cho Smart Grocery & Meal Planning System
 * 
 * Chạy: node src/scripts/seed-demo-data.js
 * 
 * Script này tạo dữ liệu demo trong 6 tháng gần đây để:
 * - Dashboard cards hiển thị đầy đủ
 * - Statistics charts có đủ điểm dữ liệu
 * - Demo flow: ShoppingList -> FridgeItem -> ConsumptionLog
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

// Import models
const User = require('../models/User.model');
const Category = require('../models/Category.model');
const Unit = require('../models/Unit.model');
const FoodItem = require('../models/FoodItem.model');
const FridgeItem = require('../models/FridgeItem.model');
const ShoppingList = require('../models/ShoppingList.model');
const MealPlan = require('../models/MealPlan.model');
const Notification = require('../models/Notification.model');
const ConsumptionLog = require('../models/ConsumptionLog.model');
const Recipe = require('../models/Recipe.model');

// Helper function để hỏi input từ terminal
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// Helper functions
const daysAgo = (n, baseDate = new Date()) => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - n);
  return d;
};

const randomDate = (startDate, endDate) => {
  const start = startDate.getTime();
  const end = endDate.getTime();
  return new Date(start + Math.random() * (end - start));
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min, max) => Math.random() * (max - min) + min;

const randomChoice = (array) => array[Math.floor(Math.random() * array.length)];

async function seedDemoData() {
  try {
    // 0. Hỏi email từ terminal
    console.log('📧 Nhập email của user cần seed dữ liệu demo');
    const emailInput = await askQuestion('Enter user email to seed demo data (Enter để dùng user@test.com): ');
    const userEmail = emailInput.trim() || 'user@test.com';
    
    console.log(`\n🔄 Đang kết nối MongoDB...`);
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Kết nối MongoDB thành công\n');

    // 1. Tìm user theo email (KHÔNG tạo mới)
    console.log(`👤 Đang tìm user với email: ${userEmail}...`);
    const demoUser = await User.findOne({ email: userEmail.toLowerCase().trim() });
    
    if (!demoUser) {
      console.error(`\n❌ Lỗi: Không tìm thấy user với email "${userEmail}"`);
      console.error('💡 Vui lòng kiểm tra lại email hoặc tạo user trước khi chạy seed.');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`✅ Đã tìm thấy user:`);
    console.log(`   - Email: ${demoUser.email}`);
    console.log(`   - Full Name: ${demoUser.fullName}`);
    console.log(`   - ID: ${demoUser._id}`);
    if (demoUser.familyGroupId) {
      console.log(`   - Family Group ID: ${demoUser.familyGroupId}`);
    }

    // Khai báo now trước khi sử dụng
    const now = new Date();

    // 2. Xóa dữ liệu demo cũ của user này
    // Chỉ xóa records có notes="DEMO_SEED" hoặc tên bắt đầu bằng pattern demo
    console.log('\n🗑️  Đang xóa dữ liệu demo cũ...');
    const deleteResults = await Promise.all([
      FridgeItem.deleteMany({ userId: demoUser._id, notes: 'DEMO_SEED' }),
      ShoppingList.deleteMany({ 
        userId: demoUser._id, 
        $or: [
          { notes: 'DEMO_SEED' },
          { name: /^Danh sách mua sắm \d+$/ }
        ]
      }),
      MealPlan.deleteMany({ 
        userId: demoUser._id,
        $or: [
          { notes: 'DEMO_SEED' },
          { name: /^Kế hoạch bữa ăn \d+$/ }
        ]
      }),
      Notification.deleteMany({ 
        userId: demoUser._id,
        $or: [
          { notes: 'DEMO_SEED' },
          { title: /^(Thông báo hệ thống|Thông báo chưa đọc)/ }
        ]
      }),
      // ConsumptionLog không có field notes, chỉ xóa logs được tạo trong 24h gần đây (có thể là demo)
      ConsumptionLog.deleteMany({ 
        userId: demoUser._id,
        createdAt: { $gte: daysAgo(1, now) }
      })
    ]);
    console.log('✅ Đã xóa dữ liệu demo cũ:', {
      FridgeItem: deleteResults[0].deletedCount,
      ShoppingList: deleteResults[1].deletedCount,
      MealPlan: deleteResults[2].deletedCount,
      Notification: deleteResults[3].deletedCount,
      ConsumptionLog: deleteResults[4].deletedCount
    });

    // 3. Lấy Categories và Units
    console.log('\n📦 Đang lấy Categories và Units...');
    const categories = await Category.find({});
    const units = await Unit.find({});
    
    if (categories.length === 0 || units.length === 0) {
      throw new Error('Không tìm thấy Categories hoặc Units. Hãy chạy seed.js trước.');
    }

    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat;
    });

    const unitMap = {};
    units.forEach(unit => {
      unitMap[unit.name] = unit;
    });

    // Đảm bảo có các categories và units cần thiết
    const requiredCategories = ['Rau củ', 'Thịt cá', 'Đồ khô', 'Đồ uống', 'Gia vị'];
    const requiredUnits = ['kg', 'g', 'lít', 'ml', 'bó', 'cái', 'gói', 'hộp'];

    console.log(`✅ Đã lấy ${categories.length} categories và ${units.length} units`);

    // 4. Lấy hoặc tạo FoodItems (30-50 items)
    console.log('\n🥬 Đang tạo FoodItems...');
    const foodItemsData = [
      // Rau củ
      { name: 'Cà chua', category: 'Rau củ', unit: 'kg' },
      { name: 'Cà rốt', category: 'Rau củ', unit: 'kg' },
      { name: 'Rau muống', category: 'Rau củ', unit: 'bó' },
      { name: 'Rau cải', category: 'Rau củ', unit: 'bó' },
      { name: 'Bắp cải', category: 'Rau củ', unit: 'cái' },
      { name: 'Cải thảo', category: 'Rau củ', unit: 'cái' },
      { name: 'Hành tây', category: 'Rau củ', unit: 'kg' },
      { name: 'Tỏi', category: 'Rau củ', unit: 'kg' },
      { name: 'Ớt', category: 'Rau củ', unit: 'kg' },
      { name: 'Khoai tây', category: 'Rau củ', unit: 'kg' },
      { name: 'Khoai lang', category: 'Rau củ', unit: 'kg' },
      { name: 'Bí đỏ', category: 'Rau củ', unit: 'kg' },
      { name: 'Đậu bắp', category: 'Rau củ', unit: 'kg' },
      { name: 'Mướp', category: 'Rau củ', unit: 'kg' },
      { name: 'Cà tím', category: 'Rau củ', unit: 'kg' },
      
      // Thịt cá
      { name: 'Thịt heo', category: 'Thịt cá', unit: 'kg' },
      { name: 'Thịt bò', category: 'Thịt cá', unit: 'kg' },
      { name: 'Thịt gà', category: 'Thịt cá', unit: 'kg' },
      { name: 'Cá hồi', category: 'Thịt cá', unit: 'kg' },
      { name: 'Cá basa', category: 'Thịt cá', unit: 'kg' },
      { name: 'Tôm', category: 'Thịt cá', unit: 'kg' },
      { name: 'Mực', category: 'Thịt cá', unit: 'kg' },
      { name: 'Cua', category: 'Thịt cá', unit: 'kg' },
      { name: 'Trứng gà', category: 'Thịt cá', unit: 'cái' },
      { name: 'Trứng vịt', category: 'Thịt cá', unit: 'cái' },
      
      // Đồ khô
      { name: 'Gạo', category: 'Đồ khô', unit: 'kg' },
      { name: 'Mì tôm', category: 'Đồ khô', unit: 'gói' },
      { name: 'Bún', category: 'Đồ khô', unit: 'gói' },
      { name: 'Phở', category: 'Đồ khô', unit: 'gói' },
      { name: 'Đậu phụ', category: 'Đồ khô', unit: 'cái' },
      { name: 'Đậu xanh', category: 'Đồ khô', unit: 'kg' },
      { name: 'Đậu đen', category: 'Đồ khô', unit: 'kg' },
      { name: 'Bột mì', category: 'Đồ khô', unit: 'kg' },
      { name: 'Bột năng', category: 'Đồ khô', unit: 'kg' },
      
      // Đồ uống
      { name: 'Sữa tươi', category: 'Đồ uống', unit: 'hộp' },
      { name: 'Nước ngọt', category: 'Đồ uống', unit: 'chai' },
      { name: 'Nước lọc', category: 'Đồ uống', unit: 'chai' },
      { name: 'Nước cam', category: 'Đồ uống', unit: 'chai' },
      { name: 'Cà phê', category: 'Đồ uống', unit: 'gói' },
      { name: 'Trà', category: 'Đồ uống', unit: 'gói' },
      
      // Gia vị
      { name: 'Muối', category: 'Gia vị', unit: 'gói' },
      { name: 'Đường', category: 'Gia vị', unit: 'kg' },
      { name: 'Nước mắm', category: 'Gia vị', unit: 'chai' },
      { name: 'Dầu ăn', category: 'Gia vị', unit: 'chai' },
      { name: 'Hạt nêm', category: 'Gia vị', unit: 'gói' },
      { name: 'Tiêu', category: 'Gia vị', unit: 'gói' }
    ];

    const foodItems = {};
    for (const foodData of foodItemsData) {
      let foodItem = await FoodItem.findOne({ name: foodData.name });
      if (!foodItem) {
        const category = categoryMap[foodData.category] || categories[0];
        const unit = unitMap[foodData.unit] || units[0];
        foodItem = await FoodItem.create({
          name: foodData.name,
          categoryId: category._id,
          defaultUnit: unit._id,
          createdBy: demoUser._id
        });
      }
      foodItems[foodData.name] = foodItem;
    }
    console.log(`✅ Đã có ${Object.keys(foodItems).length} FoodItems`);

    // 5. Tính toán thời gian (6 tháng gần đây)
    // now đã được khai báo ở trên
    const sixMonthsAgo = daysAgo(180, now);
    const threeMonthsAgo = daysAgo(90, now);
    const oneMonthAgo = daysAgo(30, now);
    const oneWeekAgo = daysAgo(7, now);

    // 6. Tạo ShoppingLists (15-30 lists)
    console.log('\n🛒 Đang tạo ShoppingLists...');
    const shoppingLists = [];
    const numShoppingLists = randomInt(15, 30);
    
    for (let i = 0; i < numShoppingLists; i++) {
      const plannedDate = randomDate(sixMonthsAgo, now);
      const isCompleted = Math.random() > 0.3; // 70% completed
      const completedAt = isCompleted ? randomDate(plannedDate, now) : null;
      
      // Tạo items cho shopping list
      const numItems = randomInt(3, 8);
      const selectedFoods = Object.keys(foodItems).sort(() => 0.5 - Math.random()).slice(0, numItems);
      
      const items = selectedFoods.map(foodName => {
        const foodItem = foodItems[foodName];
        const unit = unitMap[foodItem.defaultUnit?.name] || units[0];
        const isBought = isCompleted && Math.random() > 0.2; // 80% items bought if completed
        
        return {
          foodItemId: foodItem._id,
          quantity: randomFloat(0.5, 3),
          unitId: unit._id,
          reason: randomChoice(['expired', 'used_up', 'expiring_soon', 'missing_ingredient']),
          isBought: isBought,
          status: isBought ? 'completed' : 'pending',
          purchasedBy: isBought ? demoUser._id : null,
          purchasedAt: isBought ? completedAt : null
        };
      });

      const shoppingList = await ShoppingList.create({
        name: `Danh sách mua sắm ${i + 1}`,
        userId: demoUser._id,
        familyGroupId: demoUser.familyGroupId || null,
        plannedDate: plannedDate,
        status: isCompleted ? 'completed' : (Math.random() > 0.5 ? 'active' : 'draft'),
        items: items,
        completedAt: completedAt,
        notes: 'DEMO_SEED',
        createdAt: plannedDate,
        updatedAt: completedAt || plannedDate
      });

      shoppingLists.push(shoppingList);
    }
    console.log(`✅ Đã tạo ${shoppingLists.length} ShoppingLists`);

    // 7. Tạo FridgeItems (60-120 items) từ ShoppingLists và manual
    console.log('\n🥶 Đang tạo FridgeItems...');
    const fridgeItems = [];
    const numFridgeItems = randomInt(60, 120);
    
    // 7.1. Tạo FridgeItems từ completed ShoppingLists
    for (const shoppingList of shoppingLists.filter(sl => sl.status === 'completed')) {
      for (const item of shoppingList.items.filter(i => i.isBought)) {
        // item.foodItemId có thể là ObjectId hoặc đã được populate
        const foodItemId = item.foodItemId?._id || item.foodItemId;
        const foodItem = await FoodItem.findById(foodItemId);
        
        if (foodItem && Math.random() > 0.3) { // 70% items được thêm vào tủ lạnh
          const purchaseDate = item.purchasedAt || shoppingList.completedAt || shoppingList.updatedAt;
          const expiryDays = randomInt(1, 30);
          const expiryDate = daysAgo(-expiryDays, purchaseDate);
          
          // Xác định status dựa trên expiryDate
          const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
          let status = 'available';
          if (daysUntilExpiry < 0) {
            status = 'expired';
          } else if (daysUntilExpiry <= 3) {
            status = 'expiring_soon';
          }

          const fridgeItem = await FridgeItem.create({
            userId: demoUser._id,
            familyGroupId: demoUser.familyGroupId || null,
            foodItemId: foodItem._id,
            quantity: item.quantity,
            unitId: item.unitId,
            price: randomFloat(10000, 200000),
            purchaseDate: purchaseDate,
            expiryDate: expiryDate,
            storageLocation: randomChoice(['Ngăn mát', 'Ngăn đông', 'Nhiệt độ phòng']),
            status: status,
            source: 'shopping_list',
            sourceShoppingListId: shoppingList._id,
            notes: 'DEMO_SEED',
            createdAt: purchaseDate,
            updatedAt: purchaseDate
          });

          fridgeItems.push(fridgeItem);
        }
      }
    }

    // 7.2. Tạo thêm FridgeItems manual (phân bố trong 6 tháng)
    const remainingItems = Math.max(0, numFridgeItems - fridgeItems.length);
    for (let i = 0; i < remainingItems; i++) {
      const foodName = randomChoice(Object.keys(foodItems));
      const foodItem = foodItems[foodName];
      
      // Lấy unit từ foodItem.defaultUnit (có thể là ObjectId hoặc đã populate)
      let unit;
      if (foodItem.defaultUnit && typeof foodItem.defaultUnit === 'object' && foodItem.defaultUnit.name) {
        unit = unitMap[foodItem.defaultUnit.name] || units[0];
      } else {
        const defaultUnit = await Unit.findById(foodItem.defaultUnit);
        unit = defaultUnit || units[0];
      }
      
      const purchaseDate = randomDate(sixMonthsAgo, now);
      const expiryDays = randomInt(1, 45);
      const expiryDate = daysAgo(-expiryDays, purchaseDate);
      
      // Xác định status
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      let status = 'available';
      if (daysUntilExpiry < 0) {
        status = 'expired';
      } else if (daysUntilExpiry <= 3) {
        status = 'expiring_soon';
      } else if (Math.random() < 0.1) { // 10% used_up
        status = 'used_up';
      }

      const fridgeItem = await FridgeItem.create({
        userId: demoUser._id,
        familyGroupId: demoUser.familyGroupId || null,
        foodItemId: foodItem._id,
        quantity: randomFloat(0.5, 5),
        unitId: unit._id,
        price: randomFloat(10000, 200000),
        purchaseDate: purchaseDate,
        expiryDate: expiryDate,
        storageLocation: randomChoice(['Ngăn mát', 'Ngăn đông', 'Nhiệt độ phòng']),
        status: status,
        source: 'manual',
        notes: 'DEMO_SEED',
        createdAt: purchaseDate,
        updatedAt: purchaseDate
      });

      fridgeItems.push(fridgeItem);
    }
    console.log(`✅ Đã tạo ${fridgeItems.length} FridgeItems`);

    // 8. Tạo ConsumptionLogs (20-60 logs) từ FridgeItems
    console.log('\n🍽️  Đang tạo ConsumptionLogs...');
    const consumptionLogs = [];
    const numConsumptionLogs = randomInt(20, 60);
    
    // Lấy các FridgeItems available hoặc used_up để tạo consumption logs
    const availableFridgeItems = fridgeItems.filter(fi => 
      fi.status === 'available' || fi.status === 'used_up'
    );

    const maxLogs = Math.min(numConsumptionLogs, availableFridgeItems.length);
    for (let i = 0; i < maxLogs; i++) {
      const fridgeItem = randomChoice(availableFridgeItems);
      const foodItemId = fridgeItem.foodItemId?._id || fridgeItem.foodItemId;
      const foodItem = await FoodItem.findById(foodItemId);
      
      if (foodItem) {
        const purchaseDate = new Date(fridgeItem.purchaseDate);
        const startDate = purchaseDate > sixMonthsAgo ? purchaseDate : sixMonthsAgo;
        const consumedDate = randomDate(startDate, now);
        
        const consumedQty = randomFloat(0.1, Math.min(fridgeItem.quantity, 2));

        const consumptionLog = await ConsumptionLog.create({
          userId: demoUser._id,
          familyGroupId: demoUser.familyGroupId || null,
          foodItemId: foodItem._id,
          unitId: fridgeItem.unitId,
          fridgeItemId: fridgeItem._id,
          quantity: consumedQty,
          source: randomChoice(['recipe', 'manual', 'other']),
          notes: 'DEMO_SEED',
          createdAt: consumedDate,
          updatedAt: consumedDate
        });

        consumptionLogs.push(consumptionLog);
      }
    }
    console.log(`✅ Đã tạo ${consumptionLogs.length} ConsumptionLogs`);

    // 9. Tạo MealPlans (6-12 plans)
    console.log('\n📅 Đang tạo MealPlans...');
    const mealPlans = [];
    const numMealPlans = randomInt(6, 12);
    
    // Lấy một số recipes để dùng trong meal plans
    const recipes = await Recipe.find({}).limit(20);
    
    if (recipes.length > 0) {
      for (let i = 0; i < numMealPlans; i++) {
        const startDate = randomDate(sixMonthsAgo, oneWeekAgo);
        const endDate = daysAgo(-randomInt(3, 7), startDate);
        
        // Tạo meals cho meal plan
        const meals = [];
        const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          // Mỗi ngày có 2-3 meals
          const numMealsPerDay = randomInt(2, 3);
          const selectedMealTypes = mealTypes
            .sort(() => 0.5 - Math.random())
            .slice(0, numMealsPerDay);
          
          for (const mealType of selectedMealTypes) {
            const recipe = randomChoice(recipes);
            const isCooked = Math.random() > 0.4; // 60% cooked
            
            meals.push({
              date: new Date(currentDate),
              mealType: mealType,
              recipeId: recipe._id,
              servings: randomInt(2, 6),
              status: isCooked ? 'cooked' : 'planned',
              isAutoSuggested: Math.random() > 0.7,
              cookedAt: isCooked ? randomDate(currentDate, daysAgo(-1, now)) : null
            });
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }

          const mealPlan = await MealPlan.create({
            userId: demoUser._id,
            familyGroupId: demoUser.familyGroupId || null,
            name: `Kế hoạch bữa ăn ${i + 1}`,
            startDate: startDate,
            endDate: endDate,
            meals: meals,
            notes: 'DEMO_SEED',
            createdAt: startDate,
            updatedAt: startDate
          });

        mealPlans.push(mealPlan);
      }
    }
    console.log(`✅ Đã tạo ${mealPlans.length} MealPlans`);

    // 10. Tạo Notifications (40-120 notifications)
    console.log('\n🔔 Đang tạo Notifications...');
    const notifications = [];
    const numNotifications = randomInt(40, 120);
    
    const notificationTypes = [
      'expiry_reminder',
      'expiring_soon',
      'expired',
      'shopping_update',
      'meal_reminder',
      'recipe_cooked',
      'system'
    ];

    // Tạo notifications từ FridgeItems
    for (const fridgeItem of fridgeItems) {
      const foodItemId = fridgeItem.foodItemId?._id || fridgeItem.foodItemId;
      
      if (fridgeItem.status === 'expiring_soon' && Math.random() > 0.5) {
        const foodItem = await FoodItem.findById(foodItemId);
        const notifDate = randomDate(new Date(fridgeItem.createdAt), now);
        notifications.push({
          userId: demoUser._id,
          familyGroupId: demoUser.familyGroupId || null,
          type: 'expiring_soon',
          title: `${foodItem?.name || 'Thực phẩm'} sắp hết hạn`,
          message: `${foodItem?.name || 'Thực phẩm'} sẽ hết hạn trong vòng 3 ngày`,
          relatedId: fridgeItem._id,
          relatedType: 'FridgeItem',
          isRead: Math.random() > 0.3, // 70% unread
          notes: 'DEMO_SEED',
          createdAt: notifDate,
          updatedAt: notifDate
        });
      }
      
      if (fridgeItem.status === 'expired' && Math.random() > 0.6) {
        const foodItem = await FoodItem.findById(foodItemId);
        const expiryDate = new Date(fridgeItem.expiryDate);
        const notifDate = randomDate(expiryDate, now);
        notifications.push({
          userId: demoUser._id,
          familyGroupId: demoUser.familyGroupId || null,
          type: 'expired',
          title: `${foodItem?.name || 'Thực phẩm'} đã hết hạn`,
          message: `${foodItem?.name || 'Thực phẩm'} đã hết hạn, vui lòng kiểm tra`,
          relatedId: fridgeItem._id,
          relatedType: 'FridgeItem',
          isRead: Math.random() > 0.4, // 60% unread
          notes: 'DEMO_SEED',
          createdAt: notifDate,
          updatedAt: notifDate
        });
      }
    }

    // Tạo notifications từ ShoppingLists
    for (const shoppingList of shoppingLists.filter(sl => sl.status === 'completed')) {
      if (Math.random() > 0.7) {
        notifications.push({
          userId: demoUser._id,
          familyGroupId: demoUser.familyGroupId || null,
          type: 'shopping_update',
          title: 'Hoàn thành danh sách mua sắm',
          message: `Bạn đã hoàn thành "${shoppingList.name}"`,
          relatedId: shoppingList._id,
          relatedType: 'ShoppingList',
          isRead: Math.random() > 0.5,
          notes: 'DEMO_SEED',
          createdAt: shoppingList.completedAt || shoppingList.updatedAt,
          updatedAt: shoppingList.completedAt || shoppingList.updatedAt
        });
      }
    }

    // Tạo notifications từ MealPlans
    for (const mealPlan of mealPlans) {
      const cookedMeals = mealPlan.meals.filter(m => m.status === 'cooked');
      if (cookedMeals.length > 0 && Math.random() > 0.8) {
        const meal = randomChoice(cookedMeals);
        const recipe = await Recipe.findById(meal.recipeId);
        if (recipe) {
          notifications.push({
            userId: demoUser._id,
            familyGroupId: demoUser.familyGroupId || null,
            type: 'recipe_cooked',
            title: 'Đã nấu món ăn',
            message: `Bạn đã nấu món "${recipe.name}"`,
            relatedId: recipe._id,
            relatedType: 'Recipe',
            isRead: Math.random() > 0.6,
            notes: 'DEMO_SEED',
            createdAt: meal.cookedAt || meal.date,
            updatedAt: meal.cookedAt || meal.date
          });
        }
      }
    }

    // Tạo thêm system notifications
    const remainingNotifications = numNotifications - notifications.length;
    for (let i = 0; i < remainingNotifications; i++) {
      notifications.push({
        userId: demoUser._id,
        familyGroupId: demoUser.familyGroupId || null,
        type: randomChoice(notificationTypes),
        title: `Thông báo hệ thống ${i + 1}`,
        message: `Đây là thông báo demo số ${i + 1}`,
        isRead: Math.random() > 0.3, // 70% unread để có "9+"
        notes: 'DEMO_SEED',
        createdAt: randomDate(sixMonthsAgo, now),
        updatedAt: randomDate(sixMonthsAgo, now)
      });
    }

    // Đảm bảo có ít nhất 9 notifications unread để hiển thị "9+"
    const unreadCount = notifications.filter(n => !n.isRead).length;
    if (unreadCount < 9) {
      for (let i = unreadCount; i < 9; i++) {
        notifications.push({
          userId: demoUser._id,
          familyGroupId: demoUser.familyGroupId || null,
          type: 'system',
          title: `Thông báo chưa đọc ${i + 1}`,
          message: `Thông báo demo chưa đọc số ${i + 1}`,
          isRead: false,
          notes: 'DEMO_SEED',
          createdAt: randomDate(oneWeekAgo, now),
          updatedAt: randomDate(oneWeekAgo, now)
        });
      }
    }

    const createdNotifications = await Notification.insertMany(notifications);
    console.log(`✅ Đã tạo ${createdNotifications.length} Notifications`);
    console.log(`   → Unread: ${createdNotifications.filter(n => !n.isRead).length}`);

    // 11. Tổng kết
    console.log('\n' + '='.repeat(60));
    console.log('📊 TỔNG KẾT DỮ LIỆU DEMO ĐÃ TẠO:');
    console.log('='.repeat(60));
    console.log(`👤 User đang seed:`);
    console.log(`   - Email: ${demoUser.email}`);
    console.log(`   - Full Name: ${demoUser.fullName}`);
    console.log(`   - ID: ${demoUser._id}`);
    if (demoUser.familyGroupId) {
      console.log(`   - Family Group ID: ${demoUser.familyGroupId}`);
    }
    console.log(`\n📦 Dữ liệu đã tạo:`);
    console.log(`🥬 FoodItems: ${Object.keys(foodItems).length}`);
    console.log(`🛒 ShoppingLists: ${shoppingLists.length}`);
    console.log(`🥶 FridgeItems: ${fridgeItems.length}`);
    console.log(`🍽️  ConsumptionLogs: ${consumptionLogs.length}`);
    console.log(`📅 MealPlans: ${mealPlans.length}`);
    console.log(`🔔 Notifications: ${createdNotifications.length}`);
    console.log('='.repeat(60));

    // 12. Thống kê chi tiết
    const fridgeStatusCount = {
      available: fridgeItems.filter(fi => fi.status === 'available').length,
      expiring_soon: fridgeItems.filter(fi => fi.status === 'expiring_soon').length,
      expired: fridgeItems.filter(fi => fi.status === 'expired').length,
      used_up: fridgeItems.filter(fi => fi.status === 'used_up').length
    };

    const shoppingListStatusCount = {
      draft: shoppingLists.filter(sl => sl.status === 'draft').length,
      active: shoppingLists.filter(sl => sl.status === 'active').length,
      completed: shoppingLists.filter(sl => sl.status === 'completed').length
    };

    console.log('\n📈 CHI TIẾT:');
    console.log('FridgeItems status:', fridgeStatusCount);
    console.log('ShoppingLists status:', shoppingListStatusCount);
    console.log(`Notifications unread: ${createdNotifications.filter(n => !n.isRead).length}`);

    console.log('\n✅ DEMO SEED DONE ✅');
    console.log('💡 Bây giờ bạn có thể xem Dashboard và Statistics với dữ liệu demo đầy đủ!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Lỗi khi seed dữ liệu demo:', error);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedDemoData();
