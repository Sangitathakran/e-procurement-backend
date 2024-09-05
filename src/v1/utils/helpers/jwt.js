const { JWT_SECRET_KEY } = require('@config/index');
const { compareSync } = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require("crypto");

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
    const { token } = req.headers;
    if (!token) {
      return res.status(403).json({ message: "Unauthorized", status: 403 });
    }
    if (tokenBlacklist.includes(token)) {
      return res
        .status(401)
        .json({ message: "Token has been revoked", status: 401 });
    }

    jwt.verify(token, JWT_SECRET_KEY, function (err, decodedToken) {
      if (err) {
        return res.status(401).send({ message: "Token is invalid", status: 401 });
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (decodedToken.exp < currentTime) {
        return res.status(401).json({ message: "Token has expired" });
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

exports.verifyJwtTokenViaCookie = async (req, res, next) => {
  try {
    const token  = req.cookies.token;
    if (!token) {
      return res.status(403).json({ message: "Unauthorized", status: 403 });
    }
    if (tokenBlacklist.includes(token)) {
      return res
        .status(401)
        .json({ message: "Token has been revoked", status: 401 });
    }

    jwt.verify(token, JWT_SECRET_KEY, function (err, decodedToken) {
      if (err) {
        return res.status(401).send({ message: "Token is invalid", status: 401 });
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (decodedToken.exp < currentTime) {
        return res.status(401).json({ message: "Token has expired" });
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