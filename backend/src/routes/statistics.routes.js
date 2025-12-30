const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statistics.controller');
const auth = require('../middleware/auth.middleware');

// Tất cả routes đều cần authentication
router.use(auth);

router.get('/dashboard', statisticsController.getDashboardOverview);
router.get('/purchases', statisticsController.getPurchaseStatistics);
router.get('/waste', statisticsController.getWasteStatistics);
router.get('/consumption', statisticsController.getConsumptionStatistics);
router.get('/recipes', statisticsController.getRecipeStatistics);

module.exports = router;



