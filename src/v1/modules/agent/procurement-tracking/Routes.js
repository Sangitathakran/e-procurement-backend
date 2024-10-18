

const express = require("express");
const { getProcurementTracking, getAssociateOffers, getFarmersByAssocaiteId, getFarmersOrdersData } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt")

const procTrackingRoutes = express.Router();


procTrackingRoutes.get("/", Auth, getProcurementTracking);
procTrackingRoutes.get("/associate-offer", Auth, getAssociateOffers);
procTrackingRoutes.get("/farmer-associate", Auth, getFarmersByAssocaiteId);
procTrackingRoutes.get("/farmers/:id", Auth, getFarmersOrdersData);

module.exports = { procTrackingRoutes }; 