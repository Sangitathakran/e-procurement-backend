const { getProcurement, getProcurementById, createProcurement, updateProcurement, getFarmerListById, requestApprove, offeredFarmerList, editFarmerOffer, associateOffer, approveRejectOfferByAgent, getAssociateOffers, hoBoList, farmerOrderList } = require("./Controller");
const express = require("express");
const { verifyAssociate } = require("../utils/verifyAssociate");
const requestRoutes = express.Router();
const { _middleware } = require("@src/v1/utils/constants/messages");
const { body } = require("express-validator");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");

requestRoutes.get("/offered-farmer", verifyAssociate, offeredFarmerList);
requestRoutes.get("/farmer-orders", verifyAssociate, farmerOrderList);
requestRoutes.get("/associate-offers", verifyAssociate, getAssociateOffers);
requestRoutes.put("/received-by-farmer", [
    body("receving_date", _middleware.require("receving_date")).not().isEmpty().trim(),
], validateErrors, verifyAssociate, editFarmerOffer,);
requestRoutes.get("/farmers", verifyAssociate, getFarmerListById);
requestRoutes.patch("/request", verifyAssociate, requestApprove);
requestRoutes.post("/associate-offered", verifyAssociate, associateOffer);
requestRoutes.get("/", verifyAssociate, getProcurement);

// requestRoutes.post("/", verifyAssociate, createProcurement);

requestRoutes.put("/", verifyAssociate, updateProcurement);
requestRoutes.get("/:id", verifyAssociate, getProcurementById);
requestRoutes.get("/ho-bo", verifyAssociate, hoBoList);

module.exports = { requestRoutes }; 
