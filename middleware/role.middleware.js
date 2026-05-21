const Project = require('../models/Project.model');

/**
 * Flexible permission checker for project roles.
 * @param {Array} allowedRoles - Roles allowed to perform the action (e.g. ['owner', 'admin', 'member'])
 */
const checkProjectPermission = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Look for project ID in common places
      let projectId = req.params.projectId || req.body.project || req.query.project;
      const genericId = req.params.id;

      let project;
      if (projectId) {
        project = await Project.findById(projectId);
      } else if (genericId) {
        project = await Project.findById(genericId);
        if (!project) {
          const Task = require('../models/Task.model');
          const task = await Task.findById(genericId);
          if (task) {
            project = await Project.findById(task.project);
          }
        }
      }
      
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project or related task not found' });
      }

      // Owner always has permission
      if (project.owner.toString() === req.user._id.toString()) {
        req.project = project;
        req.projectRole = 'owner';
        return next();
      }

      // Global Admin always has permission
      if (req.user && req.user.role === 'admin') {
        req.project = project;
        req.projectRole = 'owner';
        return next();
      }

      // Check member roles
      const member = project.members.find(m => m.user.toString() === req.user._id.toString());
      if (!member || !allowedRoles.includes(member.role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: You do not have permission for this action' 
        });
      }

      req.project = project;
      req.projectRole = member.role;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Legacy wrappers for backward compatibility or simple use cases
 */
const requireProjectMember = checkProjectPermission(['admin', 'member', 'viewer']);
const requireProjectAdmin = checkProjectPermission(['admin']);

module.exports = { checkProjectPermission, requireProjectMember, requireProjectAdmin };
