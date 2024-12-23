
const express = require("express");
const { wareHouseAuthRoutes } = require("./auth/Routes");
const wareHouseRoutes = express.Router();



wareHouseRoutes.use("/auth", wareHouseAuthRoutes);

module.exports = { wareHouseRoutes }; 