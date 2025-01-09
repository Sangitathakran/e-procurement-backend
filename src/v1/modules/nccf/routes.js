
const express = require("express");
const { nccfAuthRoutes } = require("./auth/Routes");
const { distillerManagementRoute } = require("./distiller-management/Routes");

const nccfRoutes = express.Router();

nccfRoutes.use("/auth", nccfAuthRoutes);
nccfRoutes.use("/dist-management", distillerManagementRoute);

module.exports = { nccfRoutes }; 