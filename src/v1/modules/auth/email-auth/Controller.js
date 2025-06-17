
const {MasterUser} = require("@src/v1/models/master/MasterUser");
const { _auth_module, _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { FeatureList } = require("@src/v1/models/master/FeatureList");
const { TypesModel } = require("@src/v1/models/master/Types");
const { _userTypeFrontendRouteMapping } = require("@src/v1/utils/constants");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const { getPermission } = require("../../user-management/permission");

module.exports.login = async (req, res) => {
    try {

        const { email, password, portal_type } = req.body;
        
        if (!email) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Email') }] }));
        }
        if (!password) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Password') }] }));
        }

        const user = await MasterUser.findOne({ email: email.trim() })
          .populate([
            {path: "userRole", select: ""},
            {path: "portalId", select: "organization_name _id email phone"}
          ]) 
        
        if (!user) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('User') }] }));
        }
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('Credentials') }] }));
        }

        
        const portalTypeMapping = Object.fromEntries(
          Object.entries(_userTypeFrontendRouteMapping).map(([key, value]) => [value, key])
        );

        const userType = _userTypeFrontendRouteMapping[portal_type];
        if (userType !== user.user_type) {
          return res.status(400).send(new serviceResponse({ status: 400, message :  _auth_module.Unauthorized(portalTypeMapping[user.user_type]), errors: [{ message: _auth_module.unAuth }] }));
        }


        const payload = { email: user.email,user_id: user?._id, portalId: user?.portalId?._id, user_type:user.user_type }
        const expiresIn = 24 * 60 * 60;
        const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });

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

    if(!req.body.email) return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Email') }] }));

    const user = await MasterUser.findOne({ email: req.body.email.trim(),portalRef: req.body.portalRef });

    if (!user) return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('Email') }] }));

    const payload = { email: user.email,user_id: user?._id, portalId: user?.portalId?._id, user_type:user.user_type }
    const expiresIn = 24 * 60 * 60;
    const resetToken = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });

    const emailData = { 
      resetToken:resetToken,
      email: user.email,
      portal_type: req.body.portal_type
    }

    await emailService.sendForgotPasswordEmail(emailData)
    user.isPasswordChangeEmailSend = true
    await user.save()

    res.status(200).send(new serviceResponse({ status: 200, message: `Forget password email send successfully to ${user.email}` }));

  } catch (error) {
    _handleCatchErrors(error, res)
  }
}

exports.resetPassword = async (req, res) => {

  try {

    const { resetToken, password } = req.body;

    if (!resetToken) return res.status(400).send(new serviceResponse({ status: 400, message: "reset token missing" }));

    const decodedToken = jwt.verify(resetToken, JWT_SECRET_KEY);

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

    }else{ ;
      return res.status(400).send(new serviceResponse({ status: 400, message: "Unauthorized access" }))
    } 

  } catch (error) {

      _handleCatchErrors(error, res)
    }
};

