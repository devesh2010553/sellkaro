const admin = require('../config/firebase');
const User = require('../models/User');

/**
 * Verifies the Firebase ID token sent in the Authorization header
 * (Authorization: Bearer <idToken>), then attaches the matching Mongo
 * user document to req.user. Requires email to be verified.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Please log in to continue.' });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    // Note: decoded.email_verified reflects the token's claims at the time
    // it was issued. The frontend must call user.getIdToken(true) to force
    // a refreshed token after the user clicks the verification link, or
    // this will keep reporting unverified until the token naturally expires.
    if (!decoded.email_verified) {
      return res.status(403).json({ error: 'Please verify your email before continuing. Check your inbox for the verification link.' });
    }

    const user = await User.findOne({ firebaseUid: decoded.uid });

    if (!user) {
      return res.status(404).json({ error: 'Account not found. Please complete signup first.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Your account has been blocked. Contact support if you think this is a mistake.' });
    }

    req.user = user;
    req.firebaseDecoded = decoded;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Your session is invalid or expired. Please log in again.' });
  }
}

/**
 * Must be used AFTER requireAuth. Blocks non-admins.
 */
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access only.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
