const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {  _response_message, _middleware, _auth_module } = require("@src/v1/utils/constants/messages");
const { User } = require("@src/v1/models/app/auth/User");
const  OTP  = require("@src/v1/models/app/auth/OTP");
const SMSService = require('@src/v1/utils/third_party/SMSservices');
const EmailService = require("@src/v1/utils/third_party/EmailServices");
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { verifyJwtToken, decryptJwtToken } = require("@src/v1/utils/helpers/jwt");


module.exports.userRegister = async (req, res) => {

    try {
        const { business_name, trader_type, client_id, email, password, confirm_password, phone } = req.body;
        if (password !== confirm_password) {
            return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.confirm_password_match("confirm_password_match") }));
        }
        const record = await User.create({
            business_name,
            trader_type,
            client_id,
            email,
            password,
            confirm_password,
            phone
        });

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.created("User") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}

const isEmail = (input) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(input);
const isMobileNumber = (input) => /^[0-9]{10}$/.test(input);


const findUser = async (input, type) => {
    return type === 'email'
        ? await User.findOne({ email: input })
        : await User.findOne({ phone: input });
};

const sendEmailOtp = async (email) => {
    const emailService = new EmailService();
    await emailService.sendEmailOTP(email);
};

const sendSmsOtp = async (phone) => {
    const smsService = new SMSService();
    await smsService.sendOTPSMS(phone);
};




module.exports.sendOtp = async (req, res) => {
    try {
        const { input, term_condition } = req.body;
        
        if (!input) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _middleware.require('input') }));
        }
        if (!term_condition || term_condition == false) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _middleware.require('term_condition') }));
        }

        let inputType;

        if (isEmail(input)) {
            inputType = 'email';
        } else if (isMobileNumber(input)) {
            inputType = 'mobile';
        } else {
            return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.invalid('Invalid input formatut') }));
        }

        if (inputType === 'email') {
            await sendEmailOtp(input);
            return res.status(404).send(new serviceResponse({ status: 404, message: _response_message.otpSend("Input is an email and OTP has been sent.") }));
        
        } else if (inputType === 'mobile') {
            await sendSmsOtp(input);
            return res.status(404).send(new serviceResponse({ status: 404, message: _response_message.otpSend("Input is a mobile number and OTP has been sent.") }));
        
        } else {
            return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.invalid("Invalid input format") }));
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}

module.exports.loginOrRegister = async (req, res) => {
    try {
        const { userInput, inputOTP } = req.body;

        if (!userInput || !inputOTP) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _middleware.require('otp_required') }));
        }

        const isEmailInput = isEmail(userInput);
        const query = isEmailInput ? { 'basic_details.email': userInput } : { 'basic_details.phone': userInput };
        const userOTP = await OTP.findOne(isEmailInput ? { email: userInput } : { phone: userInput });

        if (!userOTP || inputOTP !== userOTP.otp) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.invalid('OTP verification failed') }));
        }

        let userExist = await User.findOne(query);

        if (userExist) {
            const payload = { userInput: userInput, user_id: userExist._id, organization_id: userExist.client_id }
            const now = new Date();
            const expiresIn = Math.floor(now.getTime() / 1000) + 3600;
            const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });
            const data = {
                'token': token,
            }

            return res.status(200).send(new serviceResponse({ status: 200, message: _auth_module.login('Account'), data:data }));
        } else {
            const newUser = {
                client_id: isEmailInput ? '1243' : '9876',
                basic_details: isEmailInput ? { email: userInput } : { phone: userInput },
                term_condition: true
            };

            if (isEmailInput) {
                newUser.is_email_verified = true;
            } else {
                newUser.is_mobile_verified = true;
            }

            const userInsert = await User.create(newUser);
            return res.status(201).send(new serviceResponse({ status: 201, message: _auth_module.created('User'), data: userInsert }));
        }

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message, status: 500 });
    }
}


module.exports.saveAssociateDetails = async (req, res) => {
    const getToken = req.headers['token'];
    const decode = await decryptJwtToken(getToken);
    const userId = decode.data.user_id;
    
    

}
