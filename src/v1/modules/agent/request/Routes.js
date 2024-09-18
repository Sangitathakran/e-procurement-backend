const express = require("express");
const { verifyAgent } = require("../utils/verifyAssociate");
const { createProcurement } = require("./Controller");
const requestRoutes = express.Router();


requestRoutes.post("/", verifyAgent, createProcurement);


module.exports = { requestRoutes }; 
