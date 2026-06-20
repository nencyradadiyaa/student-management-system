const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectDashboardIfLoggedIn } = require('../middleware/auth');

// Login page
router.get('/login', redirectDashboardIfLoggedIn, authController.getLogin);

// Submit credentials
router.post('/login', redirectDashboardIfLoggedIn, authController.postLogin);

// End session
router.get('/logout', authController.logout);

module.exports = router;
