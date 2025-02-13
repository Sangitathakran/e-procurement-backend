const express = require("express");
const { requestRoutes } = require("./request/Routes");
const { associateMngmntRoutes } = require("./associate-management/Routes");
const { hoMngmntRoutes } = require("./ho-management/Routes");
const { agencyMngmntRoutes } = require("./auth/Routes");
const { warehouseRoutes } = require("./warehouse/Routes");
const { procurementCenterRoutes } = require("./procurement_management/Routes");
const { dashboardRoutes } = require("./dashboard/Routes");
const { boManagementRoutes } = require("./bo-management/Routes");
const { trackDeliveryRoutes } = require("./track_order/Routes");
const { paymentRoutes } = require("./payment/Routes");
const { procTrackingRoutes } = require("./procurement-tracking/Routes");
const { schemeRoutes } = require("./scheme/Routes");
const { commodityRoutes } = require("./commodity/Routes");
const { standardRoutes } = require("./standard/Routes");

const agentRoutes = express.Router();

agentRoutes.use('/request', requestRoutes);
agentRoutes.use('/scheme', schemeRoutes);
agentRoutes.use("/associate", associateMngmntRoutes);
agentRoutes.use("/ho", hoMngmntRoutes);
agentRoutes.use("/bo", boManagementRoutes);
agentRoutes.use("/warehouse", warehouseRoutes);
agentRoutes.use("/procurement", procurementCenterRoutes);
agentRoutes.use("/track-orders", trackDeliveryRoutes);
agentRoutes.use('/payment', paymentRoutes);
agentRoutes.use("/dashboard", dashboardRoutes);
agentRoutes.use("/proc-track", procTrackingRoutes);
agentRoutes.use("/agency", agencyMngmntRoutes);
agentRoutes.use("/commodity", commodityRoutes);
agentRoutes.use("/standard", standardRoutes);

module.exports = { agentRoutes } 