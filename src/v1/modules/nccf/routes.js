
const express = require("express");
const { nccfAuthRoutes } = require("./auth/Routes");



const nccfRoutes = express.Router();

nccfRoutes.use("/auth", nccfAuthRoutes);


module.exports = { nccfRoutes }; 