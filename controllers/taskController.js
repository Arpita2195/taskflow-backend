const Task = require('../models/Task');

// GET /api/tasks  — list with filters
exports.getTasks = async (req, res, next) => {
  try {
    const { priority, status, search, sort = '-createdAt' } = req.query;
    const filter = { user: req.user.id };

    if (priority) filter.priority = priority;
    if (status)   filter.status   = status;
    if (search)   filter.$or = [
      { title:       { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];

    const tasks = await Task.find(filter).sort(sort);
    res.json({ status: 'success', count: tasks.length, data: { tasks } });
  } catch (err) { next(err); }
};

// GET /api/tasks/stats
exports.getStats = async (req, res, next) => {
  try {
    const uid   = req.user.id;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [total, byStatus, byPriority, overdue] = await Promise.all([
      Task.countDocuments({ user: uid }),
      Task.aggregate([
        { $match: { user: uid } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $match: { user: uid } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Task.countDocuments({ user: uid, status: { $ne: 'completed' }, dueDate: { $lt: today } }),
    ]);

    res.json({ status: 'success', data: { total, byStatus, byPriority, overdue } });
  } catch (err) { next(err); }
};

// POST /api/tasks
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, priority, status, dueDate, subtasks, aiGenerated } = req.body;
    const task = await Task.create({
      user: req.user.id, title, description, priority, status, dueDate, subtasks, aiGenerated,
    });
    res.status(201).json({ status: 'success', data: { task } });
  } catch (err) { next(err); }
};

// PATCH /api/tasks/:id
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ status: 'success', data: { task } });
  } catch (err) { next(err); }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ status: 'success', message: 'Task deleted successfully' });
  } catch (err) { next(err); }
};

// PATCH /api/tasks/reorder  — bulk update positions
exports.reorderTasks = async (req, res, next) => {
  try {
    const { updates } = req.body; // [{ id, status }]
    await Promise.all(
      updates.map(u => Task.findOneAndUpdate({ _id: u.id, user: req.user.id }, { status: u.status }))
    );
    res.json({ status: 'success' });
  } catch (err) { next(err); }
};
