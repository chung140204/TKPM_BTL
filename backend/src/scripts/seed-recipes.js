/**
 * Seed extra recipes without wiping existing data.
 *
 * Run: node src/scripts/seed-recipes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User.model');
const FoodItem = require('../models/FoodItem.model');
const Unit = require('../models/Unit.model');
const Recipe = require('../models/Recipe.model');

const pickMap = (items, key) => new Map(items.map(item => [item[key], item]));

const seedRecipes = async () => {
  try {
    console.log('🔄 Kết nối MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery_shopping');
    console.log('✅ Kết nối MongoDB thành công');

    const adminUser = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
    if (!adminUser) {
      throw new Error('Không tìm thấy admin user để gán recipe');
    }

    const unitNames = ['kg', 'ml', 'cái', 'gói', 'bó'];
    const units = await Unit.find({ name: { $in: unitNames } });
    const unitMap = pickMap(units, 'name');
    const missingUnits = unitNames.filter(name => !unitMap.has(name));
    if (missingUnits.length > 0) {
      throw new Error(`Thiếu units: ${missingUnits.join(', ')}`);
    }

    const foodNames = [
      'Gạo',
      'Cà chua',
      'Thịt heo',
      'Thịt bò',
      'Cá',
      'Tôm',
      'Hành tây',
      'Tỏi',
      'Rau muống',
      'Mì tôm',
      'Nước mắm'
    ];
    const foodItems = await FoodItem.find({ name: { $in: foodNames } });
    const foodMap = pickMap(foodItems, 'name');
    const missingFoods = foodNames.filter(name => !foodMap.has(name));
    if (missingFoods.length > 0) {
      throw new Error(`Thiếu food items: ${missingFoods.join(', ')}`);
    }

    const unitKg = unitMap.get('kg');
    const unitMl = unitMap.get('ml');
    const unitCai = unitMap.get('cái');
    const unitGoi = unitMap.get('gói');
    const unitBo = unitMap.get('bó');

    const gao = foodMap.get('Gạo');
    const caChua = foodMap.get('Cà chua');
    const thitHeo = foodMap.get('Thịt heo');
    const thitBo = foodMap.get('Thịt bò');
    const ca = foodMap.get('Cá');
    const tom = foodMap.get('Tôm');
    const hanhTay = foodMap.get('Hành tây');
    const toi = foodMap.get('Tỏi');
    const rauMuong = foodMap.get('Rau muống');
    const miTom = foodMap.get('Mì tôm');
    const nuocMam = foodMap.get('Nước mắm');

    const now = new Date();

    const recipes = [
      {
        name: 'Rau muống xào tỏi',
        description: 'Rau muống xanh giòn xào thơm mùi tỏi',
        image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
        servings: 3,
        prepTime: 10,
        cookTime: 10,
        difficulty: 'easy',
        category: 'Món xào',
        ingredients: [
          { foodItemId: rauMuong._id, quantity: 1, unitId: unitBo._id, notes: 'Rửa sạch' },
          { foodItemId: toi._id, quantity: 3, unitId: unitCai._id, notes: 'Băm nhỏ' },
          { foodItemId: nuocMam._id, quantity: 10, unitId: unitMl._id, notes: 'Nêm nếm' }
        ],
        instructions: [
          { step: 1, description: 'Phi thơm tỏi với chút dầu' },
          { step: 2, description: 'Cho rau muống vào đảo nhanh tay' },
          { step: 3, description: 'Nêm nước mắm vừa ăn rồi tắt bếp' }
        ],
        tags: ['rau', 'xào', 'tỏi'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: now,
        favoriteCount: 0
      },
      {
        name: 'Canh cà chua thịt heo',
        description: 'Canh cà chua chua nhẹ, dễ ăn',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
        servings: 4,
        prepTime: 10,
        cookTime: 20,
        difficulty: 'easy',
        category: 'Canh',
        ingredients: [
          { foodItemId: caChua._id, quantity: 0.4, unitId: unitKg._id, notes: 'Cắt múi' },
          { foodItemId: thitHeo._id, quantity: 0.2, unitId: unitKg._id, notes: 'Thái mỏng' },
          { foodItemId: hanhTay._id, quantity: 0.1, unitId: unitKg._id, notes: 'Thái lát' },
          { foodItemId: toi._id, quantity: 2, unitId: unitCai._id, notes: 'Đập dập' }
        ],
        instructions: [
          { step: 1, description: 'Phi thơm tỏi, xào thịt heo' },
          { step: 2, description: 'Cho cà chua và hành tây vào đảo đều' },
          { step: 3, description: 'Thêm nước, đun sôi và nêm vừa ăn' }
        ],
        tags: ['canh', 'cà chua', 'thịt heo'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: now,
        favoriteCount: 0
      },
      {
        name: 'Thịt bò xào hành tây',
        description: 'Thịt bò mềm thơm, hành tây ngọt',
        image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
        servings: 3,
        prepTime: 15,
        cookTime: 12,
        difficulty: 'medium',
        category: 'Món xào',
        ingredients: [
          { foodItemId: thitBo._id, quantity: 0.3, unitId: unitKg._id, notes: 'Thái lát' },
          { foodItemId: hanhTay._id, quantity: 0.2, unitId: unitKg._id, notes: 'Thái múi cau' },
          { foodItemId: toi._id, quantity: 2, unitId: unitCai._id, notes: 'Băm nhỏ' },
          { foodItemId: nuocMam._id, quantity: 15, unitId: unitMl._id, notes: 'Ướp thịt' }
        ],
        instructions: [
          { step: 1, description: 'Ướp thịt bò với nước mắm và tỏi' },
          { step: 2, description: 'Xào thịt bò lửa lớn cho săn' },
          { step: 3, description: 'Cho hành tây vào đảo nhanh rồi tắt bếp' }
        ],
        tags: ['bò', 'xào', 'hành tây'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: now,
        favoriteCount: 0
      },
      {
        name: 'Tôm xào cà chua',
        description: 'Tôm ngọt, cà chua đậm vị',
        image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
        servings: 3,
        prepTime: 10,
        cookTime: 12,
        difficulty: 'easy',
        category: 'Món xào',
        ingredients: [
          { foodItemId: tom._id, quantity: 0.3, unitId: unitKg._id, notes: 'Làm sạch' },
          { foodItemId: caChua._id, quantity: 0.2, unitId: unitKg._id, notes: 'Cắt nhỏ' },
          { foodItemId: hanhTay._id, quantity: 0.1, unitId: unitKg._id, notes: 'Thái lát' },
          { foodItemId: toi._id, quantity: 2, unitId: unitCai._id, notes: 'Băm nhỏ' }
        ],
        instructions: [
          { step: 1, description: 'Phi thơm tỏi và hành tây' },
          { step: 2, description: 'Cho tôm vào xào săn' },
          { step: 3, description: 'Thêm cà chua, đảo đến khi sệt lại' }
        ],
        tags: ['tôm', 'xào', 'cà chua'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: now,
        favoriteCount: 0
      },
      {
        name: 'Cá chiên nước mắm',
        description: 'Cá chiên vàng, áo nước mắm thơm',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        servings: 3,
        prepTime: 10,
        cookTime: 15,
        difficulty: 'medium',
        category: 'Món chính',
        ingredients: [
          { foodItemId: ca._id, quantity: 0.4, unitId: unitKg._id, notes: 'Rửa sạch' },
          { foodItemId: nuocMam._id, quantity: 20, unitId: unitMl._id, notes: 'Pha sốt' },
          { foodItemId: toi._id, quantity: 2, unitId: unitCai._id, notes: 'Băm nhỏ' }
        ],
        instructions: [
          { step: 1, description: 'Chiên cá vàng đều hai mặt' },
          { step: 2, description: 'Phi tỏi, thêm nước mắm làm sốt' },
          { step: 3, description: 'Rưới sốt lên cá trước khi dùng' }
        ],
        tags: ['cá', 'chiên', 'nước mắm'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: now,
        favoriteCount: 0
      },
      {
        name: 'Thịt heo rim nước mắm',
        description: 'Thịt heo rim mặn ngọt, đậm vị',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
        servings: 4,
        prepTime: 10,
        cookTime: 25,
        difficulty: 'medium',
        category: 'Món chính',
        ingredients: [
          { foodItemId: thitHeo._id, quantity: 0.4, unitId: unitKg._id, notes: 'Thái miếng' },
          { foodItemId: nuocMam._id, quantity: 30, unitId: unitMl._id, notes: 'Pha sốt' },
          { foodItemId: toi._id, quantity: 2, unitId: unitCai._id, notes: 'Đập dập' },
          { foodItemId: hanhTay._id, quantity: 0.1, unitId: unitKg._id, notes: 'Thái lát' }
        ],
        instructions: [
          { step: 1, description: 'Phi thơm tỏi và hành tây' },
          { step: 2, description: 'Cho thịt heo vào đảo săn' },
          { step: 3, description: 'Thêm nước mắm, rim nhỏ lửa đến sệt' }
        ],
        tags: ['thịt heo', 'rim', 'nước mắm'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: now,
        favoriteCount: 0
      },
      {
        name: 'Cháo thịt bằm',
        description: 'Cháo nóng dễ ăn, phù hợp bữa nhẹ',
        image: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800',
        servings: 3,
        prepTime: 10,
        cookTime: 30,
        difficulty: 'easy',
        category: 'Món chính',
        ingredients: [
          { foodItemId: gao._id, quantity: 0.2, unitId: unitKg._id, notes: 'Vo sạch' },
          { foodItemId: thitHeo._id, quantity: 0.2, unitId: unitKg._id, notes: 'Băm nhỏ' },
          { foodItemId: toi._id, quantity: 2, unitId: unitCai._id, notes: 'Băm nhỏ' }
        ],
        instructions: [
          { step: 1, description: 'Nấu gạo với nhiều nước đến nhừ' },
          { step: 2, description: 'Phi thơm tỏi, xào thịt băm' },
          { step: 3, description: 'Cho thịt vào nồi cháo, nêm vừa ăn' }
        ],
        tags: ['cháo', 'thịt heo'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: now,
        favoriteCount: 0
      },
      {
        name: 'Cơm chiên tỏi',
        description: 'Cơm chiên thơm mùi tỏi, nhanh gọn',
        image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
        servings: 3,
        prepTime: 10,
        cookTime: 12,
        difficulty: 'easy',
        category: 'Món chính',
        ingredients: [
          { foodItemId: gao._id, quantity: 0.4, unitId: unitKg._id, notes: 'Cơm nguội' },
          { foodItemId: toi._id, quantity: 3, unitId: unitCai._id, notes: 'Băm nhỏ' },
          { foodItemId: nuocMam._id, quantity: 10, unitId: unitMl._id, notes: 'Nêm nếm' }
        ],
        instructions: [
          { step: 1, description: 'Phi thơm tỏi trên chảo nóng' },
          { step: 2, description: 'Cho cơm vào đảo đều' },
          { step: 3, description: 'Nêm nước mắm vừa ăn rồi tắt bếp' }
        ],
        tags: ['cơm', 'chiên', 'tỏi'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: now,
        favoriteCount: 0
      },
      {
        name: 'Mì tôm tỏi',
        description: 'Mì tôm đơn giản, thơm tỏi',
        image: 'https://images.unsplash.com/photo-1506354666786-959d6d497f1a?w=800',
        servings: 2,
        prepTime: 5,
        cookTime: 6,
        difficulty: 'easy',
        category: 'Món chính',
        ingredients: [
          { foodItemId: miTom._id, quantity: 2, unitId: unitGoi._id, notes: 'Gói mì' },
          { foodItemId: toi._id, quantity: 2, unitId: unitCai._id, notes: 'Băm nhỏ' },
          { foodItemId: nuocMam._id, quantity: 10, unitId: unitMl._id, notes: 'Nêm nếm' }
        ],
        instructions: [
          { step: 1, description: 'Nấu mì theo hướng dẫn' },
          { step: 2, description: 'Phi thơm tỏi rồi trộn vào mì' },
          { step: 3, description: 'Nêm nước mắm vừa ăn' }
        ],
        tags: ['mì', 'nhanh', 'tỏi'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: now,
        favoriteCount: 0
      },
      {
        name: 'Canh rau muống thịt bò',
        description: 'Canh rau muống nấu thịt bò thanh nhẹ',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        servings: 4,
        prepTime: 10,
        cookTime: 15,
        difficulty: 'easy',
        category: 'Canh',
        ingredients: [
          { foodItemId: rauMuong._id, quantity: 1, unitId: unitBo._id, notes: 'Rửa sạch' },
          { foodItemId: thitBo._id, quantity: 0.2, unitId: unitKg._id, notes: 'Thái mỏng' },
          { foodItemId: toi._id, quantity: 2, unitId: unitCai._id, notes: 'Đập dập' }
        ],
        instructions: [
          { step: 1, description: 'Đun sôi nước, cho tỏi và thịt bò vào' },
          { step: 2, description: 'Thả rau muống vào, nêm vừa ăn' },
          { step: 3, description: 'Tắt bếp khi rau chín tới' }
        ],
        tags: ['canh', 'rau muống', 'bò'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: now,
        favoriteCount: 0
      },
      {
        name: 'Tôm rang tỏi',
        description: 'Tôm rang thơm, đậm vị tỏi',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        servings: 3,
        prepTime: 10,
        cookTime: 12,
        difficulty: 'easy',
        category: 'Món chính',
        ingredients: [
          { foodItemId: tom._id, quantity: 0.3, unitId: unitKg._id, notes: 'Làm sạch' },
          { foodItemId: toi._id, quantity: 2, unitId: unitCai._id, notes: 'Băm nhỏ' },
          { foodItemId: nuocMam._id, quantity: 15, unitId: unitMl._id, notes: 'Nêm nếm' }
        ],
        instructions: [
          { step: 1, description: 'Phi thơm tỏi rồi cho tôm vào đảo' },
          { step: 2, description: 'Rang đến khi tôm đỏ đều' },
          { step: 3, description: 'Nêm nước mắm vừa ăn' }
        ],
        tags: ['tôm', 'rang', 'tỏi'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: now,
        favoriteCount: 0
      },
      {
        name: 'Cá kho tỏi',
        description: 'Cá kho đậm đà với tỏi và hành',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
        servings: 4,
        prepTime: 10,
        cookTime: 30,
        difficulty: 'medium',
        category: 'Món chính',
        ingredients: [
          { foodItemId: ca._id, quantity: 0.5, unitId: unitKg._id, notes: 'Cắt khúc' },
          { foodItemId: toi._id, quantity: 3, unitId: unitCai._id, notes: 'Đập dập' },
          { foodItemId: nuocMam._id, quantity: 25, unitId: unitMl._id, notes: 'Pha nước kho' },
          { foodItemId: hanhTay._id, quantity: 0.1, unitId: unitKg._id, notes: 'Thái lát' }
        ],
        instructions: [
          { step: 1, description: 'Phi thơm tỏi và hành tây' },
          { step: 2, description: 'Cho cá vào, thêm nước mắm' },
          { step: 3, description: 'Kho lửa nhỏ đến khi thấm' }
        ],
        tags: ['cá', 'kho', 'tỏi'],
        createdBy: adminUser._id,
        isApproved: true,
        approvedBy: adminUser._id,
        approvedAt: now,
        favoriteCount: 0
      }
    ];

    const recipeNames = recipes.map(recipe => recipe.name);
    const existing = await Recipe.find({ name: { $in: recipeNames } }).select('name');
    const existingNames = new Set(existing.map(recipe => recipe.name.toLowerCase()));
    const newRecipes = recipes.filter(recipe => !existingNames.has(recipe.name.toLowerCase()));

    if (newRecipes.length === 0) {
      console.log('ℹ️  Không có recipe mới để thêm.');
    } else {
      const inserted = await Recipe.insertMany(newRecipes);
      console.log(`✅ Đã thêm ${inserted.length} recipes mới.`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi thêm recipes:', error);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('⚠️  Lỗi khi đóng kết nối MongoDB:', disconnectError);
    }
    process.exit(1);
  }
};

seedRecipes();
