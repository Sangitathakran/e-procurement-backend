const jwt = require('jsonwebtoken');
const { serviceResponse } = require('@src/v1/utils/helpers/api_response');
const { _auth_module } = require('@src/v1/utils/constants/messages');
const { JWT_SECRET_KEY } = require('@config/index');
const { asyncErrorHandler } = require('../utils/helpers/asyncErrorHandler');
// const { redisClient } = require('@config/redis');

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @param {import('express').NextFunction} next 
 * @returns 
 */
const verifyJwtToken = function (req, res, next) {
    let { token } = req.cookies;
    if (token) {

        jwt.verify(token, JWT_SECRET_KEY, async function (err, decoded) {
            if (err) {
                return res.status(403).json(new serviceResponse({ status: 403, errors: _auth_module.unAuth }));
            }
            else {
                // if (await redisClient.get(decoded._id)) {
                //     // Set Your Token Keys In Request
                //     Object.entries(decoded).forEach(([key, value]) => {
                //         req[key] = value
                //     })
                //     next();
                // } else {
                //     return res.status(403).send(new serviceResponse({ status: 403, errors: _auth_module.tokenExpired }));
                // }
            }
        });
    }
    else {
        return res.status(403).send(new serviceResponse({ status: 403, errors: _auth_module.tokenMissing }));
    }
};

const verifyBasicAuth = asyncErrorHandler(
    async function (req, res, next) {
        const authheader = req.headers.authorization;

        if (!authheader) {
            res.setHeader('WWW-Authenticate', 'Basic');
            return res.status(401).json(new serviceResponse({ status: 401, errors: _auth_module.unAuth }));
        }

        const auth = new Buffer.from(authheader.split(' ')[1], 'base64').toString().split(':');
        const user = auth[0];
        const pass = auth[1];

        if (user && pass) {
            // Match User & Pass from DB
            next();
        } else {
            res.setHeader('WWW-Authenticate', 'Basic');
            return res.status(401).json(new serviceResponse({ status: 401, errors: _auth_module.unAuth }));
        }
    }
)

module.exports = {
    verifyJwtToken,
    verifyBasicAuth
}