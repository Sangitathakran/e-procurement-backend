const { getProcurement, getProcurementById, createProcurement, updateProcurement, getFarmerListById, requestApprove, offeredFarmerList, editFarmerOffer, associateOffer, approveRejectOfferByAgent, getAssociateOffers, hoBoList, farmerOrderList } = require("./Controller");
const express = require("express");
const { verifyAssociate } = require("../utils/verifyAssociate");
const requestRoutes = express.Router();

requestRoutes.get("/offered-farmer", verifyAssociate, offeredFarmerList);
requestRoutes.get("/farmer-orders", verifyAssociate, farmerOrderList);
requestRoutes.get("/associate-offers", verifyAssociate, getAssociateOffers);
requestRoutes.put("/received-by-farmer", verifyAssociate, editFarmerOffer);
requestRoutes.get("/farmers", verifyAssociate, getFarmerListById);
requestRoutes.patch("/request", verifyAssociate, requestApprove);
requestRoutes.post("/associate-offered", verifyAssociate, associateOffer);
requestRoutes.get("/", verifyAssociate, getProcurement);

// requestRoutes.post("/", verifyAssociate, createProcurement);

requestRoutes.put("/", verifyAssociate, updateProcurement);
requestRoutes.get("/:id", verifyAssociate, getProcurementById);
requestRoutes.get("/ho-bo", verifyAssociate, hoBoList);

module.exports = { requestRoutes }; 
