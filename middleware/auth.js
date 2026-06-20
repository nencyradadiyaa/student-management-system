function requireLogin(req, res, next) {
  if (req.session && req.session.adminId) {
    // Inject session info into res.locals for EJS views
    res.locals.admin = {
      id: req.session.adminId,
      username: req.session.username,
      fullName: req.session.fullName,
      email: req.session.email
    };
    return next();
  }
  
  // Store the path the user attempted to access
  req.session.redirectTo = req.originalUrl;
  return res.redirect('/auth/login');
}

function redirectDashboardIfLoggedIn(req, res, next) {
  if (req.session && req.session.adminId) {
    return res.redirect('/dashboard');
  }
  return next();
}

module.exports = {
  requireLogin,
  redirectDashboardIfLoggedIn
};
