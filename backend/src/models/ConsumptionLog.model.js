/**
 * ConsumptionLog Model
 * Ghi nhận lịch sử tiêu thụ thực phẩm (nấu ăn, dùng thủ công, ...)
 */

const mongoose = require('mongoose');

const consumptionLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  foodItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodItem',
    required: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  fridgeItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FridgeItem',
    default: null
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  source: {
    type: String,
    enum: ['recipe', 'manual', 'other'],
    default: 'other'
  },
  recipeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    default: null
  }
}, {
  timestamps: true
});

consumptionLogSchema.index({ userId: 1, createdAt: -1 });
consumptionLogSchema.index({ userId: 1, foodItemId: 1, createdAt: -1 });

module.exports = mongoose.model('ConsumptionLog', consumptionLogSchema);
