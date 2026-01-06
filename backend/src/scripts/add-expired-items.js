/**
 * Add expired fridge items for a specific user (by email)
 *
 * Usage:
 *   node src/scripts/add-expired-items.js duytungihb@gmail.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');
const Category = require('../models/Category.model');
const Unit = require('../models/Unit.model');
const FoodItem = require('../models/FoodItem.model');
const FridgeItem = require('../models/FridgeItem.model');

const EMAIL = process.argv[2];

const buildPastDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(0, 0, 0, 0);
  return date;
};

const expiredItems = [
  {
    name: 'Sua tuoi',
    category: 'Sua',
    quantity: 1.5,
    storageLocation: 'Ngan mat',
    daysAgo: 2
  },
  {
    name: 'Thit ga',
    category: 'Thit',
    quantity: 0.8,
    storageLocation: 'Ngan dong',
    daysAgo: 5
  },
  {
    name: 'Rau cai',
    category: 'Rau cu',
    quantity: 0.6,
    storageLocation: 'Ngan mat',
    daysAgo: 1
  }
];

async function ensureUnit() {
  const unit = await Unit.findOne({
    $or: [
      { name: 'kg' },
      { name: 'kilogram' },
      { abbreviation: 'kg' }
    ]
  });

  if (unit) return unit;

  return Unit.create({
    name: 'kilogram',
    abbreviation: 'kg',
    type: 'weight'
  });
}

async function ensureCategory(name) {
  const existing = await Category.findOne({ name });
  if (existing) return existing;

  return Category.create({
    name,
    description: 'Test expired items'
  });
}

async function ensureFoodItem(name, categoryId, unitId, userId) {
  const existing = await FoodItem.findOne({ name });
  if (existing) return existing;

  return FoodItem.create({
    name,
    categoryId,
    defaultUnit: unitId,
    createdBy: userId
  });
}

async function main() {
  if (!EMAIL) {
    console.log('Usage: node src/scripts/add-expired-items.js <email>');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery_shopping', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const user = await User.findOne({ email: EMAIL.toLowerCase().trim() });
  if (!user) {
    console.log(`❌ Khong tim thay user: ${EMAIL}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const unit = await ensureUnit();

  await FridgeItem.deleteMany({
    userId: user._id,
    notes: 'test-expired'
  });

  const itemsToInsert = [];

  for (const item of expiredItems) {
    const category = await ensureCategory(item.category);
    const foodItem = await ensureFoodItem(item.name, category._id, unit._id, user._id);
    const expiryDate = buildPastDate(item.daysAgo);
    const purchaseDate = buildPastDate(item.daysAgo + 3);

    itemsToInsert.push({
      userId: user._id,
      foodItemId: foodItem._id,
      unitId: unit._id,
      quantity: item.quantity,
      price: 0,
      purchaseDate,
      expiryDate,
      storageLocation: item.storageLocation,
      status: 'expired',
      source: 'manual',
      notes: 'test-expired'
    });
  }

  const created = await FridgeItem.insertMany(itemsToInsert);

  console.log(`✅ Da them ${created.length} thuc pham het han cho ${EMAIL}:`);
  created.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.foodItemId} - het han: ${item.expiryDate.toLocaleDateString('vi-VN')}`);
  });

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('❌ Loi khi tao du lieu test:', error);
  mongoose.disconnect();
  process.exit(1);
});
