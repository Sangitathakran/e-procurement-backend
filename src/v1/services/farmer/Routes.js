const express = require("express");
const { createFarmer } = require("./Controller");
const farmerRoutes = express.Router();

farmerRoutes.post("/", createFarmer);
module.exports = { farmerRoutes}; 