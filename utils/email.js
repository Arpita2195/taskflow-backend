const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  const isEmailConfigured = 
    process.env.EMAIL_USER && 
    process.env.EMAIL_USER !== 'your@gmail.com' &&
    process.env.EMAIL_PASS &&
    process.env.EMAIL_PASS !== 'your_app_password';

  if (!isEmailConfigured) {
    console.log('--- EMAIL SIMULATION ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('------------------------');
    return { success: true, simulated: true };
  }

  const mailOptions = {
    from: `"TaskFlow" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    return await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Email Delivery Failed:', err.message);
    // Don't throw error to avoid crashing the invitation flow
    return { success: false, error: err.message };
  }
};

const sendInviteEmail = async (to, inviterName, projectName, inviteLink) => {
  return sendEmail({
    to,
    subject: `${inviterName} invited you to "${projectName}" on TaskFlow`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#6C63FF">⚡ TaskFlow</h2>
        <p>Hi there! <strong>${inviterName}</strong> has invited you to collaborate on <strong>${projectName}</strong>.</p>
        <a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#6C63FF;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Accept Invitation →
        </a>
        <p style="color:#888;font-size:12px">This link expires in 48 hours.</p>
      </div>`,
  });
};

const sendTaskAssignedEmail = async (to, assigneeName, taskTitle, projectName, taskLink) => {
  return sendEmail({
    to,
    subject: `You've been assigned to "${taskTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#6C63FF">⚡ TaskFlow</h2>
        <p>Hi <strong>${assigneeName}</strong>! You've been assigned to a new task.</p>
        <div style="background:#f4f5fa;border-radius:8px;padding:16px;margin:16px 0">
          <strong>${taskTitle}</strong>
          <p style="color:#888;margin:4px 0 0">Project: ${projectName}</p>
        </div>
        <a href="${taskLink}" style="display:inline-block;padding:12px 24px;background:#6C63FF;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          View Task →
        </a>
      </div>`,
  });
};

module.exports = { sendEmail, sendInviteEmail, sendTaskAssignedEmail };
