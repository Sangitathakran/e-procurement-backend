const jwt = require('jsonwebtoken');
const { sendResponse } = require('@src/v1/utils/helpers/api_response');
const { _auth_module } = require('@src/v1/utils/constants/messages');
const { JWT_SECRET_KEY } = require('@config/index');
const { _userType } = require('@src/v1/utils/constants/index');
const { MasterUser } = require('@src/v1/models/master/MasterUser');
const { User } = require('../models/app/auth/User');




// const { redisClient } = require('@config/redis');

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @param {import('express').NextFunction} next 
 * @returns 
 */
const Auth = function (req, res, next) {
  let { token } = req.headers;
  if (token) {

    jwt.verify(token, JWT_SECRET_KEY, async function (err, decoded) {
      if (err) {
        console.log("err-->", err)
        return sendResponse({ res, status: 403, message: "error while token decode", errors: _auth_module.unAuth });
      }
      else {
        if (decoded) {
          const route = req.baseUrl.split("/")[2]
          const user_type = decoded.user_type
          const routeCheck = checkUser(route, user_type)
          if (!routeCheck) {
            return sendResponse({ res, status: 403, message: "error while routecheck decode", errors: _auth_module.unAuth });
          }
          // Set Your Token Keys In Request
          Object.entries(decoded).forEach(([key, value]) => {
            req[key] = value
          })
          if (decoded.email) {
            const user = await MasterUser.findOne({ email: decoded.email.trim() }).populate("portalId")
            req.user = user
          }else{ 
            const user = await MasterUser.findOne({ mobile: decoded.userInput.trim() }).populate("portalId")
            req.user = user
          }

          next();
        } else {
          return sendResponse({ res, status: 403, message: "error while decode not found", errors: _auth_module.tokenExpired });
        }
      }
    });
  }
  else {
    return sendResponse({ res, status: 403, message: "error while verify token", errors: _auth_module.tokenMissing });
  }
};

const checkUser = (route, user_type) => {
  if (_userType[route] == user_type) {
    return true;
  } else {
    const routeList = ['aws', 'master', 'modules', 'agent', 'helper', 'user', 'associate', 'farmer', 'ho', 'bo', 'auth',]
    if (routeList.includes(route)) {
      return true
    }
    return false;
  }
}

const verifyBasicAuth = async function (req, res, next) {
  try {
    const authheader = req.headers.authorization;

    if (!authheader) {
      res.setHeader('WWW-Authenticate', 'Basic');
      return sendResponse({ res, status: 401, errors: _auth_module.unAuth });
    }

    const auth = new Buffer.from(authheader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    if (user && pass) {
      // Match User & Pass from DB
      next();
    } else {
      res.setHeader('WWW-Authenticate', 'Basic');
      return sendResponse({ res, status: 401, errors: _auth_module.unAuth });
    }
  } catch (error) {
    return sendResponse({ res, status: 500, errors: error.message });
  }
}

async function verifyJwtToken(req, res, next) {

  try {

    const token = req.header("token");
    if (!token)
      return sendResponse({ res, status: 401, message: "You need to provide token for authentication" })

    var decodedId = jwt.decode(token);
    const user = await MasterUser.findOne({ email: decodedId.email })

    // if user not found return error
    if (!user)
      return sendResponse({ res, status: 401, message: "The user does not exists on this platform" })

    if (user.status === "inactive")
      return sendResponse({ res, status: 401, message: "This user is not active" })

    // if invalid token return 410 'Unauthorised'
    let tokenValidate = jwt.verify(token, JWT_SECRET_KEY)
    if (!tokenValidate) {
      return sendResponse({ res, status: 401, message: "This token has been expired" })
    } else {
      req.user = user;
      next();
    }
  } catch (error) {
    // send error if something goes wrong
    if (error.message === "jwt expired") {
      return sendResponse({ res, status: 401, message: "Session has been expired" })
    } else {
      return sendResponse({ res, status: 401, message: error.message })
    }
  }
}

module.exports = {
  verifyJwtToken,
  verifyBasicAuth,
  Auth
}