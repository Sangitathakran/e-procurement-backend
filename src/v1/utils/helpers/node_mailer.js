'use strict';
const { mailer } = require('@config/index');
const nodemailer = require('nodemailer');

const defaultMailConfig = {
    user: mailer.user,
    pass: mailer.pass,
    service: mailer.service
}

module.exports = {
    sendMail: async function (to, cc, subject, body, mailAttachments, mailConfig = defaultMailConfig, email_prefix) {
        try {
            return new Promise(function (resolve, reject) {
                const transporter = nodemailer.createTransport({
                    service: mailConfig.service || mailer.service,
                    auth: {
                        user: mailConfig.user || mailer.user,
                        pass: mailConfig.pass || mailer.pass
                    },
                });

                const mailOptions = {
                    from: email_prefix ? `${email_prefix} ${mailer.user}` : `Presence360 ${mailer.user}`,
                    to: to,
                    cc: cc,
                    subject: subject,
                    html: body
                };

                if (mailAttachments) {
                    mailOptions.attachments = mailAttachments;
                }

                try {
                    transporter.verify(function (error, success) {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log("Server is ready send E-mails", success);
                        }
                    });
                    transporter.sendMail(mailOptions, function (err, info) {
                        if (err) {
                            //reject(err.message);
                            resolve(err); //temporary changes
                        } else {
                            resolve(info);
                        }
                    });
                } catch (err) {
                    return Promise.reject(err)
                }
            });
        } catch (err) {
            return Promise.reject(err)
        }
    }
}




