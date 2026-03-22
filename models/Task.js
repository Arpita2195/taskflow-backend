const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  done: { type: Boolean, default: false },
}, { _id: true });

const taskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title:       { type: String, required: [true, 'Title required'], trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status:      { type: String, enum: ['pending', 'inprogress', 'completed'], default: 'pending' },
  dueDate:     { type: Date },
  subtasks:    [subtaskSchema],
  aiGenerated: { type: Boolean, default: false },
}, { timestamps: true });

// Compound indexes for fast user queries
taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ user: 1, priority: 1 });
taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
