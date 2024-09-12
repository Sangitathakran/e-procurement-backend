

const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { Login } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");
const { validateLogin } = require("./Validation")

const express = require("express");
const hoAuthRoutes = express.Router();

 hoAuthRoutes.post("/login",[validateLogin,validateErrors],Login);




module.exports = { hoAuthRoutes }; 
