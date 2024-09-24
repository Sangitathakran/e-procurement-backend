const express = require("express");
const { requestRoutes } = require("./request/Routes");
const { associateMngmntRoutes } = require("./associate-management/Routes");
const { hoMngmntRoutes } = require("./ho-management/Routes");
const { warehouseRoutes } = require("./warehouse/Routes");

const agentRoutes = express.Router();

agentRoutes.use('/request', requestRoutes)
agentRoutes.use("/associate-management", associateMngmntRoutes);
agentRoutes.use("/ho-management", hoMngmntRoutes);
agentRoutes.use("/warehouse", warehouseRoutes);

module.exports = { agentRoutes } 