// Require specific roles (based on user.role in DB)
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }
    next();
  };
};

// Require active_role (for seller/buyer separation)
const requireActiveRole = (...activeRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    // admin bypasses active_role check
    if (req.user.role === 'admin') return next();

    if (!activeRoles.includes(req.user.active_role)) {
      return res.status(403).json({
        success: false,
        message: `Please switch to ${activeRoles.join(' or ')} mode to perform this action`
      });
    }
    next();
  };
};

module.exports = { requireRole, requireActiveRole };
