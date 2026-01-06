const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unit.controller');
const auth = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const { ROLES } = require('../config/roles');

router.get('/', unitController.getUnits);
router.get('/:id', unitController.getUnitById);
router.post('/', auth, authorize(ROLES.ADMIN), unitController.createUnit);
router.put('/:id', auth, authorize(ROLES.ADMIN), unitController.updateUnit);
router.delete('/:id', auth, authorize(ROLES.ADMIN), unitController.deleteUnit);

module.exports = router;



