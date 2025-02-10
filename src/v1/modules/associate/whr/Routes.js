const express = require("express");
const { createWhr } = require("./Controller");
const { verifyAssociate } = require("../utils/verifyAssociate");
const { validateForm } = require("./Validation");
const whrRoutes = express.Router();

whrRoutes.post("/create-whr", [verifyAssociate,validateForm], createWhr);


module.exports = { whrRoutes }; 