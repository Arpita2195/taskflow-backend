const Activity = require('../models/Activity.model');

// @GET /api/activities?project=:id&task=:id
const getActivities = async (req, res, next) => {
  try {
    const { project, task } = req.query;
    const filter = {};
    if (project) filter.project = project;
    if (task) filter.task = task;

    const activities = await Activity.find(filter)
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, activities });
  } catch (err) {
    next(err);
  }
};

module.exports = { getActivities };
