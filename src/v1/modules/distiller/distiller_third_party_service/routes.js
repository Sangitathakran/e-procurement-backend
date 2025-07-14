const express = require("express");
const controller = require("@modules/distiller/distiller_third_party_service/controllers");
const { verifyDistiller } = require("@modules/distiller/utils/verifyDistiller");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const thirdPartyRoutes = express.Router();

thirdPartyRoutes.post(
  "/api-service",
  verifyDistiller,
  asyncErrorHandler(controller.createDistiller)
);

module.exports = { thirdPartyRoutes };
