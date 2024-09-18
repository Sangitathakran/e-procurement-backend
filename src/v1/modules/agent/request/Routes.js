const express = require("express");
const { verifyAgent } = require("../utils/verifyAssociate");
const { createProcurement, approveRejectOfferByAgent } = require("./Controller");
const requestRoutes = express.Router();


requestRoutes.post("/", verifyAgent, createProcurement);
requestRoutes.put("/offer-status", verifyAgent, approveRejectOfferByAgent);


module.exports = { requestRoutes }; 
