/**
 * Recipe Model
 * Schema cho công thức nấu ăn
 */

const mongoose = require('mongoose');

const recipeIngredientSchema = new mongoose.Schema({
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
  notes: {
    type: String,
    trim: true
  }
}, { _id: false });

const recipeInstructionSchema = new mongoose.Schema({
  step: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const recipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên công thức là bắt buộc'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    default: null
  },
  servings: {
    type: Number,
    default: 4,
    min: 1
  },
  prepTime: {
    type: Number, // phút
    default: 0,
    min: 0
  },
  cookTime: {
    type: Number, // phút
    default: 0,
    min: 0
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  category: {
    type: String,
    trim: true,
    default: 'Món chính'
  },
  ingredients: [recipeIngredientSchema],
  instructions: [recipeInstructionSchema],
  tags: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  favoriteCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
recipeSchema.index({ name: 'text' });
recipeSchema.index({ isApproved: 1 });
recipeSchema.index({ visibility: 1 });
recipeSchema.index({ createdBy: 1, visibility: 1 });
recipeSchema.index({ category: 1 });
recipeSchema.index({ tags: 1 });

module.exports = mongoose.model('Recipe', recipeSchema);



