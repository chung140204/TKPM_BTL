/**
 * Import Mock Recipes Script
 * Import các recipes từ mockData.js vào database
 *
 * Chạy: node src/scripts/import-mock-recipes.js
 *
 * LƯU Ý:
 * - Yêu cầu đã chạy seed.js trước để có User, FoodItem, Unit, Category.
 * - Script này sẽ tìm hoặc tạo FoodItem/Unit nếu chưa có.
 * - Các recipes sẽ được approve tự động nếu tạo bởi admin.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const User = require('../models/User.model');
const FoodItem = require('../models/FoodItem.model');
const Unit = require('../models/Unit.model');
const Category = require('../models/Category.model');
const Recipe = require('../models/Recipe.model');

// Đọc mockRecipes từ file frontend/src/data/mockData.js
const mockDataPath = path.join(__dirname, '../../../frontend/src/data/mockData.js');
let mockRecipes = [];

try {
  // Đọc file và extract mockRecipes
  if (!fs.existsSync(mockDataPath)) {
    throw new Error(`File không tồn tại: ${mockDataPath}`);
  }
  
  const mockDataContent = fs.readFileSync(mockDataPath, 'utf8');
  
  // Extract export const mockRecipes = [...]
  // Tìm từ "export const mockRecipes = [" đến "]" trước "export" tiếp theo hoặc end of file
  const startPattern = /export\s+const\s+mockRecipes\s*=\s*\[/;
  const startMatch = mockDataContent.match(startPattern);
  
  if (!startMatch) {
    throw new Error('Không tìm thấy "export const mockRecipes" trong file mockData.js');
  }
  
  const startIndex = startMatch.index + startMatch[0].length;
  let bracketCount = 1; // Đã có 1 dấu [ từ pattern
  let endIndex = startIndex;
  
  // Tìm dấu ] đóng tương ứng
  for (let i = startIndex; i < mockDataContent.length; i++) {
    if (mockDataContent[i] === '[') bracketCount++;
    if (mockDataContent[i] === ']') bracketCount--;
    if (bracketCount === 0) {
      endIndex = i;
      break;
    }
  }
  
  if (bracketCount !== 0) {
    throw new Error('Không tìm thấy dấu ] đóng cho mockRecipes array');
  }
  
  // Extract array string (bao gồm cả dấu [ và ])
  const arrayString = mockDataContent.substring(startMatch.index + startMatch[0].length - 1, endIndex + 1);
  
  try {
    // Eval để parse array
    mockRecipes = eval(arrayString);
    if (!Array.isArray(mockRecipes)) {
      throw new Error('mockRecipes không phải là array');
    }
    console.log(`✅ Đã đọc ${mockRecipes.length} recipes từ mockData.js`);
  } catch (parseError) {
    throw new Error(`Lỗi khi parse mockRecipes: ${parseError.message}`);
  }
  
} catch (error) {
  console.error('❌ Lỗi khi đọc mockData.js:', error.message);
  console.error('   File path:', mockDataPath);
  console.log('\n⚠️  Script sẽ dừng lại. Vui lòng kiểm tra file mockData.js.');
  process.exit(1);
}

// Helper: Parse quantity string (e.g., "0.5 kg" -> { quantity: 0.5, unit: "kg" })
function parseQuantityString(quantityStr) {
  if (!quantityStr) return { quantity: 0, unit: '' };
  
  const match = String(quantityStr).match(/^([\d.]+)\s*(.+)?$/);
  if (match) {
    return {
      quantity: parseFloat(match[1]) || 0,
      unit: match[2]?.trim() || ''
    };
  }
  
  const num = parseFloat(quantityStr);
  return {
    quantity: isNaN(num) ? 0 : num,
    unit: ''
  };
}

// Helper: Find or create FoodItem
async function findOrCreateFoodItem(name, adminUser) {
  let foodItem = await FoodItem.findOne({ name: new RegExp(`^${name}$`, 'i') });
  
  if (!foodItem) {
    // Tìm category mặc định (Rau củ hoặc Thịt cá)
    let category = await Category.findOne({ name: 'Rau củ' });
    if (!category) {
      category = await Category.findOne({});
    }
    
    // Tìm unit mặc định (kg)
    let unit = await Unit.findOne({ name: 'kg' });
    if (!unit) {
      unit = await Unit.findOne({});
    }
    
    if (!category || !unit) {
      throw new Error(`Không tìm thấy Category hoặc Unit để tạo FoodItem: ${name}`);
    }
    
    foodItem = await FoodItem.create({
      name: name,
      categoryId: category._id,
      defaultUnit: unit._id,
      description: `Auto-created from mock recipes: ${name}`,
      createdBy: adminUser._id,
      isActive: true
    });
    
    console.log(`  ✅ Đã tạo FoodItem mới: ${name}`);
  }
  
  return foodItem;
}

// Helper: Find or create Unit
async function findOrCreateUnit(unitName) {
  if (!unitName) {
    // Default to kg
    let unit = await Unit.findOne({ name: 'kg' });
    if (!unit) {
      unit = await Unit.findOne({});
    }
    return unit;
  }
  
  // Normalize unit names
  const unitMap = {
    'kg': 'kg',
    'g': 'gram',
    'ml': 'ml',
    'l': 'lít',
    'lít': 'lít',
    'ổ': 'cái',
    'bó': 'bó',
    'quả': 'cái',
    'lá': 'cái',
    'tép': 'cái',
    'cây': 'cái',
    'miếng': 'cái',
    'gói': 'gói',
    'chai': 'chai'
  };
  
  const normalizedName = unitMap[unitName.toLowerCase()] || unitName.toLowerCase();
  
  let unit = await Unit.findOne({ 
    $or: [
      { name: new RegExp(`^${normalizedName}$`, 'i') },
      { abbreviation: new RegExp(`^${normalizedName}$`, 'i') }
    ]
  });
  
  if (!unit) {
    // Determine type
    let type = 'count';
    if (['kg', 'gram', 'g'].includes(normalizedName)) type = 'weight';
    else if (['ml', 'lít', 'l'].includes(normalizedName)) type = 'volume';
    else if (['gói', 'chai'].includes(normalizedName)) type = 'package';
    
    unit = await Unit.create({
      name: normalizedName,
      abbreviation: normalizedName,
      type: type
    });
    
    console.log(`  ✅ Đã tạo Unit mới: ${normalizedName}`);
  }
  
  return unit;
}

async function importMockRecipes() {
  try {
    console.log('🔄 Đang kết nối MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
      autoIndex: false
    });
    console.log('✅ Kết nối MongoDB thành công');

    // 1. Tìm admin user
    const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne({});
    if (!adminUser) {
      throw new Error('Không tìm thấy user để gán recipes. Hãy chạy seed.js trước.');
    }
    console.log(`👤 Sử dụng user: ${adminUser.email}`);

    // 2. Lấy tất cả FoodItems và Units hiện có để cache
    const existingFoodItems = await FoodItem.find({});
    const existingUnits = await Unit.find({});
    
    const foodItemCache = new Map();
    const unitCache = new Map();
    
    existingFoodItems.forEach(item => {
      foodItemCache.set(item.name.toLowerCase(), item);
    });
    
    existingUnits.forEach(unit => {
      unitCache.set(unit.name.toLowerCase(), unit);
      if (unit.abbreviation) {
        unitCache.set(unit.abbreviation.toLowerCase(), unit);
      }
    });

    console.log(`\n🍳 Đang import ${mockRecipes.length} recipes từ mockData...`);

    let createdCount = 0;
    let deletedCount = 0;
    const errors = [];

    for (const mockRecipe of mockRecipes) {
      try {
        // Kiểm tra xem recipe đã tồn tại chưa - NẾU TRÙNG THÌ XÓA DỮ LIỆU CŨ
        const existingRecipe = await Recipe.findOne({ name: mockRecipe.name });
        if (existingRecipe) {
          console.log(`🗑️  Xóa recipe cũ: "${mockRecipe.name}"`);
          await Recipe.deleteOne({ _id: existingRecipe._id });
          deletedCount++;
        }

        // Parse và tìm/create ingredients
        const allIngredients = [
          ...(mockRecipe.availableIngredients || []),
          ...(mockRecipe.missingIngredients || [])
        ];

        const recipeIngredients = [];
        
        for (const ing of allIngredients) {
          const { quantity: qty, unit: unitStr } = parseQuantityString(ing.quantity);
          
          // Find or create FoodItem
          let foodItem = foodItemCache.get(ing.name.toLowerCase());
          if (!foodItem) {
            foodItem = await findOrCreateFoodItem(ing.name, adminUser);
            foodItemCache.set(ing.name.toLowerCase(), foodItem);
          }
          
          // Find or create Unit
          let unit = unitStr ? unitCache.get(unitStr.toLowerCase()) : null;
          if (!unit && unitStr) {
            unit = await findOrCreateUnit(unitStr);
            if (unit) {
              unitCache.set(unit.name.toLowerCase(), unit);
              if (unit.abbreviation) {
                unitCache.set(unit.abbreviation.toLowerCase(), unit);
              }
            }
          }
          
          if (!unit) {
            // Fallback to default unit from FoodItem
            unit = await Unit.findById(foodItem.defaultUnit);
          }
          
          if (!unit) {
            throw new Error(`Không tìm thấy Unit cho ingredient: ${ing.name} (${ing.quantity})`);
          }

          recipeIngredients.push({
            foodItemId: foodItem._id,
            quantity: qty,
            unitId: unit._id
          });
        }

        // Tạo recipe
        const recipe = await Recipe.create({
          name: mockRecipe.name,
          description: mockRecipe.description || '',
          image: mockRecipe.image || null,
          servings: mockRecipe.servings || 4,
          prepTime: mockRecipe.prepTime || 0,
          cookTime: mockRecipe.cookTime || 0,
          difficulty: mockRecipe.difficulty || 'medium',
          category: mockRecipe.category || 'Món chính',
          ingredients: recipeIngredients,
          instructions: mockRecipe.instructions || [],
          tags: [],
          createdBy: adminUser._id,
          isApproved: true, // Auto approve
          approvedBy: adminUser._id,
          approvedAt: new Date(),
          favoriteCount: mockRecipe.isFavorite ? 1 : 0
        });

        console.log(`✅ Đã tạo recipe: "${mockRecipe.name}" (${recipeIngredients.length} nguyên liệu)`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Lỗi khi import "${mockRecipe.name}":`, error.message);
        errors.push({ recipe: mockRecipe.name, error: error.message });
      }
    }

    console.log('\n🎉 Import hoàn tất!');
    console.log(`✅ Đã tạo: ${createdCount} recipes`);
    console.log(`🗑️  Đã xóa: ${deletedCount} recipes cũ (trùng tên)`);
    
    if (errors.length > 0) {
      console.log(`\n❌ Có ${errors.length} lỗi:`);
      errors.forEach(e => {
        console.log(`   - ${e.recipe}: ${e.error}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi import mock recipes:', error);
    process.exit(1);
  }
}

importMockRecipes();

