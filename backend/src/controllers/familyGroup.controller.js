const FamilyGroup = require('../models/FamilyGroup.model');
const FamilyInvite = require('../models/FamilyInvite.model');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const notificationService = require('../services/notification.service');
const { ROLES, FAMILY_ROLES } = require('../config/roles');

const isOwner = (familyGroup, userId) => {
  return familyGroup.members.some(
    (member) =>
      member.userId.toString() === userId.toString() &&
      member.role === FAMILY_ROLES.OWNER
  );
};

exports.getFamilyGroups = async (req, res, next) => {
  try {
    const familyGroups = await FamilyGroup.find({
      $or: [
        { createdBy: req.user.id },
        { 'members.userId': req.user.id }
      ]
    }).populate('createdBy', 'fullName email')
      .populate('members.userId', 'fullName email avatar role');

    res.json({
      success: true,
      count: familyGroups.length,
      data: { familyGroups }
    });
  } catch (error) {
    next(error);
  }
};

exports.getFamilyGroupById = async (req, res, next) => {
  try {
    const familyGroup = await FamilyGroup.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('members.userId', 'fullName email avatar role');

    if (!familyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm gia đình'
      });
    }

    const isMember = familyGroup.members.some(
      (member) => member.userId.toString() === req.user.id
    );

    if (!isMember && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem nhóm gia đình này'
      });
    }

    res.json({
      success: true,
      data: { familyGroup }
    });
  } catch (error) {
    next(error);
  }
};

