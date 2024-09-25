const express = require("express");
const { requestRoutes } = require("./request/Routes");
const { associateMngmntRoutes } = require("./associate-management/Routes");
const { hoMngmntRoutes } = require("./ho-management/Routes");
const { warehouseRoutes } = require("./warehouse/Routes");
const { procurementCenterRoutes } = require("./procurement_management/Routes");

const agentRoutes = express.Router();

agentRoutes.use('/request', requestRoutes);
agentRoutes.use("/associate", associateMngmntRoutes);
agentRoutes.use("/ho", hoMngmntRoutes);
agentRoutes.use("/warehouse", warehouseRoutes);
agentRoutes.use("/procurement", procurementCenterRoutes);

module.exports = { agentRoutes } 