
const { MasterUser } = require("@src/v1/models/master/MasterUser");
const { _auth_module, _response_message, _commonMessages, _middleware, _query } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY, FRONTEND_URLS } = require('@config/index');
const { TypesModel } = require("@src/v1/models/master/Types");
const { _userTypeFrontendRouteMapping } = require("@src/v1/utils/constants");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const { getPermission } = require("../../user-management/permission");
const { LoginHistory } = require("@src/v1/models/master/loginHistery");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const getIpAddress = require("@src/v1/utils/helpers/getIPAddress");
const { LoginAttempt, ResetLinkHistory } = require("@src/v1/models/master/loginAttempt");
const SLAManagement = require("@src/v1/models/app/auth/SLAManagement");

module.exports.login = async (req, res) => {
  try {
    const { email, password, portal_type } = req.body;
    const isSlaPortal = portal_type === "agent" ? true : false
    let slaResult;
    if (!email) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _middleware.require('Email is required.') }]
        })
      );
    }

    if (!password) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _middleware.require('Password is required.') }]
        })
      );
    }

    const blockCheck = await LoginAttempt.findOne({ email: email.trim() });
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

    const user = await MasterUser.findOne({ email: email.trim() })
      .select("-createdBy -history -passwordChangedAt ")
      .populate([
        {
          path: "userRole",
          select: ""
        },
        {
          path: "portalId",
          select: "organization_name _id "
        }
      ]);
    if (isSlaPortal) {
      slaResult = await SLAManagement.findOne({ _id: user.portalId._id })
        .select("address")
        .lean();
    }
    if (!user) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _commonMessages.invaildCredentials }]
        })
      );
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

        return res.status(400).send(
          new serviceResponse({
            status: 400,
            errors: [{ message: _commonMessages.invaildCredentials }]
          })
        );
      } else {
        await LoginAttempt.create({
          master_id: user._id,
          userType: user.user_type,
          email: email,
          failedAttempts: 1,
          lastFailedAt: new Date()
        });

        return res.status(400).send(
          new serviceResponse({
            status: 400,
            // data: { remainingAttempts: 4 },
            errors: [{ message: _commonMessages.invaildCredentials }]
          })
        );
      }
    }

    // Portal type mismatch
    const portalTypeMapping = Object.fromEntries(
      Object.entries(_userTypeFrontendRouteMapping).map(([key, value]) => [value, key])
    );

    const userTypeFromPortal = _userTypeFrontendRouteMapping[portal_type];

    if (userTypeFromPortal !== user.user_type) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          message: _auth_module.Unauthorized(portalTypeMapping[user.user_type]),
          errors: [{ message: _auth_module.unAuth }]
        })
      );
    }

    // Generate JWT token
    const payload = {
      email: email,
      user_id: user._id,
      portalId: user?.portalId?._id,
      user_type: user.user_type,
    };
    if (isSlaPortal) {
      payload["state_id"] = slaResult.address.state_id
    }
    const expiresIn = 24 * 60 * 60;
    const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });

    await LoginHistory.deleteMany({ master_id: user._id, user_type: user.user_type });
    await LoginHistory.create({
      token,
      user_type: user.user_type,
      master_id: user._id,
      ipAddress: getIpAddress(req)
    });

    await LoginAttempt.deleteMany({ master_id: user._id, userType: user.user_type });

    const typeData = await TypesModel.find();
    const userData = await getPermission(user);

    const data = {
      token,
      user: userData,
      typeData
    };

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        message: _auth_module.login('Account'),
        data
      })
    );

  } catch (error) {
    return _handleCatchErrors(error, res);
  }
};



