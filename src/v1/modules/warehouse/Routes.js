
const express = require("express");
const { wareHouseAuthRoutes } = require("./auth/Routes");
const { wareHouseInwardRoutes } = require("./inward/Routes");
const { wareHouseManagement } = require("./warehouse-management/Routes");
const {wareHouseOutwardRoutes} =require("./outward/Routes");
const wareHouseRoutes = express.Router();



wareHouseRoutes.use("/auth", wareHouseAuthRoutes);
wareHouseRoutes.use("/management", wareHouseManagement);
wareHouseRoutes.use("/inward", wareHouseInwardRoutes);
wareHouseRoutes.use("/outward" ,wareHouseOutwardRoutes);

module.exports = { wareHouseRoutes }; 