const express = require('express');
const router = express.Router();
const familyGroupController = require('../controllers/familyGroup.controller');
const auth = require('../middleware/auth.middleware');

router.use(auth);

router.get('/', familyGroupController.getFamilyGroups);
router.get('/:id', familyGroupController.getFamilyGroupById);
router.post('/', familyGroupController.createFamilyGroup);
router.put('/:id', familyGroupController.updateFamilyGroup);
router.post('/:id/members', familyGroupController.addMember);
router.delete('/:id/members/:memberId', familyGroupController.removeMember);

module.exports = router;



