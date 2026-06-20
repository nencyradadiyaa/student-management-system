const express = require('express');
const router = express.Router();
const marksController = require('../controllers/marksController');
const { requireLogin } = require('../middleware/auth');

// Marks dashboard showing department statistics and class directories
router.get('/', requireLogin, marksController.getMarksDashboard);

// Manage grade cards for a specific student
router.get('/student/:studentId', requireLogin, marksController.getStudentMarks);

// Handle adding or updating examination scores
router.post('/student/:studentId/save', requireLogin, marksController.postSaveMark);

// Handle grade card records deletion
router.post('/student/:studentId/delete/:id', requireLogin, marksController.deleteMark);

module.exports = router;