exports.createFamilyGroup = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (req.user.familyGroupId) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã thuộc một nhóm gia đình'
      });
    }

    const familyGroup = await FamilyGroup.create({
      name,
      createdBy: req.user.id,
      members: [{
        userId: req.user.id,
        role: FAMILY_ROLES.OWNER,
        joinedAt: new Date()
      }]
    });

    // Cập nhật familyGroupId của user
    await User.findByIdAndUpdate(req.user.id, {
      familyGroupId: familyGroup._id
    });

    await familyGroup.populate('members.userId', 'fullName email role');

    res.status(201).json({
      success: true,
      message: 'Tạo nhóm gia đình thành công',
      data: { familyGroup }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateFamilyGroup = async (req, res, next) => {
  try {
    const existingGroup = await FamilyGroup.findById(req.params.id);

    if (!existingGroup) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm gia đình'
      });
    }

    if (!isOwner(existingGroup, req.user.id) && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ trưởng nhóm mới được cập nhật thông tin nhóm'
      });
    }

    const familyGroup = await FamilyGroup.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('members.userId', 'fullName email role');

    if (!familyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm gia đình'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật nhóm gia đình thành công',
      data: { familyGroup }
    });
  } catch (error) {
    next(error);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    const { userId, email } = req.body;
    const familyGroup = await FamilyGroup.findById(req.params.id);

    if (!familyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm gia đình'
      });
    }

    if (!isOwner(familyGroup, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ trưởng nhóm mới được mời thành viên'
      });
    }

    let targetUserId = userId;
    if (!targetUserId && email) {
      const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng với email này'
        });
      }
      targetUserId = targetUser._id;
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cần cung cấp userId hoặc email'
      });
    }

    // Kiểm tra đã là thành viên chưa
    const isMember = familyGroup.members.some(
      m => m.userId.toString() === targetUserId.toString()
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'Người dùng đã là thành viên của nhóm'
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    if (targetUser.familyGroupId) {
      return res.status(400).json({
        success: false,
        message: 'Người dùng đã thuộc nhóm gia đình khác'
      });
    }

    const existingInvite = await FamilyInvite.findOne({
      familyGroupId: familyGroup._id,
      invitedUser: targetUserId,
      status: 'pending'
    });

    if (existingInvite) {
      return res.status(400).json({
        success: false,
        message: 'Đã gửi lời mời cho người dùng này'
      });
    }

    const invite = await FamilyInvite.create({
      familyGroupId: familyGroup._id,
      invitedBy: req.user.id,
      invitedUser: targetUserId,
      email: targetUser.email
    });

    const inviteNotification = await Notification.create({
      userId: targetUserId,
      type: 'family_invite',
      title: 'Lời mời tham gia nhóm gia đình',
      message: `${req.user.fullName || req.user.email} đã mời bạn tham gia nhóm "${familyGroup.name}"`,
      relatedId: familyGroup._id,
      relatedType: 'FamilyGroup',
      scope: 'personal',
      actionUrl: '/family-groups',
      actionLabel: notificationService.DEFAULT_ACTION_LABEL,
      isRead: false
    });
    await notificationService.sendNotificationEmail(inviteNotification, { userId: targetUserId });

    res.json({
      success: true,
      message: 'Đã gửi lời mời tham gia nhóm',
      data: { invite }
    });
  } catch (error) {
    next(error);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const familyGroup = await FamilyGroup.findById(req.params.id);

    if (!familyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm gia đình'
      });
    }

    if (!isOwner(familyGroup, req.user.id) && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ trưởng nhóm mới được xóa thành viên'
      });
    }

    const memberToRemove = familyGroup.members.find(
      (member) => member.userId.toString() === req.params.memberId
    );

    if (memberToRemove && memberToRemove.role === FAMILY_ROLES.OWNER) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa trưởng nhóm khỏi nhóm'
      });
    }

    familyGroup.members = familyGroup.members.filter(
      m => m.userId.toString() !== req.params.memberId
    );

    await familyGroup.save();

    // Xóa familyGroupId của user
    await User.findByIdAndUpdate(req.params.memberId, {
      familyGroupId: null
    });

    res.json({
      success: true,
      message: 'Xóa thành viên thành công',
      data: { familyGroup }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const targetRole = role && role.toLowerCase();

    if (![ROLES.USER, ROLES.HOMEMAKER].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        message: 'Role không hợp lệ'
      });
    }

    const familyGroup = await FamilyGroup.findById(req.params.id);
    if (!familyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm gia đình'
      });
    }

    if (!isOwner(familyGroup, req.user.id) && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ trưởng nhóm mới được cập nhật vai trò'
      });
    }

    const member = familyGroup.members.find(
      (item) => item.userId.toString() === req.params.memberId
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thành viên trong nhóm'
      });
    }

    if (member.role === FAMILY_ROLES.OWNER) {
      return res.status(400).json({
        success: false,
        message: 'Không thể thay đổi vai trò của trưởng nhóm'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.memberId,
      { role: targetRole },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Cập nhật vai trò thành viên thành công',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

exports.getInvites = async (req, res, next) => {
  try {
    const invites = await FamilyInvite.find({
      invitedUser: req.user.id,
      status: 'pending'
    })
      .populate('familyGroupId', 'name')
      .populate('invitedBy', 'fullName email');

    res.json({
      success: true,
      count: invites.length,
      data: { invites }
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptInvite = async (req, res, next) => {
  try {
    const invite = await FamilyInvite.findById(req.params.inviteId);

    if (!invite || invite.status !== 'pending') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lời mời hợp lệ'
      });
    }

    if (invite.invitedUser.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chấp nhận lời mời này'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    if (user.familyGroupId) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã thuộc một nhóm gia đình'
      });
    }

    const familyGroup = await FamilyGroup.findById(invite.familyGroupId);
    if (!familyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm gia đình'
      });
    }

    const alreadyMember = familyGroup.members.some(
      (member) => member.userId.toString() === user._id.toString()
    );

    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã là thành viên của nhóm'
      });
    }

    familyGroup.members.push({
      userId: user._id,
      role: FAMILY_ROLES.MEMBER,
      joinedAt: new Date()
    });

    await familyGroup.save();
    await User.findByIdAndUpdate(user._id, { familyGroupId: familyGroup._id });

    invite.status = 'accepted';
    invite.respondedAt = new Date();
    await invite.save();

    const acceptedNotification = await Notification.create({
      userId: invite.invitedBy,
      type: 'family_invite_accepted',
      title: 'Lời mời đã được chấp nhận',
      message: `${user.fullName || user.email} đã chấp nhận lời mời vào nhóm "${familyGroup.name}"`,
      relatedId: familyGroup._id,
      relatedType: 'FamilyGroup',
      scope: 'family',
      familyGroupId: familyGroup._id,
      familyGroupName: familyGroup.name,
      actorId: user._id,
      actorName: user.fullName || user.email,
      actionUrl: '/family-groups',
      actionLabel: notificationService.DEFAULT_ACTION_LABEL,
      isRead: false
    });
    await notificationService.sendNotificationEmail(acceptedNotification, { userId: invite.invitedBy });

    res.json({
      success: true,
      message: 'Đã tham gia nhóm gia đình',
      data: { familyGroupId: familyGroup._id }
    });
  } catch (error) {
    next(error);
  }
};

