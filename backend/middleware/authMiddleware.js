/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user info to req.user
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'mentriqiq_dev_jwt_secret_change_me';

// ─── Verify any authenticated user ───────────────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  // Check for Bearer token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized. No token provided.' });
  }

  try {
    // Verify token signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user to request (excluding password)
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    if (!req.user.isActive) {
      return res.status(401).json({ error: 'Account has been deactivated.' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// ─── Admin only access ────────────────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied. Admins only.' });
};

// ─── Generate JWT token helper ────────────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = { protect, adminOnly, generateToken };
