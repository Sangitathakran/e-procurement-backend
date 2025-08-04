const {
  accessKeyId,
  secretAccessKey,
  region,
  sourceEmail,
} = require("@config/index");
const logger = require("@src/common/logger/logger");

const AWS = require("aws-sdk");
const nodemailer = require("nodemailer");

// Configure AWS SDK
AWS.config.update({
  accessKeyId,
  secretAccessKey,
  region,
});

// Create Nodemailer transporter using AWS SES
const transporter = nodemailer.createTransport({
  SES: { ses: new AWS.SES({ apiVersion: "2010-12-01" }), aws: AWS },
});

/**
 * Send Email using AWS SES (via Nodemailer)
 * @param {Object} options
 * @param {string|string[]} options.to - Email recipient(s)
 * @param {string|string[]} [options.cc] - CC recipient(s)
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - HTML body
 * @param {Array<Object>} [options.attachments] - Attachments (same format as Nodemailer)
 */

const SESsendEmail = async ({
  to,
  cc,
  subject,
  html,
  text,
  attachments = [],
}) => {
  const mailOptions = {
    from: sourceEmail,
    to: Array.isArray(to) ? to : [to],
    cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
    subject: subject || "No Subject",
    text: text || "",
    html: html || "",
    attachments, // [{ filename, content, path, contentType }]
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent via SES :", result.messageId);
    logger.info("Email sent via SES :", result.messageId);
    return result;
  } catch (error) {
    console.error("Failed to send email via SES + Nodemailer:", error);
    logger.error("Failed to send email via SES + Nodemailer:", error);
    throw new Error(error.message);
  }
};

module.exports = { SESsendEmail };




// *************************** EXAMLE USAGE  ******************************

// const path = require("path");
// const fs = require("fs");
// const { SESsendEmail } = require("./path-to-your-email-util");

// SESsendEmail({
//   to: "tony11@yopmail.com",
//   cc: "peter@yopmail.com",
//   subject: "Invoice Attached",
//   text: "Please find the invoice attached.",
//   html: "<p>Please find the invoice attached.</p>",
//   attachments: [
//     {
//       filename: "invoice.pdf",
//       path: path.resolve(__dirname, "./invoices/sample-invoice.pdf"),
//       contentType: "application/pdf",
//     },
//     {
//       filename: "report.txt",
//       content: fs.readFileSync(path.resolve(__dirname, "./data/report.txt")),
//     },
//   ],
// })
//   .then((res) => console.log("Email Response:", res))
//   .catch((err) => console.error("Email Error:", err.message));
