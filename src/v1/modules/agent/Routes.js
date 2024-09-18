const express = require("express");
const { associateMngmntRoutes } = require("./associate-management/Routes");

const agentRoutes = express.Router();

agentRoutes.use("/associate-management", associateMngmntRoutes);

module.exports = { agentRoutes } 