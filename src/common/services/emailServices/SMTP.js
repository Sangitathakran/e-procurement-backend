const nodemailer = require('nodemailer');
const { smtpMailer } = require('@config/index'); 
const logger = require('@src/common/logger/logger');

/**
 * Send email using SMTP transport
 * @param {Object} options - { to, cc, subject, html, text, attachments }
 */
const sendWithSMTP = async ({ to, cc, subject, html, text, attachments }) => {
  // Create SMTP transporter using config credentials
  const transporter = nodemailer.createTransport({
    host: smtpMailer.host,   
    port: smtpMailer.port,         
    secure: smtpMailer.secure,    // true for 465, false for other ports like 587
    auth: {
      user: smtpMailer.auth.user,
      pass: smtpMailer.auth.pass,
    },
  });

  const mailOptions = {
    from: {
      address: smtpMailer.auth.user,
      name: 'KhetiSauda',
    },
    to,
    cc,
    subject,
    html,
    text,
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`SMTP email sent: ${info.messageId}`);
    info.success = info?.messageId ? true : false;
    return info;
  } catch (err) {
    console.log(err);
    logger.error('SMTP email error:', err);
    throw new Error(err.message);
  }
};

module.exports = { sendWithSMTP };
