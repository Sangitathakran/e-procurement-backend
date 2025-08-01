const { JWT_SECRET_KEY } = require('@config/index');
const { compareSync } = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const { sendResponse } = require('@src/v1/utils/helpers/api_response');
const { _auth_module } = require('@src/v1/utils/constants/messages');
const { _userType } = require('@src/v1/utils/constants/index');
const { LoginHistory } = require('@src/v1/models/master/loginHistery');
const tokenBlacklist = [];
/**
 * @param {String} inputHash
 * @param {String} savedHash
 * @returns {Boolean}
 */
exports.compareBcryptHash = (inputHash, savedHash) => {
  try {
    return compareSync(inputHash, savedHash);
  } catch (error) {
    return false
  }
}

/**
 * @param {Object} data
 * @returns {String}
 */
exports.generateJwtToken = (data) => {
  const token = jwt.sign({ ...data }, JWT_SECRET_KEY)
  return token
}

/**
 * 
 * @param {String} token 
 * @param {Function} callback 
 * @returns {Object}
 */
exports.decryptJwtToken = async (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
      let resp = {
        hasToken: false,
        data: {}
      }
      if (err) return resolve(resp)
      else {

        resp.hasToken = true
        resp.data = decoded
        return resolve(resp)
      }
    })
  })
}



exports.generateAccountSecretKey = () => {
  const id = crypto.randomBytes(16).toString("hex");
  return id
}

exports.verifyJwtToken = async (req, res, next) => {
  try {
    const token = req.headers.token || req.cookies.token;
    if (!token) {
      return res.status(403).json({ message: "Unauthorized", status: 403 });
    }
    if (tokenBlacklist.includes(token)) {
      return res
        .status(401)
        .json({ message: "Token has been revoked", status: 401 });
    }

    jwt.verify(token, JWT_SECRET_KEY, async function (err, decodedToken) {
      if (err) {
        return res.status(401).send({ message: "Token is invalid", status: 401 });
      }
      if (tokenBlacklist.includes(token)) {
        return res
          .status(401)
          .json({ message: "Token has been revoked", status: 401 });
      }
      let loginHistory = await LoginHistory.findOne({ token: token, logged_out_at: null }).sort({ createdAt: -1 });
      if (!loginHistory) {
        return sendResponse({ res, status: 401, message: "error while decode not found", errors: _auth_module.tokenExpired });
      }
      Object.entries(decodedToken).forEach(([key, value]) => {
        req[key] = value
      })
      // req.headers = decodedToken;
      next();
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({
      msg: err.message,
      status: 500,
    });
  }
};
