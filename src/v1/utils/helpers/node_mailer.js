'use strict';
const { mailer, mailProvider } = require('@config/index');
const nodemailer = require('nodemailer');
const { MailtrapTransport } = require('mailtrap');
const { sendWithMailtrap } = require('@src/common/services/emailServices/mailTrap');
const { SESsendEmail } = require('@src/common/services/emailServices/AWS_SES');
const { mailProviders } = require('../constants');
const { _query } = require('../constants/messages');

const defaultMailConfig = {
    user: mailer.user,
    pass: mailer.pass,
    service: mailer.service
}

/**
 * Send email via Mailtrap or AWS SES
 * @param {Object} options
 * @param {'mailtrap'|'ses'} options.provider
 */
const sendEmail = async (
  to,
  //cc,
  subject,
  body,
  mailAttachments = [],
  provider = mailProvider // default to mailtrap
) => {
    if( !Object.values(mailProviders).includes(provider)){
        throw new Error(_query.invalid('provider'));
    }

  if (provider === mailProviders.mailtrap) {
    return await sendWithMailtrap({ to, subject, html: body, attachments: mailAttachments });
  } else if (provider === mailProviders.ses) {
    return await SESsendEmail({ to, subject, html: body, attachments: mailAttachments });
  } else {
    throw new Error(`Unsupported email provider: ${provider}`);
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
sendEmail,
    
}




