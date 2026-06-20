const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Database connections and mode selectors
const { pool, testConnection, getUseSQLite } = require('./config/db');

// Route controllers
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const marksRoutes = require('./routes/marksRoutes');
const exportRoutes = require('./routes/exportRoutes');

// Express application initialization
const app = express();
const PORT = process.env.PORT || 3000;

// Trust reverse proxy (Vercel) to support secure cookies
app.set('trust proxy', 1);

// Body parser parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// EJS Template Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve Static Assets
app.use(express.static(path.join(__dirname, 'public')));

const useSQLite = getUseSQLite();

if (useSQLite) {
  console.log('[Session Store] SQLite/Alasql mode: Using cookie-session for serverless-compatible preview.');
  const cookieSession = require('cookie-session');
  app.use(cookieSession({
    name: 'sms_session',
    keys: [process.env.SESSION_SECRET || 'sms_default_secret_key_12984'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }));
} else {
  // Set up sessions cookie parameters for MySQL
  let sessionOptions = {
    key: 'sms_session',
    secret: process.env.SESSION_SECRET || 'sms_default_secret_key_12984',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  };

  try {
    const MySQLStore = require('express-mysql-session')(session);
    sessionOptions.store = new MySQLStore({
      createDatabaseTable: true,
      schema: {
        tableName: 'sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data'
        }
      }
    }, pool);
    console.log('[Session Store] Initialized MySQL database session storage.');
  } catch (err) {
    console.warn('[Session System Warning] Failed to instantiate MySQL session storage. Falling back to memory store.');
  }

  // Register session middleware
  app.use(session(sessionOptions));
}

// Register Routing Handlers
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/students', studentRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/marks', marksRoutes);
app.use('/exports', exportRoutes);

// Root Route redirection helper
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).render('error', { 
    title: 'Page Not Found', 
    message: 'The page you requested could not be located in this application registry.' 
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Express Server Error]:', err);
  res.status(err.status || 500).render('error', {
    title: 'Internal Server Error',
    message: err.message || 'An unexpected server error occurred.',
    error: err
  });
});

// Start Server locally if run directly (not as a Vercel serverless function module)
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  testConnection().then(isDbActive => {
    if (isDbActive) {
      app.listen(PORT, () => {
        console.log(`Student Management System running locally on port ${PORT}`);
        console.log(`Address URL: http://localhost:${PORT}`);
      });
    } else {
      console.error('Fatal Database connection failure. Server startup aborted.');
      process.exit(1);
    }
  });
}

// Export the app module for Vercel Serverless Function engine
module.exports = app;
