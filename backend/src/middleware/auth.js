const { requireAuth } = require('./auth.middleware');
const { requireRole } = require('./role.guard');

module.exports = {
  requireAuth,
  requireRole,
};
