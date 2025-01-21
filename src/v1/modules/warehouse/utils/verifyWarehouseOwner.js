const { JWT_SECRET_KEY } = require('@config/index');
const { wareHousev2 } = require('@src/v1/models/app/warehouse/warehousev2Schema');
const { _userType, _userStatus } = require('@src/v1/utils/constants');
const { _response_message } = require('@src/v1/utils/constants/messages');
const { serviceResponse } = require('@src/v1/utils/helpers/api_response');
const { asyncErrorHandler } = require('@src/v1/utils/helpers/asyncErrorHandler');
const jwt = require('jsonwebtoken');

const tokenBlacklist = [];

exports.verifyWarehouseOwner = asyncErrorHandler(async (req, res, next) => {
    const token = req.headers.token || req.cookies.token;
    // Check if token exists
    if (!token) {
        return res.status(403).send(new serviceResponse({
            status: 403,
            errors: [{ message: _response_message.Unauthorized() }]
        }));
    }

    // Check if token is blacklisted
    if (tokenBlacklist.includes(token)) {
        return res.status(401).send(new serviceResponse({
            status: 401,
            errors: [{ message: "Token has been revoked" }]
        }));
    }

    // Verify the token
    jwt.verify(token, JWT_SECRET_KEY, async function (err, decodedToken) {
        if (err) {
            console.log('error',err)
            if (err.name === 'TokenExpiredError') {
                return res.status(401).send(new serviceResponse({
                    status: 401,
                    errors: [{ message: "Token has expired" }]
                }));
            }
            return res.status(401).send(new serviceResponse({
                status: 401,
                errors: [{ message: _response_message.invalid("token") }]
            }));
        }

        // Check if the warehouse exists
        const warehouseExist = await wareHousev2.findOne({ _id: decodedToken.user_id });
        console.log(decodedToken.user_id)
        if (!warehouseExist) {
            return res.status(401).send(new serviceResponse({
                status: 401,
                errors: [{ message: _response_message.notFound("Warehouse Owner") }]
            }));
        }

        // Check if the warehouse is active
        if (!warehouseExist.active) {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local',
                sameSite: 'strict',
                maxAge: 0,
            });

            return res.status(401).send(new serviceResponse({
                status: 401,
                errors: [{ message: "Inactive Warehouse" }]
            }));
        }

        // Attach token data to the request
        Object.entries(decodedToken).forEach(([key, value]) => {
            req[key] = value;
        });

        // Check URL conditions for specific routes
        const allowedUrls = [
            '/onboarding',
            '/onboarding-status',
            '/find-user-status',
            '/final-submit',
            '/batch-approval',
            '/lot-list',
            '/batch-details',
            '/batch-edit',
            '/batch-list',
            '/batch-details/:batch_id',
            '/warehouse-list',
            '/add-warehouse',
            '/final-submit',
            '/edit-warehouse',
            '/purchase-list',
            '/order-list',
            '/warehouse-status'
        ];

        const currentUrl = req.url.split('?')[0];
        console.log(currentUrl)
        const isAllowedUrl = allowedUrls.some(url => currentUrl.startsWith(url));

        if (isAllowedUrl) {
            next();
        } else {
            return res.status(401).send(new serviceResponse({
                status: 401,
                errors: [{ message: _response_message.Unauthorized() }]
            }));
        }
    });
});


