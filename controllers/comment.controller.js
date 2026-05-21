const Comment = require('../models/Comment.model');
const Notification = require('../models/Notification.model');
const Task = require('../models/Task.model');

// @GET /api/comments?task=:id
const getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ task: req.query.task })
      .populate('author', 'name email avatar')
      .populate('mentions', 'name email')
      .sort({ createdAt: 1 });
    res.json({ success: true, comments });
  } catch (err) { next(err); }
};

// @POST /api/comments
const addComment = async (req, res, next) => {
  try {
    const { task: taskId, text, mentions = [], parentComment } = req.body;

    const comment = await Comment.create({
      task: taskId,
      author: req.user._id,
      text,
      mentions,
      parentComment: parentComment || null,
    });

    await comment.populate('author', 'name email avatar');

    const task = await Task.findById(taskId);
    const io = req.app.get('io');
    io.to(`project:${task.project}`).emit('comment:added', { taskId, comment });

    // Notify mentioned users
    for (const mentionedId of mentions) {
      if (mentionedId.toString() === req.user._id.toString()) continue;
      const notif = await Notification.create({
        recipient: mentionedId,
        sender: req.user._id,
        type: 'mention',
        title: 'You were mentioned',
        message: `${req.user.name} mentioned you in a comment on "${task.title}"`,
        relatedTask: taskId,
        relatedProject: task.project,
      });
      io.to(`user:${mentionedId}`).emit('notification:new', notif);
    }

    res.status(201).json({ success: true, comment });
  } catch (err) { next(err); }
};

// @DELETE /api/comments/:id
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await comment.deleteOne();
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) { next(err); }
};

module.exports = { getComments, addComment, deleteComment };
