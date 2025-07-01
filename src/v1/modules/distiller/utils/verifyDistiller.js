const { JWT_SECRET_KEY } = require('@config/index');
const { Distiller } = require('@src/v1/models/app/auth/Distiller');
const { _userType, _userStatus } = require('@src/v1/utils/constants');
const { _response_message } = require('@src/v1/utils/constants/messages');
const { serviceResponse } = require('@src/v1/utils/helpers/api_response');
const { asyncErrorHandler } = require('@src/v1/utils/helpers/asyncErrorHandler');
const jwt = require('jsonwebtoken');

const tokenBlacklist = [];



exports.verifyDistiller = asyncErrorHandler(async (req, res, next) => {

    const token = req.headers.token || req.cookies.token;
    if (!token) {
        return res.status(200).send(new serviceResponse({ status: 403, errors: [{ message: _response_message.Unauthorized() }] }))
    }
    if (tokenBlacklist.includes(token)) {
        return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: "Token has been revoked" }] }))
    }

    jwt.verify(token, JWT_SECRET_KEY, async function (err, decodedToken) {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: "Token has expired" }] }));
            }
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.invalid("token") }] }))

        }

        const userExist = await Distiller.findOne({ _id: decodedToken.organization_id })

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
        // if (req.url === '/onboarding' || req.url === '/onboarding-status' || req.url === '/find-user-status' || req.url === '/final-submit' || req.url === '/manfacturing-unit' || req.url === '/storage-facility') {
        if (req.url === '/onboarding' || req.url === '/onboarding-status' || req.url === '/find-user-status' || req.url === '/final-submit' || req.url === '/manfacturing-unit' || req.url === '/storage-facility' || req.url.split("?")[0]==="/storage-facility" ||req.url.split("?")[0]==="/manfacturing-unit") {
            next();
        } else if (userExist.is_approved == _userStatus.approved) {
            if (decodedToken.user_type != _userType.distiller) {
                return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
            }
            next();
        } else {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.notApproved("User") }] }));
        }
    });

})



