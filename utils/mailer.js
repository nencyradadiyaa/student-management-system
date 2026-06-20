const nodemailer = require('nodemailer');
require('dotenv').config();

// Create SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525', 10),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

/**
 * Send welcome email to a newly added student
 * @param {string} studentEmail 
 * @param {string} studentName 
 * @param {string} enrollmentNumber 
 * @returns {Promise<boolean>}
 */
async function sendWelcomeEmail(studentEmail, studentName, enrollmentNumber) {
  // If SMTP user is mock or default, skip sending or log warning safely
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'mock_user') {
    console.log(`[Email Mocked] Welcome mail queued for ${studentName} (${studentEmail}). Setup valid credentials in .env to send real emails.`);
    return true;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"SMS Administrator" <admin@college.edu>',
    to: studentEmail,
    subject: 'Enrollment Notification - College Student Portal',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1a202c;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 700;">Student Management System</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Official Student Enrollment Registry</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 0 0 24px 0;">
        <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">Welcome, ${studentName}!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
          Your student record has been successfully registered on the administrative portal. You can find your credentials and reference parameters listed below:
        </p>
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 18px; margin-bottom: 24px; border: 1px solid #f1f5f9;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 40%;">Enrollment Number:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${enrollmentNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Registered Email:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${studentEmail}</td>
            </tr>
          </table>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
          You can use your Enrollment Number to mark attendance sheets, consult report cards, and register with course syllabi.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;">
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          This is an automated notification. Please do not reply directly to this message.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Welcome email successfully sent to ${studentEmail}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.warn(`[SMTP Warning] Welcome email transmission failed for ${studentEmail}:`, error.message);
    return false;
  }
}

module.exports = {
  sendWelcomeEmail
};
