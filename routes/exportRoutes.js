const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { requireLogin } = require('../middleware/auth');

// Export Excel database download
router.get('/excel', requireLogin, exportController.exportToExcel);

// Export student profile and performance report cards to PDF
router.get('/pdf/:studentId', requireLogin, exportController.exportToPDF);

module.exports = router;
