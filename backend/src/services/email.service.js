const nodemailer = require('nodemailer');

/**
 * Email Service
 * Dùng để gửi email thông báo (vd: thực phẩm sắp hết hạn / đã hết hạn)
 *
 * YÊU CẦU CẤU HÌNH ENV:
 * - EMAIL_HOST (optional, nếu không dùng service mặc định)
 * - EMAIL_PORT (optional)
 * - EMAIL_SECURE (optional, 'true' | 'false')
 * - EMAIL_USER
 * - EMAIL_PASS
 */

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_SECURE,
    EMAIL_USER,
    EMAIL_PASS
  } = process.env;

  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('[Email] EMAIL_USER hoặc EMAIL_PASS chưa được cấu hình. Bỏ qua gửi email.');
    return null;
  }

  // Nếu không cấu hình host/port, giả định dùng Gmail
  if (!EMAIL_HOST) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });
  } else {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT ? Number(EMAIL_PORT) : 587,
      secure: EMAIL_SECURE === 'true',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });
  }

  return transporter;
}

/**
 * Gửi email nhắc thực phẩm
 * @param {Object} options
 * @param {string} options.to - email người nhận
 * @param {string} options.subject
 * @param {string} options.text
 * @param {string} [options.html]
 */
async function sendExpiryEmail({ to, subject, text, html }) {
  if (!to) {
    console.warn('[Email] Không có địa chỉ email, bỏ qua gửi.');
    return;
  }

  const tx = getTransporter();
  if (!tx) return;

  const from = `"Smart Fridge" <${process.env.EMAIL_USER}>`;

  try {
    const info = await tx.sendMail({
      from,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`
    });

    console.log('[Email] Đã gửi email:', info.messageId);
  } catch (error) {
    console.error('[Email] Lỗi khi gửi email:', error);
  }
}

module.exports = {
  sendExpiryEmail
};


