const express = require("express");
const { AllScheme } = require("./Controller");
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

const dropDownRoute = express.Router();

dropDownRoute.get("/allscheme",authenticateUser,authorizeRoles(_userType.bo), AllScheme);



module.exports = { dropDownRoute };