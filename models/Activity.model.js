const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
      type: String, 
      enum: ['task_created', 'task_updated', 'task_moved', 'task_deleted', 'member_invited', 'project_updated'],
      required: true 
    },
    message: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed }, // For storing before/after values
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', activitySchema);
