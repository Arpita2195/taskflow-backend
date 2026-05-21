const Comment = require('../models/Comment.model');
const Task = require('../models/Task.model');

// Smart local summarizer — works with NO external API key
const generateLocalSummary = (task, comments) => {
  const parts = [];

  const statusMap = {
    'Backlog': 'is queued up in the backlog',
    'In Progress': 'is currently being worked on',
    'Review': 'is under review',
    'Done': 'has been completed',
  };
  parts.push(`📋 **${task.title}** ${statusMap[task.column] || 'is in progress'}.`);

  if (task.priority === 'high') {
    parts.push(`⚠️ This is a **high priority** task requiring immediate attention.`);
  } else if (task.priority === 'medium') {
    parts.push(`🟡 This task has **medium priority**.`);
  }

  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const today = new Date();
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      parts.push(`🚨 **Overdue** by ${Math.abs(diffDays)} day(s) — needs urgent action!`);
    } else if (diffDays === 0) {
      parts.push(`📅 Due **today**!`);
    } else {
      parts.push(`📅 Due in **${diffDays} day(s)**.`);
    }
  }

  if (task.checklist && task.checklist.length > 0) {
    const done = task.checklist.filter(c => c.done).length;
    const total = task.checklist.length;
    const pct = Math.round((done / total) * 100);
    parts.push(`✅ Checklist: **${done}/${total} items done** (${pct}% complete).`);
  }

  if (task.assignees && task.assignees.length > 0) {
    const names = task.assignees.map(a => a.name || 'A team member').join(', ');
    parts.push(`👤 Assigned to: **${names}**.`);
  }

  if (comments.length > 0) {
    const lastComment = comments[0]; // sorted desc
    const authorName = lastComment.author?.name || 'A team member';
    const preview = lastComment.text?.replace(/<[^>]+>/g, '').slice(0, 100) || '';
    parts.push(`💬 **${comments.length} comment(s)** in the thread. Latest from **${authorName}**: "${preview}${preview.length >= 100 ? '...' : ''}"`);
  } else {
    parts.push(`💬 No comments yet — be the first to update the team!`);
  }

  return parts.join('\n\n');
};

const summarizeTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId).populate('assignees', 'name');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const comments = await Comment.find({ task: taskId })
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Try Gemini AI if key is configured
    const geminiKey = process.env.GEMINI_API_KEY;
    const isGeminiConfigured = geminiKey && geminiKey !== 'your_gemini_key_here';

    if (isGeminiConfigured) {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are a project management assistant. Summarize this task concisely in 2-3 sentences.
Task: ${task.title}
Status: ${task.column}
Priority: ${task.priority}
Description: ${task.description || 'None'}
Comments: ${comments.map(c => `${c.author?.name}: ${c.text?.replace(/<[^>]+>/g, '')}`).join('; ') || 'None'}
Progress: ${task.progress || 0}%`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text();

        if (summary) return res.json({ success: true, summary, source: 'gemini' });
      } catch (geminiErr) {
        console.warn('Gemini API failed, using local summarizer:', geminiErr.message);
      }
    }

    // Always fall back to local summarizer
    const summary = generateLocalSummary(task, comments);
    res.json({ success: true, summary, source: 'local' });

  } catch (err) { next(err); }
};

module.exports = { summarizeTask };
