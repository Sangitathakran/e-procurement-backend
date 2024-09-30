const express = require("express");
const { verifyAgent } = require("../utils/verifyAgent");
const { getProcurement, getOrderedAssociate, getBatchByAssociateOfferrs, trackDeliveryByBatchId } = require("./Controller");
const trackDeliveryRoutes = express.Router();


trackDeliveryRoutes.get("/ordered-associate", verifyAgent, getOrderedAssociate);
trackDeliveryRoutes.get("/request", verifyAgent, getProcurement);
trackDeliveryRoutes.get("/batch", verifyAgent, getBatchByAssociateOfferrs);
trackDeliveryRoutes.get("/batch/:id", verifyAgent, trackDeliveryByBatchId)


module.exports = { trackDeliveryRoutes }; 
