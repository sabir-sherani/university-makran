const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendPasswordResetEmail(toEmail, studentName, resetLink) {
  await transporter.sendMail({
    from: `"University of Makran" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Password Reset — University of Makran Student Portal',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:linear-gradient(135deg,#041476,#0a2580);padding:32px 40px;text-align:center;">
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:700;">University of Makran</h1>
          <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:6px 0 0;">Student Portal — Password Reset</p>
        </div>

        <div style="padding:36px 40px;background:#fff;">
          <p style="color:#374151;font-size:15px;margin:0 0 16px;">Hello <strong>${studentName}</strong>,</p>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
            We received a request to reset your Student Portal password. Click the button below to set a new password.
            This link is valid for <strong>1 hour</strong>.
          </p>

          <div style="text-align:center;margin:32px 0;">
            <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#041476,#0a2580);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.3px;">
              Reset My Password
            </a>
          </div>

          <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:24px 0 0;border-top:1px solid #f3f4f6;padding-top:20px;">
            If you did not request this, you can safely ignore this email — your password will not change.<br/>
            This link expires in 1 hour for security reasons.
          </p>
          <p style="color:#d1d5db;font-size:11px;margin:12px 0 0;">
            If the button above doesn't work, copy and paste this URL into your browser:<br/>
            <span style="color:#6b7280;word-break:break-all;">${resetLink}</span>
          </p>
        </div>

        <div style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:11px;margin:0;">
            © ${new Date().getFullYear()} University of Makran, Panjgur · Balochistan, Pakistan
          </p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
