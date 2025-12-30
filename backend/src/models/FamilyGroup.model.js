/**
 * FamilyGroup Model
 * Schema cho nhóm gia đình
 */

const mongoose = require('mongoose');

const familyGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên nhóm là bắt buộc'],
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
familyGroupSchema.index({ createdBy: 1 });
familyGroupSchema.index({ 'members.userId': 1 });

module.exports = mongoose.model('FamilyGroup', familyGroupSchema);



