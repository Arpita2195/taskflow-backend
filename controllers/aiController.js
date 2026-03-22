const Task = require('../models/Task');

// ── Groq call (no SDK needed — plain fetch works fine in Node too) ──
const callGroq = async (prompt, maxTokens = 800) => {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.includes('YOUR_')) {
    const e = new Error('GROQ_API_KEY missing in backend/.env');
    e.statusCode = 503; throw e;
  }

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `You are TaskFlow AI, an intelligent task management assistant. Be concise and actionable. Today: ${new Date().toLocaleDateString()}.`,
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await resp.json();
  if (data.error) {
    const e = new Error('Groq error: ' + (data.error.message || 'API error'));
    e.statusCode = resp.status; throw e;
  }
  return data.choices?.[0]?.message?.content || 'No response.';
};

// POST /api/ai/breakdown
exports.breakdown = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const raw    = await callGroq(`Break down "${title}" into 4-6 actionable subtasks. Respond ONLY in JSON: {"subtasks":["step 1","step 2","step 3","step 4"]}`, 400);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json({ status: 'success', data: parsed });
  } catch (err) { next(err); }
};

// POST /api/ai/auto-priority
exports.autoPriority = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const raw    = await callGroq(`For task "${title}" (${description || 'no description'}), suggest priority (low/medium/high), dueDate (YYYY-MM-DD from today ${new Date().toISOString().split('T')[0]}), status. Respond ONLY in JSON: {"priority":"medium","dueDate":"YYYY-MM-DD","status":"pending","reason":"..."}`, 300);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json({ status: 'success', data: parsed });
  } catch (err) { next(err); }
};

// POST /api/ai/summary
exports.summary = async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).limit(30).select('title priority status dueDate');
    if (!tasks.length) return res.json({ status: 'success', data: { summary: 'No tasks yet. Create some tasks to get insights!' } });
    const list    = tasks.map(t => `- "${t.title}" [${t.priority}/${t.status}]`).join('\n');
    const summary = await callGroq(`Summarize these tasks with 3-5 actionable insights. Identify risks and what to focus on:\n\n${list}`);
    res.json({ status: 'success', data: { summary } });
  } catch (err) { next(err); }
};

// POST /api/ai/daily-plan
exports.dailyPlan = async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.user.id, status: { $ne: 'completed' } }).sort('dueDate').limit(15);
    const list  = tasks.map(t => `- "${t.title}" [${t.priority}${t.dueDate ? ', due ' + t.dueDate.toISOString().split('T')[0] : ''}]`).join('\n');
    const plan  = await callGroq(`Create a realistic daily schedule for today (${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}). Include time blocks, focus sessions and breaks.\n\nMy tasks:\n${list || 'No tasks yet.'}`, 700);
    res.json({ status: 'success', data: { plan } });
  } catch (err) { next(err); }
};

// POST /api/ai/reminders
exports.reminders = async (req, res, next) => {
  try {
    const tasks  = await Task.find({ user: req.user.id, status: { $ne: 'completed' } }).sort('dueDate').limit(20);
    const list   = tasks.map(t => `- "${t.title}" [${t.priority}${t.dueDate ? ', due ' + t.dueDate.toISOString().split('T')[0] : ''}]`).join('\n');
    const result = await callGroq(`Suggest 4-6 smart reminders with specific timing for these tasks:\n${list || 'No tasks.'}`);
    res.json({ status: 'success', data: { reminders: result } });
  } catch (err) { next(err); }
};

// POST /api/ai/chat
exports.chat = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const tasks = await Task.find({ user: req.user.id }).limit(20).select('title priority status dueDate');
    const list  = tasks.map(t => `- "${t.title}" [${t.priority}/${t.status}]`).join('\n');
    const reply = await callGroq(`My tasks:\n${list || 'None yet.'}\n\nUser: ${message}`);
    res.json({ status: 'success', data: { reply } });
  } catch (err) { next(err); }
};
