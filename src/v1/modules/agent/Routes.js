const express = require("express");
const { requestRoutes } = require("./request/Routes");
const { associateMngmntRoutes } = require("./associate-management/Routes");
const { hoMngmntRoutes } = require("./ho-management/Routes");

const agentRoutes = express.Router();

agentRoutes.use('/request', requestRoutes)
agentRoutes.use("/associate-management", associateMngmntRoutes);
agentRoutes.use("/ho-management", hoMngmntRoutes);

module.exports = { agentRoutes } 