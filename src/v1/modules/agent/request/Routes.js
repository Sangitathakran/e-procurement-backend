const express = require("express");
const { createProcurement, approveRejectOfferByAgent, getProcurement, getAssociateOffer, getofferedFarmers, associateOfferbyid, getProcurementById } = require("./Controller");
const requestRoutes = express.Router();
const { verifyJwtToken } = require("@src/v1/middlewares/jwt")


requestRoutes.put("/offerStatus", verifyJwtToken, approveRejectOfferByAgent);
requestRoutes.get("/associateOffers", verifyJwtToken, getAssociateOffer);
requestRoutes.get("/associateOffers/:id", verifyJwtToken, associateOfferbyid);
requestRoutes.get("/farmerOffers", verifyJwtToken, getofferedFarmers);
requestRoutes.post("/", verifyJwtToken, createProcurement);
requestRoutes.get("/", verifyJwtToken, getProcurement);
requestRoutes.get("/:id", verifyJwtToken, getProcurementById);



module.exports = { requestRoutes }; 
