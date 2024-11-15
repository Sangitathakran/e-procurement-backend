const express = require("express");
const { createProcurement, approveRejectOfferByAgent, getProcurement, getAssociateOffer, getofferedFarmers, associateOfferbyid, getProcurementById, updateRequirement } = require("./Controller");
const requestRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt")


requestRoutes.put("/offerStatus", Auth, approveRejectOfferByAgent);
requestRoutes.get("/associateOffers", Auth, getAssociateOffer);
requestRoutes.get("/associateOffers/:id", Auth, associateOfferbyid);
requestRoutes.get("/farmerOffers", Auth, getofferedFarmers);
requestRoutes.post("/", Auth, createProcurement);
requestRoutes.get("/", Auth, getProcurement);
requestRoutes.get("/:id", Auth, getProcurementById);
requestRoutes.patch("/", Auth, updateRequirement);

module.exports = { requestRoutes }; 