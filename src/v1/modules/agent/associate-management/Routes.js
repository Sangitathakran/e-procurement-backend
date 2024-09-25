

const express = require("express");
const { getAssociates, userStatusUpdate } = require("./Controllers");
const { verifyAgent } = require("../utils/verifyAgent");

const associateMngmntRoutes = express.Router();


associateMngmntRoutes.get("/",verifyAgent, getAssociates);
associateMngmntRoutes.patch("/update-approval", userStatusUpdate);

module.exports = { associateMngmntRoutes }; 