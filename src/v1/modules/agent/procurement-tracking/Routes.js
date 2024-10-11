

const express = require("express");
const { getProcurementTracking, getAssociateOffers } = require("./Controller");

const procTrackingRoutes = express.Router();


procTrackingRoutes.get("/", getProcurementTracking);
procTrackingRoutes.get("/associate-offer", getAssociateOffers);


module.exports = { procTrackingRoutes }; 