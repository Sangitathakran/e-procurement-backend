const express = require("express");
const { verifyAgent } = require("../utils/verifyAgent");
const { createProcurement, approveRejectOfferByAgent, getProcurement, getAssociateOffer, getofferedFarmers, associateOfferbyid } = require("./Controller");
const trackDeliveryRoutes = express.Router();


trackDeliveryRoutes.get("/request", verifyAgent, getProcurement);


module.exports = { trackDeliveryRoutes }; 
