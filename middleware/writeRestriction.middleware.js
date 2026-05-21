const restrictToAdminWrites = async (req, res, next) => {
  // Allow all GET, HEAD, OPTIONS requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Allow essential actions like logout, refresh, and notification state changes for normal users
  const path = req.originalUrl;
  if (
    path.includes('/api/auth/logout') ||
    path.includes('/api/auth/refresh') ||
    path.includes('/api/notifications') ||
    /\/api\/projects\/[^/]+\/join/.test(path)
  ) {
    return next();
  }

  // Allow if global admin
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  // Allow standard users (assignees) to update task checklist/progress
  if (req.method === 'PUT' && path.includes('/api/tasks/')) {
    const parts = path.split('/');
    const tasksIndex = parts.findIndex(p => p === 'tasks');
    if (tasksIndex !== -1 && parts[tasksIndex + 1]) {
      const taskId = parts[tasksIndex + 1].split('?')[0];
      if (/^[0-9a-fA-F]{24}$/.test(taskId)) {
        try {
          const Task = require('../models/Task.model');
          const task = await Task.findById(taskId);
          if (task && req.user) {
            const isAssignee = task.assignees.some(
              (id) => id.toString() === req.user._id.toString()
            );
            const allowedKeys = ['checklist', 'progress'];
            const bodyKeys = Object.keys(req.body);
            const isOnlyChecklistOrProgress =
              bodyKeys.length > 0 && bodyKeys.every((key) => allowedKeys.includes(key));

            if (isAssignee && isOnlyChecklistOrProgress) {
              return next();
            }
          }
        } catch (err) {
          // ignore database errors and fall through
        }
      }
    }
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied: You do not have write permissions. Only administrators can perform this action.'
  });
};

module.exports = { restrictToAdminWrites };
