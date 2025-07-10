const express = require("express");
const controller = require("./controllers");
const { verifyDistiller } = require("../utils/verifyDistiller");
const thirdPartyRoutes = express.Router();

thirdPartyRoutes.post("/onboarding/create", verifyDistiller, controller.createDistiller);

module.exports = { thirdPartyRoutes };
