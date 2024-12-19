'use strict';
const { mailer } = require('@config/index');
const nodemailer = require('nodemailer');
const { MailtrapTransport } = require('mailtrap');

const defaultMailConfig = {
    user: mailer.user,
    pass: mailer.pass,
    service: mailer.service
}

module.exports = {
    sendMail: async function (to, cc, subject, body, mailAttachments, mailConfig = defaultMailConfig, email_prefix) {
        try {
            return new Promise(function (resolve, reject) {
                // Looking to send emails in production? Check out our Email API/SMTP product!
                var transporter = nodemailer.createTransport(MailtrapTransport({
                    token: mailer.pass,
                }));

                console.log("mailer", mailer)

                const mailOptions = {
                    from: {
                        address: mailer.user, // Fallback to .env sender email
                        name: "NavBazar"
                    },
                    // from: email_prefix ? `${email_prefix} ${mailer.user}` : `Radiant Infonet ${mailer.user}`,
                    to: to,
                    cc: cc,
                    subject: subject,
                    html: body
                };

                if (mailAttachments) {
                    mailOptions.attachments = mailAttachments;
                }

                try {
                    // transporter.verify(function (error, success) {
                    //     if (error) {
                    //         console.log(error);
                    //     } else {
                    //         console.log("Server is ready send E-mails", success);
                    //     }
                    // });
                    transporter.sendMail(mailOptions, function (err, info) {
                        if (err) {
                            console.log("Error on sending E-mails", err);
                            // reject(err.message);
                            resolve(err.message);
                        } else {
                            console.log("Server is ready send E-mails");
                            resolve(info);
                        }
                    });
                } catch (err) {
                    return Promise.reject(err)
                }
            });
        } catch (err) {
            // return Promise.reject(err)            
            // return Promise.resolve(err)
            console.log(err);
        }
    }
}




