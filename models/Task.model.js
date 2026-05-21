const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
  text: { type: String, required: true },
  done: { type: Boolean, default: false },
  doneAt: Date,
  doneBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const attachmentSchema = new mongoose.Schema({
  url: String,
  publicId: String,
  name: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
});

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Task title is required'], trim: true },
    description: { type: String, default: '' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    column: { type: String, required: true, default: 'Backlog' },
    order: { type: Number, default: 0 },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    label: { type: String, default: 'Task' },
    labelColor: { type: String, default: 'rgba(108,99,255,0.15)' },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    checklist: [checklistItemSchema],
    attachments: [attachmentSchema],
    tags: [String],
    isArchived: { type: Boolean, default: false },
    completedAt: Date,
  },
  { timestamps: true }
);

// Auto-set completedAt
taskSchema.pre('save', function (next) {
  if (this.isModified('column') && this.column === 'Done' && !this.completedAt) {
    this.completedAt = new Date();
    this.progress = 100;
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
