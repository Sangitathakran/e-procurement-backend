const { NODE_ENV } = require("@config/index");

module.exports.onGridMiddleware = async (req, res, next) => {
  // Only allow in production
  if (NODE_ENV === 'production') {
    return next(); // Allow access
  }

  // Block in dev/test
  return res.status(400).json({
    status: 400,
    message: 'ON-GRID API can only be used in the production environment!',
  });
};
