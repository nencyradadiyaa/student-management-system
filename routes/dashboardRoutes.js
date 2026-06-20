const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireLogin } = require('../middleware/auth');

// Main admin dashboard
router.get('/', requireLogin, dashboardController.getDashboard);

// API endpoint for dashboard charts (Chart.js feeds)
router.get('/api/chart-data', requireLogin, dashboardController.getChartData);

module.exports = router;
