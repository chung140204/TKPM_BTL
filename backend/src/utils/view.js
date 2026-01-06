const mongoose = require('mongoose');

const buildViewFilter = (req) => {
  if (req.view === 'family' && req.familyGroup) {
    return { familyGroupId: req.familyGroup._id };
  }

  return { userId: req.user.id, familyGroupId: null };
};

const buildAggregateMatch = (req) => {
  if (req.view === 'family' && req.familyGroup) {
    return { familyGroupId: new mongoose.Types.ObjectId(req.familyGroup._id) };
  }

  return {
    userId: new mongoose.Types.ObjectId(req.user.id),
    familyGroupId: null
  };
};

const resolveFamilyGroupId = (req) => {
  if (req.view === 'family' && req.familyGroup) {
    return req.familyGroup._id;
  }

  return null;
};

module.exports = {
  buildViewFilter,
  buildAggregateMatch,
  resolveFamilyGroupId
};
