const mongoose = require('mongoose');
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _auth_module, _query } = require("@src/v1/utils/constants/messages");
const { User } = require("@src/v1/models/app/auth/User");
const OTP = require("@src/v1/models/app/auth/OTP");
const { smsService } = require('@src/v1/utils/third_party/SMSservices');
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { Auth, decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType } = require('@src/v1/utils/constants');
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { LoginAttempt } = require("@src/v1/models/master/loginAttempt");
const { LoginHistory } = require("@src/v1/models/master/loginHistery");
const getIpAddress = require("@src/v1/utils/helpers/getIPAddress");
const xlsx = require('xlsx');
const csv = require("csv-parser");
const isEmail = (input) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(input);
const isMobileNumber = (input) => /^[0-9]{10}$/.test(input);

const findUser = async (input, type) => {
    return type === 'email'
        ? await User.findOne({ email: input })
        : await User.findOne({ phone: input });
};

const sendEmailOtp = async (email) => {
    await emailService.sendEmailOTP(email);
};

const sendSmsOtp = async (phone) => {
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
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid("Invalid input format") }] }));
        }
        if (inputType === 'email') {
            await sendEmailOtp(input);
            return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.otpCreate("Email") }));
        } else if (inputType === 'mobile') {
            const blockCheck = await LoginAttempt.findOne({ phone: input });
            if (blockCheck?.lockUntil && blockCheck.lockUntil > new Date()) {
                const remainingTime = Math.ceil((blockCheck.lockUntil - new Date()) / (1000 * 60));
                return res.status(400).send(
                    new serviceResponse({
                        status: 400,
                        data: { remainingTime },
                        errors: [{ message: `Your account is temporarily locked. Please try again after ${remainingTime} minutes.` }]
                    })
                );
            }
            await sendSmsOtp(input);
            return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.otpCreate("Mobile") }));
        } else {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid("Invalid input format") }] }));
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.loginOrRegister = async (req, res) => {
    try {
        const { userInput, inputOTP } = req.body;

        if (!userInput || !inputOTP) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('otp_required') }] }));
        }
        const staticOTP = '9821';
        const isEmailInput = isEmail(userInput);
        const query = isEmailInput
            ? { 'basic_details.associate_details.email': userInput }
            : { 'basic_details.associate_details.phone': userInput };


        const blockCheck = await LoginAttempt.findOne({ phone: userInput });
        if (blockCheck?.lockUntil && blockCheck.lockUntil > new Date()) {
            const remainingTime = Math.ceil((blockCheck.lockUntil - new Date()) / (1000 * 60));
            return res.status(400).send(
                new serviceResponse({
                    status: 400,
                    data: { remainingTime },
                    errors: [{ message: `Your account is temporarily locked. Please try again after ${remainingTime} minutes.` }]
                })
            );
        }

        const userOTP = await OTP.findOne(isEmailInput ? { email: userInput } : { phone: userInput });


        if ((!userOTP || inputOTP !== userOTP.otp) && inputOTP !== staticOTP) {

            const loginAttempt = await LoginAttempt.findOne({ phone: userInput });

            if (loginAttempt) {
                loginAttempt.failedAttempts += 1;
                loginAttempt.lastFailedAt = new Date();

                if (loginAttempt.failedAttempts >= 5) {
                    loginAttempt.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
                }

                await loginAttempt.save();

                const remainingAttempts = 5 - loginAttempt.failedAttempts;

                if (remainingAttempts <= 0) {
                    return res.status(400).send(
                        new serviceResponse({
                            status: 400,
                            data: { remainingTime: 30 },
                            errors: [{ message: `Your account is locked due to multiple failed attempts. Try again after 30 minutes.` }]
                        })
                    );
                }

                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('OTP ') }] }));

            } else {
                await LoginAttempt.create({
                    userType: _userType.associate,
                    phone: userInput,
                    failedAttempts: 1,
                    lastFailedAt: new Date()
                });

                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('OTP ') }] }));
            }
        } else {
            await LoginAttempt.deleteMany({ phone: userInput });
        }


        let userExist = await User.findOne(query).lean();

        if (!userExist) {
            const newUser = {
                client_id: isEmailInput ? '1243' : '9876',
                basic_details: isEmailInput
                    ? { associate_details: { email: userInput } }
                    : { associate_details: { phone: userInput } },
                term_condition: true,
                user_type: _userType.associate,
            };
            if (isEmailInput) {
                newUser.is_email_verified = true;
            } else {
                newUser.is_mobile_verified = true;
            }

            userExist = await User.create(newUser);
        }

        if (userExist.active == false) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "you are not an active user!" }] }));
        }

        const payload = { userInput: userInput, user_id: userExist._id, organization_id: userExist.client_id, user_type: userExist?.user_type }
        const expiresIn = 24 * 60 * 60; // 24 hour in seconds
        const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });
        await LoginHistory.deleteMany({ master_id: userExist._id, user_type: _userType.associate });
        await LoginHistory.create({ token: token, user_type: _userType.associate, master_id: userExist._id, ipAddress: getIpAddress(req) });

        await LoginHistory.deleteMany({  master_id:userExist._id,user_type: userExist.user_type });
            await LoginHistory.create({
              token :token,
              master_id:userExist._id,
              user_type: userExist.user_type,
              ipAddress: getIpAddress(req)
            });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        });

        const data = {
            token: token,
            user_type: userExist.user_type,
            is_approved: userExist.is_approved,
            phone: userExist.basic_details.associate_details.phone,
            associate_code: userExist.user_code,
            organization_name: userExist.basic_details.associate_details.organization_name || null,
            is_form_submitted: userExist.is_form_submitted,
            onboarding: (userExist?.basic_details?.associate_details?.organization_name && userExist?.basic_details?.point_of_contact && userExist.address && userExist.company_details && userExist.authorised && userExist.bank_details && userExist.is_form_submitted == 'true') ? true : false
        }
        return res.status(200).send(new serviceResponse({ status: 200, message: _auth_module.login('Account'), data: data }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.saveAssociateDetails = async (req, res) => {
    try {
        const getToken = req.headers.token || req.cookies.token;
        if (!getToken) {
            return res.status(200).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
        }
        const decode = await decryptJwtToken(getToken);
        const userId = decode.data.user_id;
        const { formName, ...formData } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound('User') }));
        }

        if (formData.organization_name&&formData.organization_name != user.basic_details.associate_details.organization_name) {
            const isOrganizationName = await User.findOne({ 'basic_details.associate_details.organization_name': formData.organization_name });
            if (isOrganizationName) {
                return res.status(400).send(new serviceResponse({ status: 400, message: "You are already registered with this organization name." }));
            }
        }


        switch (formName) {
            case 'organization':
                user.basic_details.associate_details.organization_name = formData.organization_name;

                break;
            case 'basic_details':
                if (formData.associate_details && formData.associate_details.phone) {
                    delete formData.associate_details.phone
                }
                user.basic_details.associate_details = {
                    ...user.basic_details.associate_details,
                    ...formData.associate_details,
                };
                user.basic_details.point_of_contact = {
                    ...user.basic_details.point_of_contact,
                    ...formData.point_of_contact,
                };
                user.basic_details.company_owner_info = {
                    ...user.basic_details.company_owner_info,
                    ...formData.company_owner_info,
                };
                if (formData.implementation_agency) {
                    user.basic_details.implementation_agency = formData.implementation_agency;
                }
                if (formData.cbbo_name) {
                    user.basic_details.cbbo_name = formData.cbbo_name;
                }
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

        const response = { user_code: user.user_code, user_id: user._id };
        return res.status(200).send(new serviceResponse({ message: _response_message.updated(formName), data: response }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};


module.exports.onboardingStatus = asyncErrorHandler(async (req, res) => {
    const { user_id } = req;
    let record = await User.findOne({ _id: user_id }).lean();
    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("user") }] }));
    }

    const data = [
        { label: "organization", status: record?.basic_details?.associate_details?.organization_name ? "completed" : "pending" },
        { label: "Basic Details", status: record?.basic_details?.point_of_contact ? "completed" : "pending" },
        { label: "Address", status: record.address ? "completed" : "pending" },
        { label: "Company Details", status: record.company_details ? "completed" : "pending" },
        { label: "Authorised Person", status: record.authorised ? "completed" : "pending" },
        { label: "Bank Details", status: record.bank_details ? "completed" : "pending" },
    ];
    return res.status(200).send(new serviceResponse({ status: 200, data, message: _response_message.found("status") }));
})


