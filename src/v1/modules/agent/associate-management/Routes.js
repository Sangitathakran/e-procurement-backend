

const express = require("express");
const { getAssociates } = require("./Controllers");
const { verifyAgent } = require("../utils/verifyAgent");

const associateMngmntRoutes = express.Router();


associateMngmntRoutes.get("/",verifyAgent, getAssociates);

module.exports = { associateMngmntRoutes }; 