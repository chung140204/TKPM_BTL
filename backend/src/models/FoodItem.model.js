/**
 * FoodItem Model
 * Schema cho thực phẩm cơ bản trong hệ thống
 */

const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên thực phẩm là bắt buộc'],
    unique: true,
    trim: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Danh mục là bắt buộc']
  },
  defaultUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: [true, 'Đơn vị mặc định là bắt buộc']
  },
  image: {
    type: String,
    default: null
  },
  description: {
    type: String,
    trim: true
  },
  averageExpiryDays: {
    type: Number,
    default: null // Số ngày hết hạn trung bình
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
foodItemSchema.index({ name: 1 }, { unique: true });
foodItemSchema.index({ categoryId: 1 });
foodItemSchema.index({ name: 'text' }); // Text search

module.exports = mongoose.model('FoodItem', foodItemSchema);



