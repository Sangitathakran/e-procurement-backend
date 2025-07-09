
const { MasterUser } = require("@src/v1/models/master/MasterUser");
const { _auth_module, _response_message, _commonMessages, _middleware } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { TypesModel } = require("@src/v1/models/master/Types");
const { _userTypeFrontendRouteMapping } = require("@src/v1/utils/constants");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const { getPermission } = require("../../user-management/permission");
const { LoginHistory } = require("@src/v1/models/master/loginHistery");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const getIpAddress = require("@src/v1/utils/helpers/getIPAddress");
const { LoginAttempt, ResetLinkHistory } = require("@src/v1/models/master/loginAttempt");
const { generateResetToken } = require("@src/common/services/cryptoServices");

module.exports.login = async (req, res) => {
  try {

    const { email, password, portal_type } = req.body;

    if (!email) {
      return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Email') }] }));
    }
    if (!password) {
      return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Password') }] }));
    }

    const blockChcek = await LoginAttempt.findOne({ email: email.trim() });
    if (blockChcek && blockChcek.lockUntil && blockChcek.lockUntil > new Date()) {
      const remainingTime = Math.ceil((blockChcek.lockUntil - new Date()) / (1000 * 60));

      return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: `Account is locked. Please try again after ${remainingTime} minutes.` }] }));
    }


    const user = await MasterUser.findOne({ email: email.trim() })
      .populate([
        { path: "userRole", select: "" },
        { path: "portalId", select: "organization_name _id email phone" }
      ])
    if (!user) {
      return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _commonMessages.invaildCredentials }] }));
    }
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      const loginAttempt = await LoginAttempt.findOne({ master_id: user._id, userType: user.user_type });

      if (loginAttempt) {

        loginAttempt.failedAttempts += 1;
        loginAttempt.lastFailedAt = new Date();
        if (loginAttempt.failedAttempts >= 5) {
          loginAttempt.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        }

        await loginAttempt.save();

        let remainingAttept = 5 - (loginAttempt.failedAttempts);
        if (remainingAttept == 0) {
          return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: `Account is locked. Please try again after 30 minutes.` }] }));
        }
        return res.status(400).send(new serviceResponse({ status: 400, data: { remainingAttept: remainingAttept },errors: [{ message: _commonMessages.invaildCredentials }] }));
      } else {
        await LoginAttempt.create({
          master_id: user._id,
          userType: user.user_type,
          email: user.email,
          failedAttempts: 1,
          lastFailedAt: new Date()
        });
        return res.status(400).send(new serviceResponse({ status: 400, data: { remainingAttept: 4 }, errors: [{ message: _commonMessages.invaildCredentials }]}));
      }
    }

    const portalTypeMapping = Object.fromEntries(
      Object.entries(_userTypeFrontendRouteMapping).map(([key, value]) => [value, key])
    );

    const userType = _userTypeFrontendRouteMapping[portal_type];

    if (userType !== user.user_type) {
      return res.status(400).send(new serviceResponse({ status: 400, message: _auth_module.Unauthorized(portalTypeMapping[user.user_type]), errors: [{ message: _auth_module.unAuth }] }));
    }


    const payload = { email: user.email, user_id: user?._id, portalId: user?.portalId?._id, user_type: user.user_type }
    const expiresIn = 24 * 60 * 60;
    const token = await jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });
    await LoginHistory.deleteMany({ master_id: user._id, user_type: user.user_type });
    await LoginHistory.create({ token: token, user_type: user.user_type, master_id: user._id, ipAddress: getIpAddress(req) });
    await LoginAttempt.deleteMany({ master_id: user._id, userType: user.user_type });
    const typeData = await TypesModel.find()
    const userData = await getPermission(user)

    const data = {
      token: token,
      user: userData,
      typeData: typeData
    }

    return res.status(200).send(new serviceResponse({ status: 200, message: _auth_module.login('Account'), data: data }));
  } catch (error) {
    _handleCatchErrors(error, res);
  }
}


