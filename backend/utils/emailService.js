/**
 * Email Service
 * Sends test result notifications using Nodemailer
 */

const nodemailer = require('nodemailer');

// ─── Create reusable transporter ─────────────────────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// ─── Send test result email to student ───────────────────────────────────────
const sendTestResultEmail = async (user, test, result) => {
  // Skip if email credentials not configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Email not configured — skipping notification');
    return;
  }

  const { score, totalMarks, percentage } = result;
  const passed = percentage >= 50;

  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'MentriQIQ <noreply@mentriqiq.com>',
    to: user.email,
    subject: `Your MentriQIQ Test Result: ${test.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">MentriQIQ</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">Test Result Notification</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
          <p style="font-size: 18px; color: #111827;">Hi <strong>${user.name}</strong>,</p>
          <p style="color: #6b7280;">Your test has been submitted. Here are your results:</p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; margin: 0 0 15px; font-size: 20px;">${test.title}</h2>
            
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
              <div style="text-align: center; flex: 1; min-width: 100px;">
                <div style="font-size: 36px; font-weight: bold; color: ${passed ? '#10b981' : '#ef4444'};">
                  ${percentage}%
                </div>
                <div style="color: #6b7280; font-size: 14px;">Your Score</div>
              </div>
              <div style="text-align: center; flex: 1; min-width: 100px;">
                <div style="font-size: 36px; font-weight: bold; color: #6366f1;">${score}/${totalMarks}</div>
                <div style="color: #6b7280; font-size: 14px;">Marks Obtained</div>
              </div>
              <div style="text-align: center; flex: 1; min-width: 100px;">
                <div style="font-size: 28px; font-weight: bold; color: ${passed ? '#10b981' : '#ef4444'};">
                  ${passed ? '✓ Pass' : '✗ Fail'}
                </div>
                <div style="color: #6b7280; font-size: 14px;">Status</div>
              </div>
            </div>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Login to your MentriQIQ dashboard to view your full result history and explore more tests.
          </p>
          
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            This is an automated email from MentriQIQ. Please do not reply.
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Result email sent to ${user.email}`);
};

module.exports = { sendTestResultEmail };
