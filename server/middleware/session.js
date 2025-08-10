const session = require('express-session');
const MongoStore = require('connect-mongo');

/**
 * Session-based authentication middleware
 * This replaces JWT tokens with server-side sessions stored in MongoDB
 */

/**
 * Configure session middleware
 */
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-session-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600, // Lazy session update
    ttl: 7 * 24 * 60 * 60, // 7 days session expiry
    autoRemove: 'native'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax' // CSRF protection
  },
  name: 'onetech.sid' // Custom session name
};

/**
 * Session authentication middleware
 * Checks if user is logged in via session
 */
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login to continue.'
    });
  }
  
  // Add user ID to request for easy access
  req.userId = req.session.userId;
  req.userEmail = req.session.userEmail;
  req.userName = req.session.userName;
  
  // Also add user object for role checking
  req.user = {
    id: req.session.userId,
    email: req.session.userEmail,
    name: req.session.userName,
    role: req.session.userRole || 'user'
  };
  
  next();
};

/**
 * Optional authentication middleware
 * Adds user info to request if session exists, but doesn't require it
 */
const optionalAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    req.userId = req.session.userId;
    req.userEmail = req.session.userEmail;
    req.userName = req.session.userName;
    
    // Also add user object for role checking
    req.user = {
      id: req.session.userId,
      email: req.session.userEmail,
      name: req.session.userName,
      role: req.session.userRole || 'user'
    };
  }
  
  next();
};

/**
 * Create user session after successful login
 */
const createSession = (req, user) => {
  req.session.userId = user._id.toString();
  req.session.userEmail = user.email;
  req.userName = user.name;
  req.session.loginTime = new Date();
  
  // Regenerate session ID for security
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        reject(err);
      } else {
        req.session.userId = user._id.toString();
        req.session.userEmail = user.email;
        req.session.userName = user.name;
        req.session.loginTime = new Date();
        resolve(req.session);
      }
    });
  });
};

/**
 * Destroy user session on logout
 */
const destroySession = (req) => {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
};

/**
 * Check if user is authenticated
 */
const isAuthenticated = (req) => {
  return !!(req.session && req.session.userId);
};

module.exports = {
  sessionConfig,
  requireAuth,
  optionalAuth,
  createSession,
  destroySession,
  isAuthenticated,
};