/**
 * FridgeItem Model
 * Schema cho thực phẩm trong tủ lạnh
 */

const mongoose = require('mongoose');

const fridgeItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  familyGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyGroup',
    default: null
  },
  foodItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodItem',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: [true, 'Ngày hết hạn là bắt buộc']
  },
  storageLocation: {
    type: String,
    trim: true,
    default: 'Ngăn mát'
  },
  status: {
    type: String,
    enum: ['available', 'expiring_soon', 'expired', 'used_up'],
    default: 'available'
  },
  notes: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    enum: ['manual', 'shopping_list'],
    default: 'manual'
  },
  sourceShoppingListId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShoppingList',
    default: null
  }
}, {
  timestamps: true
});

// Indexes
fridgeItemSchema.index({ userId: 1 });
fridgeItemSchema.index({ familyGroupId: 1 });
fridgeItemSchema.index({ expiryDate: 1 });
fridgeItemSchema.index({ status: 1 });
fridgeItemSchema.index({ userId: 1, status: 1, expiryDate: 1 });

// Method để cập nhật status dựa trên expiryDate
fridgeItemSchema.methods.updateStatus = function() {
  // Không cập nhật status nếu đã used_up
  if (this.status === 'used_up') {
    return;
  }

  const now = new Date();
  const expiryDate = new Date(this.expiryDate);
  const diffTime = expiryDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    this.status = 'expired';
  } else if (diffDays <= 3) {
    this.status = 'expiring_soon';
  } else {
    this.status = 'available';
  }
};

// Method để tính số ngày còn lại
fridgeItemSchema.methods.getDaysLeft = function() {
  const now = new Date();
  const expiryDate = new Date(this.expiryDate);
  const diffTime = expiryDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model('FridgeItem', fridgeItemSchema);

