const { login } = require("./Controller")
const { validateForm } = require("@src/v1/modules/branch-office/auth/Validation")

const express = require("express");
const { verifyBranchOffice } = require("../utils/Auth");

const userAuthRoutes = express.Router();

userAuthRoutes.post("/bo-login", login);



module.exports = { userAuthRoutes }; 