module.exports.forgetPassword = async (req, res) => {
  try {
    let { email, portalRef, portal_type } = req.body;

    if (!email) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _middleware.require('Email') }]
        })
      );
    }
    if (!Object.keys(FRONTEND_URLS).includes(portal_type)) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _query.invalid('portal_type') }]
        })
      );
    }

    const user = await MasterUser.findOne({ email: email.trim() });

    if (!user) {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          message: `Forget password email sent successfully to ${email}`
        })
      );
    }

    const payload = {
      email: user.email,
      user_id: user?._id,
      portalId: user?.portalId?._id,
      user_type: user.user_type
    };
    const expiresIn = '30m';
    const resetToken = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });

    // Get IP address
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Save reset token in DB
    await ResetLinkHistory.create({
      token: resetToken,
      email: email,
      ip: ip,
      expireTime: new Date(Date.now() + 30 * 60 * 1000),
      isExpired: false
    });

    const emailData = {
      resetToken: resetToken,
      email: email,
      portal_type: portal_type,
      expireTime: new Date(Date.now() + 30 * 60 * 1000)
    };

    await emailService.sendForgotPasswordEmail(emailData);

    user.isPasswordChangeEmailSend = true;
    await user.save();

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        message: `Forget password email sent successfully to ${user.email}`
      })
    );

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.headers;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [
            {
              message: _commonMessages.invaildCredentials
            }
          ]
        })
      );
    }

    const checkToken = await ResetLinkHistory.findOne({ token });

    if (!checkToken) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: "The reset link is invalid or has already been used. Please request a new one." }]
        })
      );
    }

    if (checkToken.expireTime < new Date()) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: "The reset link has expired. Please request a new one." }]
        })
      );
    }

    const decodedToken = jwt.verify(token, JWT_SECRET_KEY);

    if (decodedToken?.email) {
      const user = await MasterUser.findOne({ email: decodedToken.email.trim() });

      if (!user) {
        return res.status(404).send(
          new serviceResponse({
            status: 404,
            message: "User not found."
          })
        );
      }

      const isSamePassword = await bcrypt.compare(password, user.password);
      if (isSamePassword) {
        return res.status(400).send(
          new serviceResponse({
            status: 400,
            message: "New password cannot be the same as your current password."
          })
        );
      }

      const salt = await bcrypt.genSalt(8);
      const hashedPassword = await bcrypt.hash(password, salt);

      user.password = hashedPassword;
      user.passwordChangedAt = new Date();
      await user.save();
      await LoginAttempt.deleteMany({ email: decodedToken.email.trim() });

      // Invalidate all previous reset links for this user
      await ResetLinkHistory.deleteMany({ email: decodedToken.email });

      return res.status(200).send(
        new serviceResponse({
          status: 200,
          message: "Your password has been reset successfully."
        })
      );
    } else {
      return res.status(401).send(
        new serviceResponse({
          status: 401,
          message: "Unauthorized access. Invalid reset token."
        })
      );
    }

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};


exports.logout = async (req, res) => {
  try {
    const token = req.headers.token;

    if (!token) {
      return sendResponse({
        res,
        status: 401,
        message: "Authorization token is missing from headers."
      });
    }

    const result = await LoginHistory.findOneAndUpdate(
      { token: token },
      { logged_out_at: new Date() }
    );

    if (result) {
      await LoginAttempt.deleteMany({
        master_id: result?.master_id,
        userType: result?.user_type
      });
    }

    return sendResponse({
      res,
      status: 200,
      message: "You have been logged out successfully."
    });

  } catch (err) {
    return sendResponse({
      res,
      status: 500,
      message: "Something went wrong while logging out. Please try again."
    });
  }
};


exports.checkSecretKey = async (req, res) => {
  try {
    const { token } = req.headers;

    if (!token) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _middleware.require('Token is missing') }]
        })
      );
    }

    const resetLinkHistory = await ResetLinkHistory.findOne({ token });

    if (!resetLinkHistory) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: "Reset link has already been used. Please request a new one." }]
        })
      );
    }

    if (resetLinkHistory.expireTime < new Date()) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: "Your reset link has expired. Please request a new one." }]
        })
      );
    }

    if (resetLinkHistory.isExpired === true) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: "Reset link has already been used. Please request a new one." }]
        })
      );
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        message: "Reset link is valid and active.",
        data: { isExpired: false }
      })
    );

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};
