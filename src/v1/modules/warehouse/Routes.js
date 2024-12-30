
const express = require("express");
const { wareHouseAuthRoutes } = require("./auth/Routes");
const { wareHouseInwardRoutes } = require("./inward/Routes");
const { wareHouseManagement } = require("./warehouse-management/Routes");
const wareHouseRoutes = express.Router();



wareHouseRoutes.use("/auth", wareHouseAuthRoutes);
wareHouseRoutes.use("/inward", wareHouseInwardRoutes);
wareHouseRoutes.use("/management", wareHouseManagement);

module.exports = { wareHouseRoutes }; 