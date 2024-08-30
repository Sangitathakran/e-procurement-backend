const { JWT_SECRET_KEY } = require('@config/index');
const { compareSync } = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require("crypto");

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
