

const express = require("express");
const { getProcurementTracking, getAssociateOffers, getFarmersByAssocaiteId, getFarmersOrdersData } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/middlewares/jwt")

const procTrackingRoutes = express.Router();


procTrackingRoutes.get("/", verifyJwtToken, getProcurementTracking);
procTrackingRoutes.get("/associate-offer", verifyJwtToken, getAssociateOffers);
procTrackingRoutes.get("/farmer-associate", verifyJwtToken, getFarmersByAssocaiteId);
procTrackingRoutes.get("/farmers/:id", verifyJwtToken, getFarmersOrdersData);

module.exports = { procTrackingRoutes }; 