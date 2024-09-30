const express = require("express");
const { verifyAgent } = require("../utils/verifyAgent");
const { getProcurement, getOrderedAssociate, getBatchByAssociateOfferrs } = require("./Controller");
const trackDeliveryRoutes = express.Router();


trackDeliveryRoutes.get("/ordered-associate", verifyAgent, getOrderedAssociate);
trackDeliveryRoutes.get("/request", verifyAgent, getProcurement);
trackDeliveryRoutes.get("/batch-by-associateOffers", verifyAgent, getBatchByAssociateOfferrs);


module.exports = { trackDeliveryRoutes }; 
