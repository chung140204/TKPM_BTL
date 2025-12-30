const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unit.controller');
const auth = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');

router.get('/', unitController.getUnits);
router.get('/:id', unitController.getUnitById);
router.post('/', auth, authorize('admin'), unitController.createUnit);
router.put('/:id', auth, authorize('admin'), unitController.updateUnit);
router.delete('/:id', auth, authorize('admin'), unitController.deleteUnit);

module.exports = router;



