const jwt = require('jsonwebtoken');
const { sendResponse } = require('@src/v1/utils/helpers/api_response');
const { _auth_module } = require('@src/v1/utils/constants/messages');
const { JWT_SECRET_KEY } = require('@config/index');
// const { redisClient } = require('@config/redis');

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @param {import('express').NextFunction} next 
 * @returns 
 */
const verifyJwtToken = function (req, res, next) {
    let { token } = req.headers;
    if (token) {

        jwt.verify(token, JWT_SECRET_KEY, async function (err, decoded) {
            if (err) {
                return sendResponse({res, status: 403, errors: _auth_module.unAuth });
            }
            else {
              //  console.log(await redisClient.get(decoded._id))
                 if (decoded._id && checkUser(req?.baseUrl?.split('/')[2],decoded.user_type)) {
                    
                    // Set Your Token Keys In Request
                    Object.entries(decoded).forEach(([key, value]) => {
                        req[key] = value
                    })
                    next();
                } else {
                    return sendResponse({res, status: 403, errors: _auth_module.tokenExpired });
                }
            }
        });
    }
    else {
        return sendResponse({res, status: 403, errors: _auth_module.tokenMissing });
    }
};
const checkUser=(route,user_type)=>{
    let user_interface={
        ho:5,
        associate:4,
        farmer:3
    }
    if(user_interface[route]==user_type){
        return true;
    }else{
        return false;
    }
}
const verifyBasicAuth = async function (req, res, next) {
    try {
        const authheader = req.headers.authorization;

        if (!authheader) {
            res.setHeader('WWW-Authenticate', 'Basic');
            return sendResponse({res, status: 401, errors: _auth_module.unAuth });
        }

        const auth = new Buffer.from(authheader.split(' ')[1], 'base64').toString().split(':');
        const user = auth[0];
        const pass = auth[1];

        if (user && pass) {
            // Match User & Pass from DB
            next();
        } else {
            res.setHeader('WWW-Authenticate', 'Basic');
            return sendResponse({res, status: 401, errors: _auth_module.unAuth });
        }
    } catch (error) {
        return sendResponse({res, status: 500, errors: error.message });
    }
}

module.exports = {
    verifyJwtToken,
    verifyBasicAuth
}