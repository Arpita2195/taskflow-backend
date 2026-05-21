const Task = require('../models/Task.model');
const Activity = require('../models/Activity.model');
const Notification = require('../models/Notification.model');
const { sendTaskAssignedEmail } = require('../utils/email');

// @GET /api/tasks?project=:id
const getTasks = async (req, res, next) => {
  try {
    const { project, column, assignee, priority } = req.query;
    const filter = { isArchived: false };
    if (project) filter.project = project;
    if (column) filter.column = column;
    if (assignee) filter.assignees = assignee;
    if (priority) filter.priority = priority;

    const tasks = await Task.find(filter)
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .sort({ order: 1, createdAt: -1 });

    res.json({ success: true, tasks });
  } catch (err) { next(err); }
};

// @POST /api/tasks
const createTask = async (req, res, next) => {
  try {
    const task = await Task.create({ ...req.body, reporter: req.user._id });
    await task.populate('assignees', 'name email avatar');

    // Emit socket event to board room
    const io = req.app.get('io');
    io.to(`project:${task.project}`).emit('task:created', task);

    // Notify assignees
    for (const assigneeId of task.assignees.map((a) => a._id)) {
      if (assigneeId.toString() === req.user._id.toString()) continue;
      const notif = await Notification.create({
        recipient: assigneeId,
        sender: req.user._id,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `${req.user.name} assigned you to "${task.title}"`,
        relatedTask: task._id,
        relatedProject: task.project,
      });
      io.to(`user:${assigneeId}`).emit('notification:new', notif);
    }

    // Log Activity
    await Activity.create({
      project: task.project,
      task: task._id,
      user: req.user._id,
      type: 'task_created',
      message: `${req.user.name} created task "${task.title}"`,
    });

    res.status(201).json({ success: true, task });
  } catch (err) { next(err); }
};

// @GET /api/tasks/:id
const getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (err) { next(err); }
};

// @PUT /api/tasks/:id
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignees', 'name email avatar');

    const io = req.app.get('io');
    io.to(`project:${task.project}`).emit('task:updated', task);

    // Log Activity
    await Activity.create({
      project: task.project,
      task: task._id,
      user: req.user._id,
      type: 'task_updated',
      message: `${req.user.name} updated task "${task.title}"`,
      details: req.body,
    });

    res.json({ success: true, task });
  } catch (err) { next(err); }
};

// @PATCH /api/tasks/:id/move  — drag-and-drop column change
const moveTask = async (req, res, next) => {
  try {
    const { column, order } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { column, order },
      { new: true }
    ).populate('assignees', 'name email avatar');

    const io = req.app.get('io');
    io.to(`project:${task.project}`).emit('task:moved', {
      taskId: task._id,
      column,
      order,
      movedBy: req.user._id,
    });

    // Notify assignees about move
    for (const assignee of task.assignees) {
      if (assignee._id.toString() === req.user._id.toString()) continue;
      const notif = await Notification.create({
        recipient: assignee._id,
        sender: req.user._id,
        type: 'task_moved',
        title: 'Task Moved',
        message: `${req.user.name} moved "${task.title}" to ${column}`,
        relatedTask: task._id,
        relatedProject: task.project,
      });
      io.to(`user:${assignee._id}`).emit('notification:new', notif);
    }

    // Log Activity
    await Activity.create({
      project: task.project,
      task: task._id,
      user: req.user._id,
      type: 'task_moved',
      message: `${req.user.name} moved task "${task.title}" to ${column}`,
    });

    res.json({ success: true, task });
  } catch (err) { next(err); }
};

// @DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    const io = req.app.get('io');
    io.to(`project:${task.project}`).emit('task:deleted', { taskId: req.params.id });

    // Log Activity
    await Activity.create({
      project: task.project,
      user: req.user._id,
      type: 'task_deleted',
      message: `${req.user.name} deleted task "${task.title}"`,
    });

    res.json({ success: true, message: 'Task deleted' });
  } catch (err) { next(err); }
};

// @POST /api/tasks/:id/attachments
const addAttachment = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const { isCloudinaryConfigured } = require('../config/cloudinary');
    const url = isCloudinaryConfigured 
      ? req.file.path 
      : `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const attachment = {
      url,
      publicId: req.file.filename,
      name: req.file.originalname,
      uploadedBy: req.user._id,
    };

    task.attachments.push(attachment);
    await task.save();

    // Log Activity
    await Activity.create({
      project: task.project,
      task: task._id,
      user: req.user._id,
      type: 'task_updated',
      message: `${req.user.name} attached "${attachment.name}" to task "${task.title}"`,
    });

    res.json({ success: true, attachment });
  } catch (err) { next(err); }
};

// @POST /api/tasks/:id/links
const addLink = async (req, res, next) => {
  try {
    const { url, name } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'URL is required' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const attachment = {
      url,
      name: name || url,
      type: 'link',
      uploadedBy: req.user._id,
    };

    task.attachments.push(attachment);
    await task.save();

    // Log Activity
    await Activity.create({
      project: task.project,
      task: task._id,
      user: req.user._id,
      type: 'task_updated',
      message: `${req.user.name} added a link to task "${task.title}"`,
    });

    res.json({ success: true, attachment });
  } catch (err) { next(err); }
};

module.exports = { getTasks, createTask, getTask, updateTask, moveTask, deleteTask, addAttachment, addLink };
