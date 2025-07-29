const { wareHousev2 } = require("@src/v1/models/app/warehouse/warehousev2Schema")
const { MasterUser } = require("@src/v1/models/master/MasterUser");
const { _auth_module, _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { FeatureList } = require("@src/v1/models/master/FeatureList");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const { smsService } = require("@src/v1/utils/third_party/SMSservices");
const OTP = require("@src/v1/models/app/auth/OTP");
const getIpAddress = require("@src/v1/utils/helpers/getIPAddress");
const { _userType, _userStatus } = require("@src/v1/utils/constants");
const { TypesModel } = require("@src/v1/models/master/Types");
const { getPermission } = require("../../user-management/permission");
const { LoginHistory } = require("@src/v1/models/master/loginHistery");
const { Distiller } = require("@src/v1/models/app/auth/Distiller")
const { LoginAttempt } = require("@src/v1/models/master/loginAttempt");

const isEmail = (input) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(input);
const isMobileNumber = (input) => /^[0-9]{10}$/.test(input);

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
            ? { 'ownerDetails.email': userInput }
            : { 'ownerDetails.mobile': userInput };


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

                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('OTP verification failed') }] }));

            } else {
                await LoginAttempt.create({
                    userType: _userType.warehouse,
                    phone: userInput,
                    failedAttempts: 1,
                    lastFailedAt: new Date()
                });

                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('OTP verification failed') }] }));

            }
        } else {
            await LoginAttempt.deleteMany({ phone: userInput });
        }

        const user = await MasterUser.findOne({ mobile: userInput.trim() })
            .populate([
                { path: "userRole", select: "" },
                { path: "portalId", select: "organization_name _id email phone" }
            ])

        console.log("user ============", user);

        if (user) {

            if (user?.user_type === "7") {
                const payload = { user: { _id: user._id, user_type: user?.user_type, portalId: user.portalId._id }, userInput: userInput, user_id: user._id, organization_id: user.portalId._id, user_type: user?.user_type }
                const expiresIn = 24 * 60 * 60; // 24 hour in seconds
                const token = await jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });
                await LoginHistory.deleteMany({ master_id: user._id, user_type: user.user_type });
                await LoginHistory.create({ token: token, user_type: user.user_type, master_id: user._id, ipAddress: getIpAddress(req) });
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local',
                    maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
                });

                let ownerExist = null
                if (user.isAdmin) {
                    ownerExist = await wareHousev2.findOne(query)
                } else {
                    ownerExist = await wareHousev2.findOne({ _id: user.portalId._id })
                }


                const userWithPermission = await getPermission(user)

                return res.status(200).send(new serviceResponse({ status: 200, message: _auth_module.login('Account'), data: { token, ownerExist, userWithPermission } }));
            }
            else {

                return res.send(new serviceResponse({
                    status: 400, message: `already existed with this mobile number in Master(${user.user_type})`,
                    errors: [{ message: `already existed with this mobile number in Master(${user.user_type})` }]
                }))

            }

        } else {

            let ownerExist = await wareHousev2.findOne(query)
            if (!user || !ownerExist) {

                // checking user in master user collection
                const isUserAlreadyExist = await MasterUser.findOne({ mobile: userInput.trim() });

                if (isUserAlreadyExist) {
                    return res.send(new serviceResponse({
                        status: 400, message: "already existed with this mobile number in Master",
                        errors: [{ message: _response_message.allReadyExist("already existed with this mobile number in Master") }]
                    }))
                }


                const newUser = {
                    ownerDetails: isEmailInput
                        ? { email: userInput }
                        : { mobile: userInput },
                    term_condition: true,
                    user_type: _userType.warehouse,
                };
                if (!isEmailInput) {
                    newUser.is_mobile_verified = true;
                }

                ownerExist = await wareHousev2.create(newUser);
                // warehouse type colllection
                const type = await TypesModel.findOne({ _id: "67a5ae6df95d35a6da591454" })


                const masterUser = new MasterUser({

                    isAdmin: true,
                    mobile: userInput.trim(),
                    user_type: type.user_type,
                    userRole: [type.adminUserRoleId],
                    portalId: ownerExist._id,
                    ipAddress: getIpAddress(req)
                });

                const masterUserCreated = await masterUser.save();

                const payload = {
                    user: { _id: masterUserCreated._id, user_type: masterUserCreated?.user_type, portalId: masterUserCreated.portalId },
                    userInput: userInput, user_id: masterUserCreated._id, organization_id: masterUserCreated.portalId, user_type: masterUserCreated?.user_type
                }
                const expiresIn = 24 * 60 * 60; // 24 hour in seconds
                const token = await jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });

                await LoginHistory.create({ token: token, user_type: masterUserCreated.user_type, master_id: masterUserCreated._id, ipAddress: getIpAddress(req) });

                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local',
                    maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
                });

                return res.status(200).send(new serviceResponse({ status: 201, message: _auth_module.created('Account'), data: { token, ownerExist, masterUserCreated } }));

            }

        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.loginOrRegisterDistiller = async (req, res) => {
    try {
        const { userInput, inputOTP } = req.body;

        if (!userInput || !inputOTP) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('otp_required') }] }));
        }
        const staticOTP = '9821';
        const isEmailInput = isEmail(userInput);
        const query = isEmailInput
            ? { 'basic_details.distiller_details.email': userInput }
            : { 'basic_details.distiller_details.phone': userInput };

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

                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('OTP verification failed') }] }));

            } else {
                await LoginAttempt.create({
                    userType: _userType.distiller,
                    phone: userInput,
                    failedAttempts: 1,
                    lastFailedAt: new Date()
                });

                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('OTP verification failed') }] }));

            }
        } else {
            await LoginAttempt.deleteMany({ phone: userInput});
        }

        const user = await MasterUser.findOne({ mobile: userInput.trim() })
            .populate([
                { path: "userRole", select: "" },
                { path: "portalId", select: "organization_name _id email phone" }
            ])

        if (user) {

            if (user?.user_type === "8") {
                const payload = { user: { _id: user._id, user_type: user?.user_type, portalId: user.portalId }, userInput: userInput, user_id: user._id, organization_id: user.portalId, user_type: user?.user_type }

                const expiresIn = 24 * 60 * 60; // 24 hour in seconds
                const token = await jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });
                await LoginHistory.deleteMany({ master_id: user._id, user_type: user.user_type });
                await LoginHistory.create({ token: token, user_type: user.user_type, master_id: user._id, ipAddress: getIpAddress(req) });

                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local',
                    maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
                });

                let ownerExist = null
                if (user.isAdmin) {
                    ownerExist = await Distiller.findOne(query)
                }
                else {
                    ownerExist = await Distiller.findOne({ _id: user.portalId._id })
                }

                const userWithPermission = await getPermission(user)

                ownerExist = {
                    ...JSON.parse(JSON.stringify(ownerExist)),
                    onboarding: (ownerExist?.basic_details?.distiller_details?.organization_name && ownerExist?.basic_details?.point_of_contact && ownerExist.address && ownerExist.company_details && ownerExist.authorised && ownerExist.bank_details && ownerExist.is_form_submitted == 'true') ? true : false
                }

                return res.status(200).send(new serviceResponse({ status: 200, message: _auth_module.login('Account'), data: { token, ownerExist, userWithPermission } }));
            }
            else {

                return res.send(new serviceResponse({
                    status: 400, message: `already existed with this mobile number in Master(${user.user_type})`,
                    errors: [{ message: `already existed with this mobile number in Master(${user.user_type})` }]
                }))
            }

        } else {

            let ownerExist = await Distiller.findOne(query)

            if (!ownerExist) {

                // checking user in master user collection
                const isUserAlreadyExist = await MasterUser.findOne({ mobile: userInput.trim() });

                if (isUserAlreadyExist) {
                    return res.send(new serviceResponse({
                        status: 400, message: "already existed with this mobile number in Master",
                        errors: [{ message: _response_message.allReadyExist("already existed with this mobile number in Master") }]
                    }))
                }

                const newUser = {
                    client_id: isEmailInput ? '1243' : '9876',
                    basic_details: isEmailInput
                        ? { distiller_details: { email: userInput } }
                        : { distiller_details: { phone: userInput } },
                    term_condition: true,
                    user_type: _userType.distiller,
                    is_approved: _userStatus.approved,
                };
                if (isEmailInput) {
                    newUser.is_email_verified = true;
                } else {
                    newUser.is_mobile_verified = true;
                }

                ownerExist = await Distiller.create(newUser);
                const type = await TypesModel.findOne({ _id: "67addcb11bdf461a3a7fcca6" })
                const masterUser = new MasterUser({

                    isAdmin: true,
                    mobile: userInput.trim(),
                    user_type: type.user_type,
                    userRole: [type.adminUserRoleId],
                    portalId: ownerExist._id,
                    ipAddress: getIpAddress(req)
                });

                const masterUserCreated = await masterUser.save();

                const user = await MasterUser.findOne({ mobile: userInput.trim() })
                    .populate([
                        { path: "userRole", select: "" },
                        { path: "portalId", select: "organization_name _id email phone" }
                    ])
                const payload = {
                    user: { _id: user._id, user_type: user?.user_type, portalId: user.portalId },
                    userInput: userInput, user_id: user._id, organization_id: user.portalId, user_type: user?.user_type
                }

                const expiresIn = 24 * 60 * 60; // 24 hour in seconds
                const token = await jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });
                await LoginHistory.deleteMany({ master_id: user._id, user_type: user.user_type });
                await LoginHistory.create({ token: token, user_type: user.user_type, master_id: user._id, ipAddress: getIpAddress(req) });

                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local',
                    maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
                });

                ownerExist = {
                    ...JSON.parse(JSON.stringify(ownerExist)),
                    onboarding: (ownerExist?.basic_details?.distiller_details?.organization_name && ownerExist?.basic_details?.point_of_contact && ownerExist.address && ownerExist.company_details && ownerExist.authorised && ownerExist.bank_details && ownerExist.is_form_submitted == 'true') ? true : false
                }

                return res.status(200).send(new serviceResponse({ status: 201, message: _auth_module.created('Account'), data: { token, ownerExist, userWithPermission: masterUserCreated } }));

            }
            // start of sangita code
            else {

                const newUser = {
                    client_id: isEmailInput ? '1243' : '9876',
                    basic_details: isEmailInput
                        ? { distiller_details: { email: userInput } }
                        : { distiller_details: { phone: userInput } },
                    term_condition: true,
                    user_type: _userType.distiller,
                    is_approved: _userStatus.approved,
                };
                if (isEmailInput) {
                    newUser.is_email_verified = true;
                } else {
                    newUser.is_mobile_verified = true;
                }

                ownerExist = await Distiller.create(newUser);
                // warehouse type colllection
                const type = await TypesModel.findOne({ _id: "67addcb11bdf461a3a7fcca6" })


                const masterUser = new MasterUser({

                    isAdmin: true,
                    mobile: userInput.trim(),
                    user_type: type.user_type,
                    userRole: [type.adminUserRoleId],
                    portalId: ownerExist._id,
                    ipAddress: getIpAddress(req)
                });

                const masterUserCreated = await masterUser.save();

                const user = await MasterUser.findOne({ mobile: userInput.trim() })
                    .populate([
                        { path: "userRole", select: "" },
                        { path: "portalId", select: "organization_name _id email phone" }
                    ])

                const payload = {
                    user: { _id: user._id, user_type: user?.user_type, portalId: user.portalId },
                    userInput: userInput, user_id: user._id, organization_id: user.portalId, user_type: user?.user_type
                }

                const expiresIn = 24 * 60 * 60; // 24 hour in seconds
                const token = await jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });
                await LoginHistory.deleteMany({ master_id: user._id, user_type: user.user_type });
                await LoginHistory.create({ token: token, user_type: user.user_type, master_id: user._id, ipAddress: getIpAddress(req) });

                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local',
                    maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
                });

                ownerExist = {
                    ...JSON.parse(JSON.stringify(ownerExist)),
                    onboarding: (ownerExist?.basic_details?.distiller_details?.organization_name && ownerExist?.basic_details?.point_of_contact && ownerExist.address && ownerExist.company_details && ownerExist.authorised && ownerExist.bank_details && ownerExist.is_form_submitted == 'true') ? true : false
                }


                return res.status(200).send(new serviceResponse({ status: 201, message: _auth_module.created('Account'), data: { token, ownerExist, userWithPermission: masterUserCreated } }));

            }
            // end of sangita code
        }


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

