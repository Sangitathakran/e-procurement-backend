const nodemailer = require('nodemailer');
const { MailtrapTransport } = require('mailtrap');
const { mailer } = require('@config/index');

/**
 * Send email using Mailtrap
 * @param {Object} options
 */
const sendWithMailtrap = async ({ to, cc, subject, html, text, attachments }) => {
  const transporter = nodemailer.createTransport(
    MailtrapTransport({ token: mailer.pass })
  );

  const mailOptions = {
    from: {
      address: mailer.user,
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
    console.log('Mailtrap email sent:', info.message_ids);
    return info;
  } catch (err) {
    console.error('Mailtrap email error:', err);
    throw new Error(err.message);
  }
};

module.exports = { sendWithMailtrap };