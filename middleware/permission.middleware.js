const Project = require('../models/Project.model');

/**
 * Middleware to check if the user has a specific role in the project.
 * @param {Array} allowedRoles - Roles allowed to perform the action (e.g. ['owner', 'admin'])
 */
const checkProjectPermission = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.id || req.body.project;
      
      if (!projectId) {
        return res.status(400).json({ success: false, message: 'Project ID is required' });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      // Check if user is owner
      if (project.owner.toString() === req.user._id.toString()) {
        req.projectRole = 'owner';
        return next();
      }

      // Check member roles
      const member = project.members.find(m => m.user.toString() === req.user._id.toString());
      if (!member || !allowedRoles.includes(member.role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: You do not have permission to perform this action' 
        });
      }

      req.projectRole = member.role;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { checkProjectPermission };
