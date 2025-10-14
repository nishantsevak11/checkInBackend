const { verifyAccessToken } = require('../utils/generateToken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized, no token provided'
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized, token invalid or expired'
      });
    }

    // Get user from token
    req.user = await User.findById(decoded.userId).select('-password -refreshToken');

    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found'
      });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      status: 'error',
      message: 'Not authorized'
    });
  }
};

module.exports = { protect };