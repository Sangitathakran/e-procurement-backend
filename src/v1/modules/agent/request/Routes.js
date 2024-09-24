const express = require("express");
const { verifyAgent } = require("../utils/verifyAgent");
const { createProcurement, approveRejectOfferByAgent, getProcurement, getAssociateOffer, getofferedFarmers, associateOfferbyid } = require("./Controller");
const requestRoutes = express.Router();


requestRoutes.put("/offerStatus", verifyAgent, approveRejectOfferByAgent);
requestRoutes.get("/associateOffers", verifyAgent, getAssociateOffer);
requestRoutes.get("/associateOffers/:id", verifyAgent, associateOfferbyid);
requestRoutes.get("/farmerOffers", verifyAgent, getofferedFarmers);
requestRoutes.post("/", verifyAgent, createProcurement);
requestRoutes.get("/", verifyAgent, getProcurement);


module.exports = { requestRoutes }; 
