
const express = require("express");
const { distillerAuthRoutes } = require("./auth/Routes");

const distillerRoutes = express.Router();

distillerRoutes.use("/auth", distillerAuthRoutes);

module.exports = { distillerRoutes }; 