exports.declineInvite = async (req, res, next) => {
  try {
    const invite = await FamilyInvite.findById(req.params.inviteId);

    if (!invite || invite.status !== 'pending') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lời mời hợp lệ'
      });
    }

    if (invite.invitedUser.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền từ chối lời mời này'
      });
    }

    invite.status = 'declined';
    invite.respondedAt = new Date();
    await invite.save();

    res.json({
      success: true,
      message: 'Đã từ chối lời mời'
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelInvite = async (req, res, next) => {
  try {
    const invite = await FamilyInvite.findById(req.params.inviteId);

    if (!invite || invite.status !== 'pending') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lời mời hợp lệ'
      });
    }

    const familyGroup = await FamilyGroup.findById(invite.familyGroupId);
    if (!familyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm gia đình'
      });
    }

    if (!isOwner(familyGroup, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ trưởng nhóm mới được hủy lời mời'
      });
    }

    invite.status = 'cancelled';
    invite.respondedAt = new Date();
    await invite.save();

    res.json({
      success: true,
      message: 'Đã hủy lời mời'
    });
  } catch (error) {
    next(error);
  }
};

exports.leaveFamilyGroup = async (req, res, next) => {
  try {
    const familyGroup = await FamilyGroup.findById(req.params.id);

    if (!familyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm gia đình'
      });
    }

    const member = familyGroup.members.find(
      (item) => item.userId.toString() === req.user.id
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không thuộc nhóm gia đình này'
      });
    }

    if (member.role === FAMILY_ROLES.OWNER) {
      return res.status(400).json({
        success: false,
        message: 'Trưởng nhóm cần chuyển quyền trước khi rời nhóm'
      });
    }

    familyGroup.members = familyGroup.members.filter(
      (item) => item.userId.toString() !== req.user.id
    );

    await familyGroup.save();
    await User.findByIdAndUpdate(req.user.id, { familyGroupId: null });

    res.json({
      success: true,
      message: 'Đã rời nhóm gia đình'
    });
  } catch (error) {
    next(error);
  }
};

exports.transferOwner = async (req, res, next) => {
  try {
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: 'Cần cung cấp memberId'
      });
    }

    const familyGroup = await FamilyGroup.findById(req.params.id);

    if (!familyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm gia đình'
      });
    }

    if (!isOwner(familyGroup, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ trưởng nhóm mới được chuyển quyền'
      });
    }

    const targetMember = familyGroup.members.find(
      (item) => item.userId.toString() === memberId
    );

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thành viên trong nhóm'
      });
    }

    if (targetMember.role === FAMILY_ROLES.OWNER) {
      return res.status(400).json({
        success: false,
        message: 'Thành viên đã là trưởng nhóm'
      });
    }

    familyGroup.members = familyGroup.members.map((item) => {
      if (item.userId.toString() === memberId) {
        return { ...item.toObject(), role: FAMILY_ROLES.OWNER };
      }
      if (item.role === FAMILY_ROLES.OWNER) {
        return { ...item.toObject(), role: FAMILY_ROLES.MEMBER };
      }
      return item;
    });

    await familyGroup.save();

    res.json({
      success: true,
      message: 'Đã chuyển trưởng nhóm'
    });
  } catch (error) {
    next(error);
  }
};



