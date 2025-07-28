const express = require("express");
const { AllScheme } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt")

const dropDownRoute = express.Router();

dropDownRoute.get("/allscheme",Auth, AllScheme);



module.exports = { dropDownRoute };