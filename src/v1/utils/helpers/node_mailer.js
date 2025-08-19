"use strict";
const { mailer, mailProvider } = require("@config/index");
const nodemailer = require("nodemailer");
const { MailtrapTransport } = require("mailtrap");
const {
  sendWithMailtrap,
} = require("@src/common/services/emailServices/mailTrap");
const { SESsendEmail } = require("@src/common/services/emailServices/AWS_SES");
const { mailProviders, allowedEmailDomains } = require("../constants");
const { _query } = require("../constants/messages");
const logger = require("@src/common/logger/logger");

const defaultMailConfig = {
  user: mailer.user,
  pass: mailer.pass,
  service: mailer.service,
};

/**
 * Check if the email's domain is in the allowed list
 * @param {string} email
 * @returns {boolean}
 */
function isAllowedEmail(email) {
  if (!email || typeof email !== "string") return false;

  // Extract domain part (after @)
  const domainPart = email.split("@")[1];
  if (!domainPart) return false;

  // Get domain name (before .com or first dot)
  const domainName = domainPart.split(".")[0].toLowerCase();

  return allowedEmailDomains.includes(domainName);
}

/**
 * Send email via Mailtrap or AWS SES
 * @param {Object} options
 * @param {'mailtrap'|'ses'} options.provider
 */
const sendMail = async (
  to,
  cc,
  subject,
  body,
  mailAttachments = [],
  provider = mailProvider
) => {
  try {
    if (!Object.values(mailProviders).includes(provider)) {
      throw new Error(_query.invalid("provider"));
    }

    // if (!isAllowedEmail(to)) {
    //     logger.error(`Email domain not allowed for ${to}`);
    //    // throw new Error(`Email domain not allowed for ${to}`);
    // }

    if (provider === mailProviders.mailtrap) {
      return await sendWithMailtrap({
        to,
        subject,
        html: body,
        attachments: mailAttachments,
      });
    } else if (provider === mailProviders.ses) {
      return await SESsendEmail({
        to,
        subject,
        html: body,
        attachments: mailAttachments,
      });
    } else {
      logger.error(`Unsupported email provider ${provider}`);
      throw new Error(`Unsupported email provider: ${provider}`);
    }
  } catch (err) {
    logger.error(err.message);
    //  throw new Error(err.message);
    return
  }
};

module.exports = {
  // sendMail: async function (to, cc, subject, body, mailAttachments, mailConfig = defaultMailConfig, email_prefix) {
  //     try {
  //         return new Promise(function (resolve, reject) {
  //             // Looking to send emails in production? Check out our Email API/SMTP product!
  //             var transporter = nodemailer.createTransport(MailtrapTransport({
  //                 token: mailer.pass,
  //             }));

  //             // console.log("mailer", mailer)

  //             const mailOptions = {
  //                 from: {
  //                     address: mailer.user, // Fallback to .env sender email
  //                     name: "KhetiSauda"
  //                 },
  //                 // from: email_prefix ? `${email_prefix} ${mailer.user}` : `Radiant Infonet ${mailer.user}`,
  //                 to: to,
  //                 cc: cc,
  //                 subject: subject,
  //                 host: 'smtp.mailtrap.io',
  //                 html: body
  //             };

  //             if (mailAttachments) {
  //                 mailOptions.attachments = mailAttachments;
  //             }

  //             try {
  //                 // transporter.verify(function (error, success) {
  //                 //     if (error) {
  //                 //         console.log(error);
  //                 //     } else {
  //                 //         console.log("Server is ready send E-mails", success);
  //                 //     }
  //                 // });

  //                 transporter.sendMail(mailOptions, function (err, info) {
  //                     if (err) {
  //                         console.log("TransporterError---->", err);
  //                         // reject(err.message);
  //                         resolve(err.message);
  //                     } else {
  //                         console.log("E-mail sent successfully");
  //                         resolve(info);
  //                     }
  //                 });
  //             } catch (err) {
  //                 return Promise.reject(err)
  //             }
  //         });
  //     } catch (err) {
  //         // return Promise.reject(err)
  //         // return Promise.resolve(err)
  //         console.log(err);
  //     }
  // },
  sendMail,
};
