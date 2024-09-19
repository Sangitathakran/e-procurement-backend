const express = require("express");
const { verifyAgent } = require("../utils/verifyAgent");
const { createProcurement, approveRejectOfferByAgent, getProcurement } = require("./Controller");
const requestRoutes = express.Router();


requestRoutes.post("/", verifyAgent, createProcurement);
requestRoutes.get("/", verifyAgent, getProcurement);
requestRoutes.put("/offer-status", verifyAgent, approveRejectOfferByAgent);


module.exports = { requestRoutes }; 
