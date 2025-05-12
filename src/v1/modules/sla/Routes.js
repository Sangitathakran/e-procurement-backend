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
const { slaRoute } = require("./sla-management/Routes");
const { standardRoutes } = require("./standard/Routes");
const {dropDownRoute} = require("./dropdown/Routes")

const slaRoutes = express.Router();

slaRoutes.use('/request', requestRoutes);
slaRoutes.use('/scheme', schemeRoutes);
slaRoutes.use("/associate", associateMngmntRoutes);
slaRoutes.use("/ho", hoMngmntRoutes);
slaRoutes.use("/bo", boManagementRoutes);
slaRoutes.use("/warehouse", warehouseRoutes);
slaRoutes.use("/procurement", procurementCenterRoutes);
slaRoutes.use("/track-orders", trackDeliveryRoutes);
slaRoutes.use('/payment', paymentRoutes);
slaRoutes.use("/dashboard", dashboardRoutes);
slaRoutes.use("/proc-track", procTrackingRoutes);
slaRoutes.use("/agency", agencyMngmntRoutes);
slaRoutes.use("/commodity", commodityRoutes);
slaRoutes.use("/sla", slaRoute);
slaRoutes.use("/standard", standardRoutes);
slaRoutes.use("/dropdown", dropDownRoute);

module.exports = { slaRoutes } 