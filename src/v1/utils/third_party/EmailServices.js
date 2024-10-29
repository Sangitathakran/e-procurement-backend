const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const { sendMail } = require('@src/v1/utils/helpers/node_mailer');
const OTPModel = require('@src/v1/models/app/auth/OTP');
process.env.SMS_SEND_API_KEY;
APP_URL = process.env.APP_URL;
const LOGO_URL = process.env.LOGO_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: "sandbox.smtp.mailtrap.io",
            port: 2525,
            auth: {
                user: "5ba3e14e2413df",
                pass: "345d1231d7e781"
            }
        });
    }

    async sendEmail(to, subject, html) {
        try {
            await this.transporter.sendMail({
                from: "radiant.infonet001@gmail.com",
                to,
                subject,
                html,
            });
            console.log(`Email sent to ${to}`);
        } catch (error) {
            console.error("Error sending email:", error);
            throw error;
        }
    }

    getOTP() {
        return Math.floor(1000 + Math.random() * 9000);
    }

    async sendForgotPasswordEmail(emailPaylod) {
        try {
            const template = await this.loadTemplate("forgotPassword");
            const resetPasswordLink = `${FRONTEND_URL}/${emailPaylod.portal_type}/reset-password/${emailPaylod.resetToken}`;
            const html = template
                .replace("{{resetPasswordLink}}", resetPasswordLink)
                .replace("{{app_url}}", FRONTEND_URL)
                .replace("{{logo_url}}", LOGO_URL);

            await sendMail(emailPaylod.email, '', 'Reset Your Password', html);
            return { message: 'Forgot Password Link Send successfully' };
        } catch (error) {
            console.error("Error sending forgot password email:", error);
            throw error;
        }
    }

    async sendEmailOTP(newUserEmail) {
        try {
            const otp = this.getOTP();
            let otpRecord = await OTPModel.findOne({ email: newUserEmail });
            if (otpRecord) {
                await OTPModel.deleteOne({ email: newUserEmail });
            }
            const newOTPRecord = new OTPModel({ email: newUserEmail, otp, term_condition: true });
            await newOTPRecord.save();

            const template = await this.loadTemplate("otpTemplate");
            const html = template.replace("{{app_url}}", APP_URL)
                .replace("{{logo_url}}", LOGO_URL)
                .replace("{{otp_code}}", otp);
            await sendMail(newUserEmail, '', 'OTP', html);
        } catch (error) {
            console.error("Error sending otp email:", error);
            throw error;
        }
    }
    async sendUserCredentialsEmail(userDetails) {
        try {
            const email = userDetails.email;
            const userId = userDetails.firstName;
            const password = userDetails.password;
            const login_url = userDetails.login_url

            const template = await this.loadTemplate("hoRegistrationTemplate");
            const html = template
                .replace("{{app_url}}", login_url)
                .replace("{{logo_url}}", LOGO_URL)
                .replace("{{email}}", email)
                .replace("{{user_name}}", userId)
                .replace("{{password}}", password);

            await sendMail(email, '', 'User registration done successfully | NavBazaar Login Credentials ', html);

        } catch (error) {
            console.error("Error sending welcome email:", error);
            throw error;
        }
    }

    async sendAgencyCredentialsEmail(userDetails) {
        try {
            const email = userDetails.email;
            const user_name = userDetails.name;
            const password = userDetails.password;
            const login_url = userDetails.login_url
            const template = await this.loadTemplate("hoRegistrationTemplate");
            const html = template
                .replace("{{app_url}}", login_url)
                .replace("{{logo_url}}", LOGO_URL)
                .replace("{{email}}", email)
                .replace("{{user_name}}", user_name)
                .replace("{{password}}", password);
            await sendMail(email, '', 'Agency registration done successfully | NavBazaar Login Credentials ', html);
        } catch (error) {
            console.error("Error sending welcome email:", error);
            throw error;
        }
    }

    async sendWelcomeEmail(userDetails) {
        try {
            const email = userDetails.basic_details.associate_details.email;
            const userName = userDetails.basic_details.associate_details.organization_name;
            const userCode = userDetails.user_code;

            const template = await this.loadTemplate("welcomeTemplate");
            const html = template
                .replace("{{app_url}}", FRONTEND_URL)
                .replace("{{logo_url}}", LOGO_URL)
                .replace("{{user_name}}", userName)
                .replace("{{user_code}}", userCode);

            await sendMail(email, '', 'Registration done successfully || Navbazar || ', html);

        } catch (error) {
            console.error("Error sending welcome email:", error);
            throw error;
        }
    }

    // head-office first time login and welcome email 
    async sendHoCredentialsEmail(userDetails) {
        try {
            const email = userDetails.email;
            const user_name = userDetails.name;
            const password = userDetails.password;
            const login_url = userDetails.login_url

            const template = await this.loadTemplate("hoRegistrationTemplate");
            const html = template
                .replace("{{app_url}}", login_url)
                .replace("{{logo_url}}", LOGO_URL)
                .replace("{{email}}", email)
                .replace("{{user_name}}", user_name)
                .replace("{{password}}", password);

                
            if(!email){
                throw new Error("Email not provided")
            }
            await sendMail(email, '', 'Head Office registration done successfully | NavBazaar Login Credentials ', html);

        } catch (error) {
            console.error("Error sending welcome email:", error);
            throw error;
        }
    }

    async sendProposedQuantityEmail(requestData) {
        try {
            
            const { email, associate_name, commodity_name, order_no, quantity_request, quoteExpiry, expectedProcurementDate } = requestData;
            const template = await this.loadTemplate("proposedQuantity");
            const html = template
                .replace("{{app_url}}", FRONTEND_URL)
                .replace("{{logo_url}}", LOGO_URL)
                .replace("{{associate_name}}", associate_name)
                .replace("{{commodity_name}}", commodity_name)
                .replace("{{order_no}}", order_no)
                .replace("{{quantity_request}}", quantity_request)
                .replace("{{quoteExpiry}}", quoteExpiry)
                .replace("{{expectedProcurementDate}}", expectedProcurementDate);

            await sendMail(email, '', `New Order Received (Order ID – ${order_no}) || Navbazar ||`, html);

        } catch (error) {
            console.error("Error sending welcome email:", error);
            throw error;
        }
    }

    async sendCreateBatchEmail(email, associate_name) {
        try {
            const template = await this.loadTemplate("createBatch");
            const html = template
                .replace("{{app_url}}", FRONTEND_URL)
                .replace("{{logo_url}}", LOGO_URL)
                .replace("{{associate_name}}", associate_name);

            await sendMail(email, '', `Reminder to Create Batches of the Quantities procured || Navbazar || `, html);

        } catch (error) {
            console.error("Error sending welcome email:", error);
            throw error;
        }
    }

    async sendTrackDeliveryDeliveredEmail(userDetails) {
        try {
            const email = userDetails.basic_details.associate_details.email;
            const userName = userDetails.basic_details.associate_details.organization_name;
            const userCode = userDetails.user_code;

            const template = await this.loadTemplate("trackDeliveryDelivered");
            const html = template
                .replace("{{app_url}}", FRONTEND_URL)
                .replace("{{logo_url}}", LOGO_URL)
                .replace("{{user_name}}", userName)
                .replace("{{user_code}}", userCode);

            await sendMail(email, '', 'Registration done successfully || Navbazar || ', html);

        } catch (error) {
            console.error("Error sending welcome email:", error);
            throw error;
        }
    }

    async sendTrackDeliveryDispatchedEmail(userDetails) {
        try {
            const email = userDetails.basic_details.associate_details.email;
            const userName = userDetails.basic_details.associate_details.organization_name;
            const userCode = userDetails.user_code;

            const template = await this.loadTemplate("trackDeliveryDispatched");
            const html = template
                .replace("{{app_url}}", FRONTEND_URL)
                .replace("{{logo_url}}", LOGO_URL)
                .replace("{{user_name}}", userName)
                .replace("{{user_code}}", userCode);

            await sendMail(email, '', 'Registration done successfully || Navbazar || ', html);

        } catch (error) {
            console.error("Error sending welcome email:", error);
            throw error;
        }
    }

    async sendTrackDeliveryInTransitEmail(emailPayloadData) {
        try {
            const {batch_id,order_no,driver_name,driver_phone,transport_service,vehicle_no,email, associate_name} = emailPayloadData;

            const template = await this.loadTemplate("trackDeliveryInTransit");
            const html = template
                .replace("{{app_url}}", FRONTEND_URL)
                .replace("{{logo_url}}", LOGO_URL)
                .replace("{{batch_id}}", batch_id)
                .replace("{{order_no}}", order_no)
                .replace("{{driver_name}}", driver_name)
                .replace("{{driver_phone}}", driver_phone)
                .replace("{{transport_service}}", transport_service)
                .replace("{{associate_name}}", associate_name)
                .replace("{{vehicle_no}}", vehicle_no);
            await sendMail(email, '', `In-Transit Notification - Batch ID  – ${batch_id} associated with ${order_no} || Navbazar ||`, html);

        } catch (error) {
            console.error("Error sending welcome email:", error);
            throw error;
        }
    }

    async sendPaymentStatusEmail(userDetails) {
        try {
            const email = userDetails.basic_details.associate_details.email;
            const userName = userDetails.basic_details.associate_details.organization_name;
            const userCode = userDetails.user_code;

            const template = await this.loadTemplate("paymentStatus");
            const html = template
                .replace("{{app_url}}", FRONTEND_URL)
                .replace("{{logo_url}}", LOGO_URL)
                .replace("{{user_name}}", userName)
                .replace("{{user_code}}", userCode);

            await sendMail(email, '', 'Registration done successfully || Navbazar || ', html);

        } catch (error) {
            console.error("Error sending welcome email:", error);
            throw error;
        }
    }

    async loadTemplate(templateName) {
        try {
            const templatePath = path.join(__dirname, "../../utils/third_party/emailTemplates", `${templateName}.html`);
            fs.chmodSync(templatePath, '755');
            const templateContent = await fs.promises.readFile(templatePath, { encoding: "utf8" });
            return templateContent;
        } catch (error) {
            console.error(`Error loading email template ${templateName}:`, error);
            throw error;
        }
    }

}

const emailService = new EmailService;
module.exports = { emailService };


