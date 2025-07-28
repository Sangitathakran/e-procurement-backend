const { JWT_SECRET_KEY } = require('@config/index');
const { User } = require('@src/v1/models/app/auth/User');
const { _userType, _userStatus,_auth_module } = require('@src/v1/utils/constants');
const { _response_message } = require('@src/v1/utils/constants/messages');
const { serviceResponse } = require('@src/v1/utils/helpers/api_response');
const { asyncErrorHandler } = require('@src/v1/utils/helpers/asyncErrorHandler');
const jwt = require('jsonwebtoken');
const { LoginHistory } = require('@src/v1/models/master/loginHistery');

const tokenBlacklist = [];



exports.verifyAssociate = asyncErrorHandler(async (req, res, next) => {

    const token = req.headers.token || req.cookies.token;
    if (!token) {
        return res.status(200).send(new serviceResponse({ status: 403, errors: [{ message: _response_message.Unauthorized() }] }))
    }
    if (tokenBlacklist.includes(token)) {
        return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: "Token has been revoked" }] }))
    }

    let loginHistory = await LoginHistory.findOne({ token: token, logged_out_at: null }).sort({ createdAt: -1 });
    if (!loginHistory) {
        return sendResponse({ res, status: 401, message: "error while decode not found", errors: _auth_module.tokenExpired });
    }

    jwt.verify(token, JWT_SECRET_KEY, async function (err, decodedToken) {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: "Token has expired" }] }));
            }
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.invalid("token") }] }))

        }

        const userExist = await User.findOne({ _id: decodedToken.user_id })

        if (!userExist) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.notFound("User") }] }));
        }

        if (userExist.active == false) {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local',
                sameSite: 'strict',
                maxAge: 0,
            });

            return res.status(401).send(new serviceResponse({ status: 401, errors: [{ message: "Inactive User" }] }));
        }
        Object.entries(decodedToken).forEach(([key, value]) => {
            req[key] = value
        })
        // req.headers = decodedToken;
        if (req.url === '/onboarding' || req.url === '/onboarding-status' || req.url === '/find-user-status' || req.url === '/final-submit') {
            next();
        } else if (userExist.is_approved == _userStatus.approved) {
            if (decodedToken.user_type != _userType.associate) {
                return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
            }
            next();
        } else {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.notApproved("User") }] }));
        }
    });

})



