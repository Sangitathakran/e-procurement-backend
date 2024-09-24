const express = require("express");
const { verifyAgent } = require("../utils/verifyAgent");
const { createProcurement, approveRejectOfferByAgent, getProcurement, getAssociateOffer } = require("./Controller");
const requestRoutes = express.Router();


requestRoutes.put("/offerStatus", verifyAgent, approveRejectOfferByAgent);
requestRoutes.get("/associateOffers", verifyAgent, getAssociateOffer);
requestRoutes.post("/", verifyAgent, createProcurement);
requestRoutes.get("/", verifyAgent, getProcurement);


module.exports = { requestRoutes }; 
