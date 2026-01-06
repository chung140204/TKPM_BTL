/**
 * Notification Model
 * Schema cho thông báo
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'expiry_reminder',
      'expiring_soon',
      'expired',
      'shopping_update',
      'meal_reminder',
      'recipe_cooked',
      'family_invite',
      'family_invite_accepted',
      'system'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  relatedType: {
    type: String,
    default: null // 'FridgeItem', 'ShoppingList', etc.
  },
  scope: {
    type: String,
    enum: ['personal', 'family'],
    default: 'personal'
  },
  familyGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyGroup',
    default: null
  },
  familyGroupName: {
    type: String,
    default: null,
    trim: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  actorName: {
    type: String,
    default: null,
    trim: true
  },
  actionUrl: {
    type: String,
    default: null
  },
  actionLabel: {
    type: String,
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ userId: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, relatedId: 1, relatedType: 1 }); // For duplicate prevention
notificationSchema.index({ familyGroupId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
