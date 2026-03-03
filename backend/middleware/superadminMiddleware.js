/**
 * Superadmin-only route protection
 * Only users with role 'superadmin' can access these routes
 */
const authorizeSuperadmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Access denied. Superadmin privileges required.' });
  }
  next();
};

module.exports = authorizeSuperadmin;
