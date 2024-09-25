const express = require("express");
const { getHo, saveHeadOffice, updateStatus } = require("./Controllers");
const { validateForm } = require("@src/v1/modules/agent/ho-management/Validation");
const { verifyAgent } = require("../utils/verifyAgent");

const hoMngmntRoutes = express.Router();

hoMngmntRoutes.patch("/status", verifyAgent, updateStatus);
hoMngmntRoutes.get("/", verifyAgent, getHo);
hoMngmntRoutes.post("/", validateForm, saveHeadOffice);


module.exports = { hoMngmntRoutes }; 