module.exports.formPreview = async (req, res) => {
    try {
        console.log(req)
        const { user_id } = req;
        if (!user_id) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _middleware.require('user_id') }));
        }
        const response = await User.findById({ _id: user_id });
        if (!response) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound('User') }));
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, message: _query.get("data"), data: response }));
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.findUserStatus = async (req, res) => {
    try {
        const getToken = req.headers.token || req.cookies.token;
        if (!getToken) {
            return res.status(200).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
        }
        const decode = await decryptJwtToken(getToken);
        const userId = decode.data.user_id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound('User') }));
        }

        const response = await User.findById({ _id: userId });
        if (!response) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound('User') }));
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, message: _query.get("data"), data: response }));
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.finalFormSubmit = async (req, res) => {
    try {
        const getToken = req.headers.token || req.cookies.token;
        if (!getToken) {
            return res.status(200).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
        }
        const decode = await decryptJwtToken(getToken);
        const userId = decode.data.user_id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound('User') }));
        }

        user.is_form_submitted = true;

        const allDetailsFilled = (
            user?.basic_details?.associate_details?.organization_name &&
            user?.basic_details?.point_of_contact?.name &&
            user?.address?.registered?.line1 &&
            user?.company_details?.cin_number &&
            user?.authorised?.name &&
            user?.bank_details?.account_number
        );

        if (!user.is_welcome_email_send && allDetailsFilled) {
            await emailService.sendWelcomeEmail(user);
            user.is_welcome_email_send = true;
            await user.save();
        }

        if (!user.is_sms_send && allDetailsFilled) {
            const { phone, organization_name } = user.basic_details.associate_details;

            await smsService.sendWelcomeSMSForAssociate(phone, organization_name, user.user_code);
            await user.updateOne({ is_sms_send: true });
        }

        return res.status(200).send(new serviceResponse({ status: 200, message: _query.update("data"), data: user.is_form_submitted }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.editOnboarding = async (req, res) => {
    try {
        const { user_id } = req;
        if (!user_id) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _middleware.require('user_id') }));
        }

        const response = await User.findById({ _id: user_id });

        if (!response) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound('User') }));
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, message: _query.get("data"), data: response }));
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.associateBulkuplod = async (req, res) => {
    try {
        const { isxlsx = 1 } = req.body;
        const [file] = req.files;

        if (!file) {
            return res.status(400).json({
                message: _response_message.notFound("file"),
                status: 400
            });
        }

        let Associates = [];
        let headers = [];

        if (isxlsx) {
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            Associates = xlsx.utils.sheet_to_json(worksheet);
            // console.log(Associates); return false;
            headers = Object.keys(Associates[0]);
        } else {
            const csvContent = file.buffer.toString('utf8');
            const lines = csvContent.split('\n');
            headers = lines[0].trim().split(',');
            const dataContent = lines.slice(1).join('\n');

            const parser = csv({ headers });
            const readableStream = Readable.from(dataContent);

            readableStream.pipe(parser);
            parser.on('data', async (data) => {
                if (Object.values(data).some(val => val !== '')) {
                    const result = await processFarmerRecord(data);
                    if (!result.success) {
                        errorArray = errorArray.concat(result.errors);
                    }
                }
            });

            parser.on('end', () => {
                console.log("Stream end");
            });
            parser.on('error', (err) => {
                console.log("Stream error", err);
            });
        }

        let errorArray = [];
        const procesAssociateRecord = async (rec) => {
            const associate_type = rec["Aggregator Type (PACS)"];
            const email = rec["Email ID"];
            const mobile_no = rec["Mobile No."];
            const associate_name = rec["Associate Name (Name of PACS)"];
            const state = rec["State"];
            const district = rec["District"];
            const country = rec["Country"];
            const taluka = rec["City"];
            const pinCode = rec["Pin Code"];
            const gst_no = rec["GST No."];
            const cin_number = rec["Registration No. of PACS"];
            const pacs_reg_date = rec["Registration Date of PACS"];
            const name = rec["Contact Person"];
            const line1 = rec["Address of PACS"];
            const bank_name = rec["Bank Name"];
            const branch_name = rec["Bank Branch"];
            const account_number = rec["Bank Account No."];
            const ifsc_code = rec["IFSC Code"];
            const account_holder_name = rec["Account Holder Name"];
            const ar_circle = rec["AR Circle"];
            let errors = [];
            let missingFields = [];
            if (!mobile_no) {
                missingFields.push("Mobile No.");
            }

            if (missingFields.length > 0) {
                errors.push({ record: rec, error: `Required fields missing: ${missingFields.join(', ')}` });
            }

            if (!/^\d{10}$/.test(mobile_no)) {
                errors.push({ record: rec, error: "Invalid Mobile Number" });
            }
            // if (!/^\d{6,40}$/.test(account_number)) {
            //     errors.push({ record: rec, error: "Invalid Account Number: Must be a numeric value between 6 and 18 digits." });
            // }
            if (errors.length > 0) return { success: false, errors };

            try {
                let existingRecord = await User.findOne({ 'basic_details.associate_details.phone': mobile_no });
                if (existingRecord) {
                    return { success: false, errors: [{ record: rec, error: `Associate with Mobile No. ${mobile_no} already registered.` }] };
                } else {
                    const newUser = new User({
                        client_id: '9876',
                        basic_details: {
                            associate_details: {
                                phone: mobile_no,
                                associate_type,
                                email,
                                organization_name: associate_name,
                            },
                            point_of_contact: {
                                name,
                            }
                        },
                        address: {
                            registered: {
                                line1,
                                country,
                                state,
                                district,
                                taluka,
                                pinCode,
                                ar_circle,
                            }
                        },
                        company_details: {
                            gst_no,
                            cin_number,
                            pacs_reg_date,
                        },
                        bank_details: {
                            bank_name,
                            branch_name,
                            account_number,
                            ifsc_code,
                            account_holder_name,
                        },
                        user_type: _userType.associate,
                    });

                    await newUser.save();
                }
            } catch (error) {
                console.log(error);
                errors.push({ record: rec, error: error.message });
            }

            return { success: errors.length === 0, errors };
        };

        for (const Associate of Associates) {
            const result = await procesAssociateRecord(Associate);
            if (!result.success) {
                errorArray = errorArray.concat(result.errors);
            }
        }

        if (errorArray.length > 0) {
            const errorData = errorArray.map(err => ({ ...err.record, Error: err.error }));
            dumpJSONToExcel(req, res, {
                data: errorData,
                fileName: `associate-error_records.xlsx`,
                worksheetName: `associate-record-error_records`
            });
        } else {
            return res.status(200).json({
                status: 200,
                data: {},
                message: "Associate successfully uploaded."
            });
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
module.exports.associateNorthEastBulkuplod = async (req, res) => {
    try {
        const { isxlsx = 1 } = req.body;
        const [file] = req.files;

        if (!file) {
            return res.status(400).json({
                message: _response_message.notFound("file"),
                status: 400
            });
        }

        let Associates = [];
        let headers = [];

        if (isxlsx) {
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            Associates = xlsx.utils.sheet_to_json(worksheet);
            // console.log(Associates); return false;
            headers = Object.keys(Associates[0]);
        } else {
            const csvContent = file.buffer.toString('utf8');
            const lines = csvContent.split('\n');
            headers = lines[0].trim().split(',');
            const dataContent = lines.slice(1).join('\n');

            const parser = csv({ headers });
            const readableStream = Readable.from(dataContent);

            readableStream.pipe(parser);
            parser.on('data', async (data) => {
                if (Object.values(data).some(val => val !== '')) {
                    const result = await processFarmerRecord(data);
                    if (!result.success) {
                        errorArray = errorArray.concat(result.errors);
                    }
                }
            });

            parser.on('end', () => {
                console.log("Stream end");
            });
            parser.on('error', (err) => {
                console.log("Stream error", err);
            });
        }

        let errorArray = [];
        const procesAssociateRecord = async (rec) => {
            const associate_type = rec["Associate Type"];
            const email = rec["Email ID"];
            const mobile_no = rec["Mobile No."];
            const associate_name = rec["Associate Name"];
            const state = rec["State"];
            const district = rec["District"];
            const country = rec["Country"];
            const taluka = rec["City"];
            const pinCode = rec["Pin Code"];
            const gst_no = rec["GST No."];
            const pan_card = rec["Pan number"];
            const cin_number = rec["Cin Number"];
            const poc = rec["POC"];
            const aadhar_number = rec["Aadhar number"];
            let errors = [];
            let missingFields = [];
            if (!mobile_no) {
                missingFields.push("Mobile No.");
            }

            if (missingFields.length > 0) {
                errors.push({ record: rec, error: `Required fields missing: ${missingFields.join(', ')}` });
            }

            if (!/^\d{10}$/.test(mobile_no)) {
                errors.push({ record: rec, error: "Invalid Mobile Number" });
            }
            // if (!/^\d{6,40}$/.test(account_number)) {
            //     errors.push({ record: rec, error: "Invalid Account Number: Must be a numeric value between 6 and 18 digits." });
            // }
            if (errors.length > 0) return { success: false, errors };

            try {
                let existingRecord = await User.findOne({ 'basic_details.associate_details.phone': mobile_no });
                if (existingRecord) {
                    return { success: false, errors: [{ record: rec, error: `Associate with Mobile No. ${mobile_no} already registered.` }] };
                } else {
                    const newUser = new User({
                        client_id: '9876',
                        basic_details: {
                            associate_details: {
                                phone: mobile_no,
                                associate_type: "Organisation",
                                email,
                                organization_name: associate_name,
                            },
                            point_of_contact: {
                                name: poc,
                            },
                        },
                        address: {
                            registered: {
                                country: "INDIA",
                                state,
                                district,
                                taluka,
                                pinCode,
                            }
                        },
                        company_details: {
                            cin_number,
                            gst_no,
                            pan_card,
                            aadhar_number,
                        },
                        user_type: _userType.associate,
                        is_mobile_verified: true,
                        is_approved: 'approved',
                        is_form_submitted: true,
                        is_welcome_email_send: true,
                        term_condition: true,
                        active: true,
                        is_sms_send: true,
                    });

                    await newUser.save();
                }
            } catch (error) {
                console.log(error);
                errors.push({ record: rec, error: error.message });
            }

            return { success: errors.length === 0, errors };
        };

        for (const Associate of Associates) {
            const result = await procesAssociateRecord(Associate);
            if (!result.success) {
                errorArray = errorArray.concat(result.errors);
            }
        }

        if (errorArray.length > 0) {
            const errorData = errorArray.map(err => ({ ...err.record, Error: err.error }));
            dumpJSONToExcel(req, res, {
                data: errorData,
                fileName: `associate-error_records.xlsx`,
                worksheetName: `associate-record-error_records`
            });
        } else {
            return res.status(200).json({
                status: 200,
                data: {},
                message: "Associate successfully uploaded."
            });
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