module.exports.forgetPassword = async (req, res) => {

  try {
    let { email, portalRef, portal_type, } = req.body;

    if (!email) return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Email') }] }));

    const user = await MasterUser.findOne({ email: req.body.email.trim() });

    if (!user) return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _commonMessages.invaildCredentials}] }));

    const payload = { email: user.email, user_id: user?._id, portalId: user?.portalId?._id, user_type: user.user_type }
    const expiresIn = '30m'
    const resetToken = await jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });


    let secretKey = await generateResetToken();
    await ResetLinkHistory.create({ secretKey: secretKey });
    const emailData = {
      resetToken: resetToken,
      email: user.email,
      portal_type: req.body.portal_type,
      expireTime: new Date(Date.now() + 30 * 60 * 1000),
      secretKey: secretKey
    }
    await emailService.sendForgotPasswordEmail(emailData)
    user.isPasswordChangeEmailSend = true
    await user.save()

    return res.status(200).send(new serviceResponse({ status: 200, message: `Forget password email send successfully to ${user.email}` }));

  } catch (error) {
    _handleCatchErrors(error, res)
  }
}

exports.resetPassword = async (req, res) => {

  try {

    const { resetToken, password, secretKey } = req.body;
    if (!resetToken && !secretKey && !password) {
      return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Reset Token, Secret Key and Password') }] }));
    }
    let checkScreateKey = await ResetLinkHistory.findOne({ secretKey: secretKey });

    if (!checkScreateKey) {
      return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Reset link Expiry Please Try Again" }] }));
    }

    if (checkScreateKey.count >= 1) {
      return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Reset link Expiry Please Try Again" }] }));
    }

    if (checkScreateKey.expireTime < new Date()) {
      return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Reset link Expiry Please Try Again" }] }));
    }

    const decodedToken = await jwt.verify(resetToken, JWT_SECRET_KEY);

    if (decodedToken.email) {

      const user = await MasterUser.findOne({ email: decodedToken.email.trim() });

      const checkComparePassword = await bcrypt.compare(password, user.password);

      if (checkComparePassword) return res.status(400).send(new serviceResponse({ status: 400, message: "new password can not be same as old password" }));

      const salt = await bcrypt.genSalt(8);
      const hashPasswrods = await bcrypt.hash(password, salt);

      user.password = hashPasswrods;
      user.passwordChangedAt = new Date()
      const savedUser = await user.save();

      return res.status(200).send(new serviceResponse({ status: 200, message: "Password changed successfully" }))

    } else {
      return res.status(400).send(new serviceResponse({ status: 400, message: "Unauthorized access" }))
    }

  } catch (error) {

    _handleCatchErrors(error, res)
  }
};



exports.logout = async (req, res) => {
  try {
    const token = req.headers.token;

    if (!token) {
      return sendResponse({
        res,
        status: 401,
        message: "Token is required in headers"
      });
    }

    const result = await LoginHistory.findOneAndUpdate({ token: token }, { logged_out_at: new Date() });
    await LoginAttempt.deleteMany({ master_id: result.master_id, userType: result.user_type });

    if (!result) {
      return sendResponse({
        res,
        status: 404,
        message: "Active session not found or already logged out"
      });
    }

    return sendResponse({
      res,
      status: 200,
      message: "Logout successful"
    });

  } catch (err) {
    return sendResponse({
      res,
      status: 500,
      message: "Internal server error"
    });
  }
};

exports.checkSecretKey = async (req, res) => {
  try {
    const { secretKey } = req.params;

    if (!secretKey) {
      return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Secret key Missing') }] }));
    }

    let resetLinkHistory = await ResetLinkHistory.findOne({ secretKey: secretKey });
    if (!resetLinkHistory) {
      return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Reset link Expiry Please Try Again" }] }));
    }
    if (resetLinkHistory.count >= 1) {
      return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Reset link Expiry Please Try Again" }] }));
    }
    resetLinkHistory.count += 1;
    await resetLinkHistory.save()
    return res.status(200).send(new serviceResponse({ status: 200, message: "Secret key is valid", data: { secretKey: true } }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
}