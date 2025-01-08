
const express = require("express");
const { nccfAuthRoutes } = require("./auth/Routes");
const { nccfRequestRoutes } = require("./onboarding-request/Routes");

const nccfRoutes = express.Router();

nccfRoutes.use("/auth", nccfAuthRoutes);
nccfRoutes.use("/onboarding-request", nccfRequestRoutes);

module.exports = { nccfRoutes }; 