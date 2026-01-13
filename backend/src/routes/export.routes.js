/**
 * Export Routes
 * Các endpoint để xuất báo cáo CSV
 */

const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export.controller');
const auth = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const { ROLES } = require('../config/roles');
const { attachViewContext } = require('../middleware/view.middleware');

// Tất cả routes đều cần authentication
router.use(auth, attachViewContext, authorize(ROLES.USER, ROLES.HOMEMAKER));

// Purchase statistics export
router.get('/purchases/csv', exportController.exportPurchaseStatisticsCSV);

// Waste statistics export
router.get('/waste/csv', exportController.exportWasteStatisticsCSV);

// Consumption statistics export
router.get('/consumption/csv', exportController.exportConsumptionStatisticsCSV);

// Dashboard overview export
router.get('/dashboard/csv', exportController.exportDashboardOverviewCSV);

module.exports = router;
