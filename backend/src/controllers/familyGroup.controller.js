const FamilyGroup = require('../models/FamilyGroup.model');
const User = require('../models/User.model');

exports.getFamilyGroups = async (req, res, next) => {
  try {
    const familyGroups = await FamilyGroup.find({
      $or: [
        { createdBy: req.user.id },
        { 'members.userId': req.user.id }
      ]
    }).populate('createdBy', 'fullName email')
      .populate('members.userId', 'fullName email avatar');

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
      .populate('members.userId', 'fullName email avatar');

    if (!familyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm gia đình'
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

    const familyGroup = await FamilyGroup.create({
      name,
      createdBy: req.user.id,
      members: [{
        userId: req.user.id,
        role: 'owner',
        joinedAt: new Date()
      }]
    });

    // Cập nhật familyGroupId của user
    await User.findByIdAndUpdate(req.user.id, {
      familyGroupId: familyGroup._id
    });

    await familyGroup.populate('members.userId', 'fullName email');

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
    const familyGroup = await FamilyGroup.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('members.userId', 'fullName email');

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
    const { userId } = req.body;
    const familyGroup = await FamilyGroup.findById(req.params.id);

    if (!familyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm gia đình'
      });
    }

    // Kiểm tra đã là thành viên chưa
    const isMember = familyGroup.members.some(
      m => m.userId.toString() === userId
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'Người dùng đã là thành viên của nhóm'
      });
    }

    familyGroup.members.push({
      userId,
      role: 'member',
      joinedAt: new Date()
    });

    await familyGroup.save();

    // Cập nhật familyGroupId của user
    await User.findByIdAndUpdate(userId, {
      familyGroupId: familyGroup._id
    });

    await familyGroup.populate('members.userId', 'fullName email');

    res.json({
      success: true,
      message: 'Thêm thành viên thành công',
      data: { familyGroup }
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



