const express = require('express');
const router = express.Router();
const familyGroupController = require('../controllers/familyGroup.controller');
const auth = require('../middleware/auth.middleware');

router.use(auth);

router.get('/invites', familyGroupController.getInvites);
router.post('/invites/:inviteId/accept', familyGroupController.acceptInvite);
router.post('/invites/:inviteId/decline', familyGroupController.declineInvite);
router.delete('/invites/:inviteId', familyGroupController.cancelInvite);
router.get('/', familyGroupController.getFamilyGroups);
router.post('/', familyGroupController.createFamilyGroup);
router.get('/:id', familyGroupController.getFamilyGroupById);
router.put('/:id', familyGroupController.updateFamilyGroup);
router.post('/:id/members', familyGroupController.addMember);
router.put('/:id/members/:memberId/role', familyGroupController.updateMemberRole);
router.delete('/:id/members/:memberId', familyGroupController.removeMember);
router.post('/:id/leave', familyGroupController.leaveFamilyGroup);
router.put('/:id/owner', familyGroupController.transferOwner);

module.exports = router;



