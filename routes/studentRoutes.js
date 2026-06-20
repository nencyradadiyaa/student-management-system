const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { requireLogin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Student directory list
router.get('/', requireLogin, studentController.getStudents);

// Student registration view
router.get('/create', requireLogin, studentController.getCreateStudent);

// Handle registration submit (parsed by Multer for profile pictures)
router.post('/create', requireLogin, upload.single('profile_pic'), studentController.postCreateStudent);

// Student edit view
router.get('/edit/:id', requireLogin, studentController.getEditStudent);

// Handle student profile updates
router.post('/edit/:id', requireLogin, upload.single('profile_pic'), studentController.postEditStudent);

// Detailed profile dashboard
router.get('/show/:id', requireLogin, studentController.getStudentProfile);

// Delete student records
router.post('/delete/:id', requireLogin, studentController.deleteStudent);

module.exports = router;
