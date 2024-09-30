const express = require("express");
const { verifyAgent } = require("../utils/verifyAgent");
const { getProcurement, getOrderedAssociate } = require("./Controller");
const trackDeliveryRoutes = express.Router();


trackDeliveryRoutes.get("/ordered-associate", verifyAgent, getOrderedAssociate);
trackDeliveryRoutes.get("/request", verifyAgent, getProcurement);


module.exports = { trackDeliveryRoutes }; 
