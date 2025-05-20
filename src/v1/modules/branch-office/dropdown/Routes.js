const express = require("express");
const { AllScheme } = require("./Controller");

const dropDownRoute = express.Router();

dropDownRoute.get("/allscheme", AllScheme);



module.exports = { dropDownRoute };