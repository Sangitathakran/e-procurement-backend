const { JWT_SECRET_KEY } = require('@config/index');
const { _userType } = require('@src/v1/utils/constants');
const { _response_message } = require('@src/v1/utils/constants/messages');
const { serviceResponse } = require('@src/v1/utils/helpers/api_response');
const { asyncErrorHandler } = require('@src/v1/utils/helpers/asyncErrorHandler');
const jwt = require('jsonwebtoken');

const tokenBlacklist = [];



exports.verifyAssociate = asyncErrorHandler(async (req, res, next) => {

    const token = req.headers.token || req.cookies.token;
    if (!token) {
        return res.status(200).send(new serviceResponse({ status: 403, errors: [{ message: _response_message.Unauthorized() }] }))
    }
    console.log('req', req.url)
    console.log('originalUrl:', req.originalUrl)
    if (tokenBlacklist.includes(token)) {
        return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: "Token has been revoked" }] }))
    }

    jwt.verify(token, JWT_SECRET_KEY, function (err, decodedToken) {
        if (err) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.invalid("token") }] }))

        }
        if (decodedToken.user_type != _userType.associate) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
        }
        if(req.url =="/onboarding"){

        }
        Object.entries(decodedToken).forEach(([key, value]) => {
            req[key] = value
        })
        // req.headers = decodedToken;
        next();
    });

})



