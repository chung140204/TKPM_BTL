/**
 * MealPlan Model
 * Schema cho kế hoạch bữa ăn
 */

const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true
  },
  recipeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    required: true
  },
  servings: {
    type: Number,
    default: 4,
    min: 1
  },
  status: {
    type: String,
    enum: ['planned', 'cooked', 'skipped'],
    default: 'planned'
  },
  cookedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

const mealPlanSchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: [true, 'Tên kế hoạch là bắt buộc'],
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        // Khi update, this.startDate có thể là giá trị cũ hoặc mới
        // Nếu đang update cả startDate và endDate, dùng giá trị mới
        // Nếu chỉ update endDate, dùng giá trị hiện tại của startDate
        const startDateValue = this.startDate || (this.constructor && this.constructor.startDate);
        // Nếu không có startDate, không validate (sẽ được validate ở required)
        if (!startDateValue) return true;
        return value > startDateValue;
      },
      message: 'Ngày kết thúc phải sau ngày bắt đầu'
    }
  },
  meals: [mealSchema]
}, {
  timestamps: true
});

// Indexes
mealPlanSchema.index({ userId: 1 });
mealPlanSchema.index({ familyGroupId: 1 });
mealPlanSchema.index({ startDate: 1, endDate: 1 });
mealPlanSchema.index({ userId: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('MealPlan', mealPlanSchema);



