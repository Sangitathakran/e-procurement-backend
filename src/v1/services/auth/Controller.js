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
            return res.status(200).send(new serviceResponse({ status: 400, message: _middleware.require('input') }));
        }
        if (!term_condition || term_condition == false) {
            return res.status(200).send(new serviceResponse({ status: 400, message: _middleware.require('term_condition') }));
        }

        let inputType;

        if (isEmail(input)) {
            inputType = 'email';
        } else if (isMobileNumber(input)) {
            inputType = 'mobile';
        } else {
            return res.status(400).send(new serviceResponse({ status: 400, errors:[{message:_response_message.invalid("Invalid input format")}] }));
        }

        if (inputType === 'email') {
            await sendEmailOtp(input);
            return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.otpCreate("Email") }));
        
        } else if (inputType === 'mobile') {
            await sendSmsOtp(input);
            return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.otpCreate("Mobile") }));
        
        } else {
            return res.status(400).send(new serviceResponse({ status: 400, errors:[{message:_response_message.invalid("Invalid input format")}] }));
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}

module.exports.loginOrRegister = async (req, res) => {
    try {
        const { userInput, inputOTP } = req.body;

        if (!userInput || !inputOTP) {
            return res.status(200).send(new serviceResponse({ status: 400, message: _middleware.require('otp_required') }));
        }

        const isEmailInput = isEmail(userInput);
        const query = isEmailInput 
            ? { 'basic_details.associate_details.email': userInput } 
            : { 'basic_details.associate_details.phone': userInput };
        const userOTP = await OTP.findOne(isEmailInput ? { email: userInput } : { phone: userInput });

        if (!userOTP || inputOTP !== userOTP.otp) {
            return res.status(200).send(new serviceResponse({ status: 400, message: _response_message.invalid('OTP verification failed') }));
        }

        let userExist = await User.findOne(query);

        if (userExist) {
            const payload = { userInput: userInput, user_id: userExist._id, organization_id: userExist.client_id }
            const now = new Date();
            const expiresIn = Math.floor(now.getTime() / 1000) + 3600;
            const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });
            res.cookie('token', token, { 
                httpOnly: true,
                secure: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local',
                maxAge: 3600000 // 1 hour in milliseconds
            });
            const data = { 
                token: token, 
                organization_name: userExist.basic_details.associate_details.organization_name || null 
            }

            return res.status(200).send(new serviceResponse({ status: 200, message: _auth_module.login('Account'), data:data }));
        } else {
            const newUser = {
                client_id: isEmailInput ? '1243' : '9876',
                basic_details: isEmailInput 
                    ? { associate_details: { email: userInput } } 
                    : { associate_details: { phone: userInput } },
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

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.saveAssociateDetails = async (req, res) => {
    try {
        const getToken = req.cookies.token;
        if (!getToken) {
            return res.status(401).send(new serviceResponse({ status: 401, message: _response_message.require('token') }));
        }
        const decode = await decryptJwtToken(getToken);
        const userId = decode.data.user_id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound('User') }));
        }

        const { formName, ...formData } = req.body;
        
        switch (formName) {
            case 'organization':
                user.basic_details.associate_details.organization_name = formData.organization_name;
                break;
            case 'basic_details':
                user.basic_details.associate_details = {
                    ...user.basic_details.associate_details,
                    ...formData.associate_details, 
                };
                user.basic_details.point_of_contact = {
                    ...user.basic_details.point_of_contact,
                    ...formData.point_of_contact,
                };
                break;
            case 'address':
                user.address = {
                    ...user.address,
                    ...formData
                };
                break;
            case 'company_details':
                user.company_details = {
                    ...user.company_details,
                    ...formData
                };
                break;
            case 'authorised':
                user.authorised = {
                    ...user.authorised,
                    ...formData
                };
                break;
            case 'bank_details':
                    user.bank_details = {
                        ...user.bank_details,
                        ...formData
                    };
                    break;
            default:
                return res.status(400).send(new serviceResponse({ status: 400, message: `Invalid form name: ${formName}` }));
        }

        await user.save();

        const response = { user_code: user.user_code, user_id:user._id };
        return res.status(200).send(new serviceResponse({ message: _response_message.updated(formName), data:response }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
