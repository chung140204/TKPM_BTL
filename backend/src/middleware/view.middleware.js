const FamilyGroup = require('../models/FamilyGroup.model');

const parseView = (req) => {
  const rawView = req.query.view || req.headers['x-view'];
  if (rawView && String(rawView).toLowerCase() === 'family') {
    return 'family';
  }
  return 'personal';
};

const attachViewContext = async (req, res, next) => {
  try {
    const view = parseView(req);
    req.view = view;
    req.familyGroup = null;
    req.familyMemberRole = null;

    if (view === 'family') {
      if (!req.user?.familyGroupId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn chưa thuộc nhóm gia đình'
        });
      }

      const familyGroup = await FamilyGroup.findById(req.user.familyGroupId);
      if (!familyGroup) {
        return res.status(403).json({
          success: false,
          message: 'Nhóm gia đình không tồn tại'
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

      req.familyGroup = familyGroup;
      req.familyMemberRole = member.role;
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  attachViewContext
};
