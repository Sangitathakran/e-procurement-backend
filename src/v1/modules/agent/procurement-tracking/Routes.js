

const express = require("express");
const { getProcurementTracking, getAssociateOffers, getFarmersByAssocaiteId, getFarmersOrdersData } = require("./Controller");
const { verifyAgent } = require("../utils/verifyAgent");

const procTrackingRoutes = express.Router();


procTrackingRoutes.get("/", verifyAgent, getProcurementTracking);
procTrackingRoutes.get("/associate-offer", verifyAgent, getAssociateOffers);
procTrackingRoutes.get("/farmer-associate", verifyAgent, getFarmersByAssocaiteId);
procTrackingRoutes.get("/farmers/:id", verifyAgent, getFarmersOrdersData);

module.exports = { procTrackingRoutes }; 