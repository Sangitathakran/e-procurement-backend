const { JWT_SECRET_KEY, THIRD_PARTY_JWT_SECRET } = require('@config/index');
const { wareHousev2 } = require('@src/v1/models/app/warehouse/warehousev2Schema');
const { _userType, _userStatus } = require('@src/v1/utils/constants');
const { sendResponse } = require('@src/v1/utils/helpers/api_response');
const { _auth_module } = require('@src/v1/utils/constants/messages');
const { serviceResponse } = require('@src/v1/utils/helpers/api_response');
const { asyncErrorHandler } = require('@src/v1/utils/helpers/asyncErrorHandler');
const jwt = require('jsonwebtoken');
const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { ClientToken } = require("@src/v1/models/app/warehouse/ClientToken");
const bcrypt = require("bcryptjs");
const { MasterUser } = require('@src/v1/models/master/MasterUser');
const { LoginHistory } = require("@src/v1/models/master/loginHistery");
const tokenBlacklist = [];

exports.verifyWarehouseOwner = asyncErrorHandler(async (req, res, next) => {
    const token = req.headers.token || req.cookies.token;
    // console.log("header : ??? " ,  req.headers ); 

    // console.log("token : >>> "  , token ) ;  
    // console.log("toke type" , !token) ;
    // Check if token exists
    if (!token) {
        console.log("entered if");
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
            console.log('error', err)
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


        let loginHistory = await LoginHistory.findOne({ token: token}).sort({ createdAt: -1 });

        if (!loginHistory) {
            return sendResponse({ res, status: 401, message: "error while decode not found", errors: _auth_module.tokenExpired });
        }

        const masterUserExist = await MasterUser.findOne({ _id: decodedToken.user_id });

        if (!masterUserExist) {
            return res.send(new serviceResponse({
                status: 400, message: _response_message.notFound("User"),
                errors: [{ message: _response_message.notFound("User") }]
            }))
        }


        // Check if the warehouse exists
        const warehouseExist = await wareHousev2.findOne({ _id: masterUserExist.portalId });



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

        req.user = masterUserExist

        // Check URL conditions for specific routes
        const allowedUrls = [
            '/batch-list',
            '/shipped-view',
            '/transit-view',
            '/batches',
            '/reject',
            '/status',
            '/truck',
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
            '/purchase-order',
            '/warehouse-status',
            '/get-warehouse-dashboardStats',
            '/track/ready-to-ship',
            '/track/in-transit',
            '/get-warehouse-filter-list',
            '/filter-batch-list',
            '/batch-stats',
            '/external-batch',
            '/external-batch-list',
            '/external-order',
            '/list-external-batch',
            '/list-external-order',
            '/batch-order-stats',
            '/mark-delivered',
            '/batch-status-update'

        ];

        const currentUrl = req.url.split('?')[0];

        const isAllowedUrl = allowedUrls.some(url => currentUrl.startsWith(url));

        if (isAllowedUrl) {
            next();
        } else {
            console.log("entered else ")
            return res.status(401).send(new serviceResponse({
                status: 401,
                errors: [{ message: _response_message.Unauthorized() }]
            }));
        }
    });
});


exports.apiKeyAuth = async (req, res, next) => {
    try {
        const apiKey = req.headers["x-api-key"];
        const apiSecret = req.headers["x-api-secret"];
        if (!apiKey || !apiSecret) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _middleware.require('API Key and Secret') }));
        }

        const client = await ClientToken.findOne({ apiKey, isActive: true });

        if (!client) {
            return res.status(403).send(new serviceResponse({
                status: 403,
                errors: [{ message: _response_message.Unauthorized('Invalid API Key') }]
            }));
        }

        if (!client.apiSecret) {
            return res.status(500).send(new serviceResponse({
                status: 500,
                message: "API Secret is missing in the database"
            }));
        }

        if (client.isBlocked) {
            return res.status(403).send(new serviceResponse({
                status: 403,
                message: "Your account is blocked due to multiple failed attempts."
            }));
        }
        if (client.apiRequestsCount >= client.apiUsageLimit) {
            await ClientToken.updateOne({ apiKey }, { isBlocked: true });
            return res.status(403).send(new serviceResponse({
                status: 403,
                message: "API Usage Limit Exceeded. Contact Support."
            }));
        }

        req.client = client;
        client.apiRequestsCount += 1;
        await client.save();
        next();
    } catch (error) {
        console.error("API Key Verification Error:", error);
        _handleCatchErrors(error, res);
    }
};

exports.verifyThirdParty = asyncErrorHandler(async (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).json({ message: "Access Denied: No Token Provided" });

    try {
        const verified = jwt.verify(token.split(" ")[1], process.env.THIRD_PARTY_JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        return res.status(403).json({ message: "Invalid Token" });
    }
});




