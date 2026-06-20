const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

/**
 * Display the admin login page
 */
exports.getLogin = (req, res) => {
  res.render('auth/login', { error: null, title: 'Admin Login' });
};

/**
 * Handle login form submissions
 */
exports.postLogin = async (req, res) => {
  const { username, password } = req.body;

  // Basic validation
  if (!username || !password) {
    return res.render('auth/login', { error: 'Please enter both username and password.', title: 'Admin Login' });
  }

  try {
    // 1. Fetch admin by username
    const admin = await Admin.findByUsername(username);
    if (!admin) {
      return res.render('auth/login', { error: 'Invalid username or password.', title: 'Admin Login' });
    }

    // 2. Validate password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.render('auth/login', { error: 'Invalid username or password.', title: 'Admin Login' });
    }

    // 3. Set session variables
    req.session.adminId = admin.id;
    req.session.username = admin.username;
    req.session.fullName = admin.full_name;
    req.session.email = admin.email;

    // 4. Redirect to intended page or default dashboard
    const redirectTo = req.session.redirectTo || '/dashboard';
    delete req.session.redirectTo;
    
    return res.redirect(redirectTo);
  } catch (error) {
    console.error('Authentication Error:', error);
    return res.render('auth/login', { error: 'A server error occurred during login. Please try again.', title: 'Admin Login' });
  }
};

/**
 * Handle admin logout
 */
exports.logout = (req, res) => {
  if (req.session && typeof req.session.destroy === 'function') {
    req.session.destroy(err => {
      if (err) {
        console.error('Session Destruction Error:', err);
      }
      res.clearCookie('sms_session');
      res.redirect('/auth/login');
    });
  } else {
    // cookie-session logout: set session object to null
    req.session = null;
    res.redirect('/auth/login');
  }
};
