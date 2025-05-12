const express = require("express");
const { HoAllScheme } = require("./Controller");

const dropDownRoute = express.Router();

dropDownRoute.get("/hoallscheme", HoAllScheme);



module.exports = { dropDownRoute };