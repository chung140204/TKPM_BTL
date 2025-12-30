/**
 * Unit Model
 * Schema cho đơn vị tính
 */

const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên đơn vị là bắt buộc'],
    unique: true,
    trim: true
  },
  abbreviation: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['weight', 'volume', 'count', 'package'],
    required: true
  }
}, {
  timestamps: true
});

// Indexes
unitSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Unit', unitSchema);



