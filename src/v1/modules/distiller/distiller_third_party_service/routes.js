const express = require("express");
const controller = require("@modules/distiller/distiller_third_party_service/controllers");
const { verifyDistiller } = require("@modules/distiller/utils/verifyDistiller");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const thirdPartyRoutes = express.Router();

thirdPartyRoutes.post( "/api-service", controller.authMiddleware,asyncErrorHandler(controller.createDistiller));

thirdPartyRoutes.post("/login",controller.loginUser);


module.exports = { thirdPartyRoutes };
