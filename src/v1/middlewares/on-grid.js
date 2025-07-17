const { NODE_ENV } = require("@config/index");

module.exports.onGridMiddleware = async (req, res, next) => {
 // console.log(req.body);
  // Only allow in production
  if (NODE_ENV === "production") {
    return next(); // Allow access
  }

  if (req.url == "/verify") {
    return res.json({
      status: 200,
      data: {
        bank_data: {
          is_verified: true,
          account_holder_name: "GENDALAL GURJAR",
          account_no: "951118210006876",
          bank_name: "BANK OF INDIA",
          branch_name: "BORGAON BUZURG",
          ifsc_code: "BKID0009511",
        },
      },
      message: "This is a static response only for testing.",
      event: {},
      errorCode: "",
      errors: [],
      version: "1.0",
    });
  }
  // Block in dev/test
  return res.status(400).json({
    status: 400,
    message: "ON-GRID API can only be used in the production environment!",
  });
};
