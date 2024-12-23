const { JWT_SECRET_KEY } = require('@config/index');
const { wareHousev2 } = require('@src/v1/models/app/warehouse/warehousev2Schema');
const { _userType, _userStatus } = require('@src/v1/utils/constants');
const { _response_message } = require('@src/v1/utils/constants/messages');
const { serviceResponse } = require('@src/v1/utils/helpers/api_response');
const { asyncErrorHandler } = require('@src/v1/utils/helpers/asyncErrorHandler');
const jwt = require('jsonwebtoken');

const tokenBlacklist = [];

exports.verifyWarehouse = asyncErrorHandler(async (req, res, next) => {
    const token = req.headers.token || req.cookies.token;
    if (!token) {
        return res.status(200).send(new serviceResponse({ status: 403, errors: [{ message: _response_message.Unauthorized() }] }));
    }
    if (tokenBlacklist.includes(token)) {
        return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: "Token has been revoked" }] }));
    }

    jwt.verify(token, JWT_SECRET_KEY, async function (err, decodedToken) {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: "Token has expired" }] }));
            }
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.invalid("token") }] }));
        }

        const warehouseExist = await wareHousev2.findOne({ _id: decodedToken.user_id });

        if (!warehouseExist) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.notFound("Warehouse") }] }));
        }

        if (warehouseExist.active === false) {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local',
                sameSite: 'strict',
                maxAge: 0,
            });

            return res.status(401).send(new serviceResponse({ status: 401, errors: [{ message: "Inactive Warehouse" }] }));
        }

        Object.entries(decodedToken).forEach(([key, value]) => {
            req[key] = value;
        });

        if (req.url === '/onboarding' || req.url === '/onboarding-status' || req.url === '/find-user-status' || req.url === '/final-submit') {
            next();
        } else if (warehouseExist.is_approved === _userStatus.approved) {
            if (decodedToken.user_type !== _userType.warehouse) {
                return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
            }
            next();
        } else {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.notApproved("Warehouse") }] }));
        }
    });
});
