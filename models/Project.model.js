const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
});

const columnSchema = new mongoose.Schema({
  name: { type: String, required: true },
  order: { type: Number, default: 0 },
  color: { type: String, default: '#8b8fa8' },
});

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Project name is required'], trim: true },
    description: { type: String, default: '' },
    color: { type: String, default: '#6C63FF' },
    icon: { type: String, default: '📋' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [memberSchema],
    pendingInvites: [
      {
        email: { type: String, required: true },
        role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
        invitedAt: { type: Date, default: Date.now },
      }
    ],
    columns: {
      type: [columnSchema],
      default: [
        { name: 'Backlog', order: 0, color: '#8b8fa8' },
        { name: 'In Progress', order: 1, color: '#6C63FF' },
        { name: 'Review', order: 2, color: '#f59e0b' },
        { name: 'Done', order: 3, color: '#43E97B' },
      ],
    },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Virtual for task count
projectSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  count: true,
});

module.exports = mongoose.model('Project', projectSchema);
