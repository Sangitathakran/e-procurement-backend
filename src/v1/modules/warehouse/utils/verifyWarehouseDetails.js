const { JWT_SECRET_KEY } = require('@config/index');
const { wareHouseDetails } = require('@src/v1/models/app/warehouse/warehouseDetailsSchema');
const { _userType, _userStatus } = require('@src/v1/utils/constants');
const { _response_message } = require('@src/v1/utils/constants/messages');
const { serviceResponse } = require('@src/v1/utils/helpers/api_response');
const { asyncErrorHandler } = require('@src/v1/utils/helpers/asyncErrorHandler');
const jwt = require('jsonwebtoken');

const tokenBlacklist = [];

exports.verifyWarehouseDetails = asyncErrorHandler(async (req, res, next) => {
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

        const warehouseDetailsExist = await wareHouseDetails.findOne({ _id: decodedToken.user_id });

        if (!warehouseDetailsExist) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.notFound("Warehouse Details") }] }));
        }

        if (warehouseDetailsExist.active === false) {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local',
                sameSite: 'strict',
                maxAge: 0,
            });

            return res.status(401).send(new serviceResponse({ status: 401, errors: [{ message: "Inactive Warehouse Details" }] }));
        }

        Object.entries(decodedToken).forEach(([key, value]) => {
            req[key] = value;
        });

        if (req.url === '/details-onboarding' || req.url === '/details-status' || req.url === '/details-find-status' || req.url === '/details-final-submit') {
            next();
        } else if (warehouseDetailsExist.is_approved === _userStatus.approved) {
            if (decodedToken.user_type !== _userType.warehouse) {
                return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
            }
            next();
        } else {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.notApproved("Warehouse Details") }] }));
        }
    });
});