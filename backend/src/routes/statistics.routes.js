const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statistics.controller');
const auth = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const { ROLES } = require('../config/roles');
const { attachViewContext } = require('../middleware/view.middleware');

// Tất cả routes đều cần authentication
router.use(auth, attachViewContext, authorize(ROLES.USER, ROLES.HOMEMAKER));

router.get('/dashboard', statisticsController.getDashboardOverview);
router.get('/recent-activities', statisticsController.getRecentActivities);
router.get('/purchases', statisticsController.getPurchaseStatistics);
router.get('/waste', statisticsController.getWasteStatistics);
router.get('/consumption', statisticsController.getConsumptionStatistics);
router.get('/recipes', statisticsController.getRecipeStatistics);

module.exports = router;



