const axios = require('axios');
const OTPModel = require('@src/v1/models/app/auth/OTP');
SMS_API_KEY = process.env.SMS_SEND_API_KEY;
FRONTEND_URL = process.env.FRONTEND_URL;

class SMSService {
    constructor(sender = 'RADPVT') {
        this.apiKey = SMS_API_KEY;
        this.sender = sender;
    }
    
    async sendOTPSMS(phone) {
        const otp = this.getOTP();
        try {
            let otpRecord = await OTPModel.findOne({ phone });
            if (otpRecord) {
                await OTPModel.deleteOne({ phone });
            }
            const newOTPRecord = new OTPModel({ phone, otp, term_condition:true });
            await newOTPRecord.save();
            return this.sendSMS(phone, otp, 'default');
        } catch (error) {
            return { error: error.message };
        }
    }

    async sendResendSMS(phone,email) {
        const otp = this.getOTP();
        const otpSave = new OTPModel({ phone, email, otp });
        await otpSave.save();
        return this.sendSMS(phone, otp, 'resend');
    }

    async sendPasswordResetSMS(phoneNumber) {
        const otp = this.getOTP();
        return this.sendSMS(phoneNumber, otp, 'reset_password');
    }

    async sendFarmerRegistrationSMS(phoneNumber, farmerName, farmerId) {
        try {
           
            const message = encodeURIComponent(`प्रिय ${farmerName} आपका किसान आईडी ${farmerId} \nके साथ NAVBAZAR \nपर पंजीकरण सफलतापूर्वक पूरा हो गया है। धन्यवाद!\n\n-Navankur`);
            // Prepare the URL for the SMS API request
            const apikey = encodeURIComponent(SMS_API_KEY);
            const number = phoneNumber;
            const sender = this.sender;
            const url = `https://api.textlocal.in/send/?apikey=${apikey}&numbers=${number}&sender=${sender}&message=${message}&unicode=true`;
    
            // Send the SMS using axios
            const response = await axios.post(url);
            return { message: 'Registration SMS sent successfully', response: response.data };
        }   catch (error) {
            return { error: error.message };
        }
    }
    
    async sendWelcomeSMSForAssociate(phoneNumber, name, associateId) {
        try {
            const website = 'https://bit.ly/4eu23WC'; /////  https://ep-testing.navbazar.com/
            const encodedMessage = `Dear ${name}, You have been successfully registered with Navbazar. Here is your Associate ID: ${associateId}. Begin your procurement journey by clicking the following link: ${website}. Team Navankur\n\n-Radiant Infonet Pvt. Ltd`;

            const message = encodeURIComponent(encodedMessage);
            const apikey = encodeURIComponent(SMS_API_KEY);
            const number = phoneNumber;
            const sender = this.sender; 
            const url = `https://api.textlocal.in/send/?apikey=${apikey}&numbers=${number}&sender=${sender}&message=${message}&unicode=true`;
            
            const response = await axios.post(url);
            console.log('response', response.data);
            return { message: 'Registration SMS sent successfully', response: response.data };
        }   catch (error) {
            return { error: error.message };
        }
    }
    
    

    async sendSMS(phoneNumber, otp, templateName = 'default') {
        try {
            const messageTemplate = this.getMessageTemplate(templateName, otp);
            const apikey = encodeURIComponent(SMS_API_KEY);
            const number = phoneNumber;
            const sender = this.sender;
            const message = encodeURIComponent(messageTemplate);
            
            const url = `https://api.textlocal.in/send/?apikey=${apikey}&numbers=${number}&sender=${sender}&message=${message}`;
            const response = await axios.post(url); 
            return { message: 'SMS sent successfully', response: response.data };
        } catch (error) {
            return { error: error.message };
        }
    }

    getOTP() {
        return Math.floor(1000 + Math.random() * 9000);
    }

    getMessageTemplate(templateName, otp) {
        const templates = this.getSMSTemplates();

        if (templates.hasOwnProperty(templateName)) {
            return templates[templateName].replace('{OTP}', otp);
        } else {
            throw new Error(`Template '${templateName}' not found.`);
        }
    }

    getSMSTemplates() {
        return {
            default: 'Your OTP is {OTP} - Radiant Infonet Pvt Ltd.',
            resend: 'Your OTP is {OTP} - Radiant Infonet Pvt Ltd.',
            reset_password: 'Your OTP for password reset is {OTP} - Radiant Infonet Pvt Ltd.',
            custom_action: 'Your custom message with OTP {OTP} - Radiant Infonet Pvt Ltd.',
        };
    }
}

const smsService = new SMSService();

module.exports = {
    smsService
};
