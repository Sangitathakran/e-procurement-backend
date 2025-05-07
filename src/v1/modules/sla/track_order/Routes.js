const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt")
const { getProcurement, getOrderedAssociate, getBatchByAssociateOfferrs, trackDeliveryByBatchId } = require("./Controller");
const trackDeliveryRoutes = express.Router();


trackDeliveryRoutes.get("/ordered-associate", Auth, getOrderedAssociate);
trackDeliveryRoutes.get("/request", Auth, getProcurement);
trackDeliveryRoutes.get("/batch", Auth, getBatchByAssociateOfferrs);
trackDeliveryRoutes.get("/batch/:id", Auth, trackDeliveryByBatchId)

module.exports = { trackDeliveryRoutes };