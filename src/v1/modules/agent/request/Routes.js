const express = require("express");
const { createProcurement, approveRejectOfferByAgent, getProcurement, getAssociateOffer, getofferedFarmers, associateOfferbyid, getProcurementById, updateRequirement,deleteRequirement, getWareHouse } = require("./Controller");
const requestRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt")


requestRoutes.put("/offerStatus", Auth, approveRejectOfferByAgent);
requestRoutes.get("/associateOffers", Auth, getAssociateOffer);
requestRoutes.get("/associateOffers/:id", Auth, associateOfferbyid);
requestRoutes.get("/farmerOffers", Auth, getofferedFarmers);
requestRoutes.post("/", Auth, createProcurement);
requestRoutes.get("/", Auth, getProcurement);
requestRoutes.get("/warehouse", Auth, getWareHouse);
requestRoutes.get("/:id", Auth, getProcurementById);
requestRoutes.patch("/", Auth, updateRequirement);
requestRoutes.delete("/:id", Auth, deleteRequirement);
module.exports = { requestRoutes }; 