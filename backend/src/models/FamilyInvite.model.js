/**
 * FamilyInvite Model
 * Lưu lời mời tham gia nhóm gia đình
 */

const mongoose = require('mongoose');

const familyInviteSchema = new mongoose.Schema({
  familyGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyGroup',
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invitedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'cancelled'],
    default: 'pending'
  },
  respondedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

familyInviteSchema.index({ invitedUser: 1, status: 1 });
familyInviteSchema.index({ familyGroupId: 1, invitedUser: 1 });

module.exports = mongoose.model('FamilyInvite', familyInviteSchema);
