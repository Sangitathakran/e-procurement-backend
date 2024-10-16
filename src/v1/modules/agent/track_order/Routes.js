const express = require("express");
const { verifyJwtToken } = require("@src/v1/middlewares/jwt")
const { getProcurement, getOrderedAssociate, getBatchByAssociateOfferrs, trackDeliveryByBatchId } = require("./Controller");
const trackDeliveryRoutes = express.Router();


trackDeliveryRoutes.get("/ordered-associate", verifyJwtToken, getOrderedAssociate);
trackDeliveryRoutes.get("/request", verifyJwtToken, getProcurement);
trackDeliveryRoutes.get("/batch", verifyJwtToken, getBatchByAssociateOfferrs);
trackDeliveryRoutes.get("/batch/:id", verifyJwtToken, trackDeliveryByBatchId)


module.exports = { trackDeliveryRoutes }; 
