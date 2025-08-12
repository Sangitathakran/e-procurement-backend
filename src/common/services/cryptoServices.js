const crypto = require("crypto");

/**
 * Generates a secure random reset token (plain key).
 * @returns {String} - Plain token (to be sent via link/email)
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

module.exports = {generateResetToken};
