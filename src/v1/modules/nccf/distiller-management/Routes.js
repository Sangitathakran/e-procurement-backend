const express = require("express");
const { getDistiller, createNccf, changeStatus } = require("./Controllers");
const { validateForm } = require("@src/v1/modules/nccf/auth/Validation");
const { Auth } = require("@src/v1/middlewares/jwt");


const distillerManagementRoute = express.Router();

distillerManagementRoute.get("/", Auth, getDistiller);

module.exports = { distillerManagementRoute }; 