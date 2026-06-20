const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { requireLogin } = require('../middleware/auth');

// Attendance entry and reporting interface
router.get('/', requireLogin, attendanceController.getAttendanceSheet);

// Handle saving attendance checklist status
router.post('/save', requireLogin, attendanceController.postSaveAttendance);

module.exports = router;
