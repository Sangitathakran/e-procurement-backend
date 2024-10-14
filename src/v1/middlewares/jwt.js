const jwt = require('jsonwebtoken');
const { sendResponse } = require('@src/v1/utils/helpers/api_response');
const { _auth_module } = require('@src/v1/utils/constants/messages');
const { JWT_SECRET_KEY } = require('@config/index');
const {_userType}=require('../utils/constants/index');
const MasterUser = require('../models/master/MasterUser');


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
    if(_userType[route]==user_type){
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

async function auth(req, res, next) {

    try {

      const token = req.header("token");
      if (!token)
        return sendResponse({res, status: 401, message: "You need to provide token for authentication"})

      var decodedId = jwt.decode(token);
      const user = await MasterUser.findOne({ email: decodedId.email })
      
      // if user not found return error
      if (!user)
        return sendResponse({res, status: 401, message: "The user does not exists on this platform"})
  
      if(user.status === "inactive") 
        return sendResponse({res, status: 401, message: "This user is not active"})
    
      // if invalid token return 410 'Unauthorised'
      let tokenValidate = jwt.verify(token, JWT_SECRET_KEY)
      if (!tokenValidate) {
        return sendResponse({res, status: 401, message: "This token has been expired"})
      } else {
        req.user = user;
        next();
      }
    } catch (error) {
      // send error if something goes wrong
      if (error.message === "jwt expired") {
        return sendResponse({res, status: 401, message: "Session has been expired"})
      } else {
        return sendResponse({res, status: 401, message: error.message})
      }
    }
}

module.exports = {
    verifyJwtToken,
    verifyBasicAuth,
    auth
}