/**
 * Category Model
 * Schema cho danh mục thực phẩm
 */

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên danh mục là bắt buộc'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  icon: {
    type: String,
    default: null
  },
  color: {
    type: String,
    default: '#4CAF50'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes
categorySchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);



