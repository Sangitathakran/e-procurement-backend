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
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

const slaRoutes = express.Router();

slaRoutes.use('/request',authenticateUser,authorizeRoles(_userType.agent ), requestRoutes);
slaRoutes.use('/scheme',authenticateUser,authorizeRoles(_userType.agent ), schemeRoutes);
slaRoutes.use("/associate",authenticateUser,authorizeRoles(_userType.agent ), associateMngmntRoutes);
slaRoutes.use("/ho",authenticateUser,authorizeRoles(_userType.agent ), hoMngmntRoutes);
slaRoutes.use("/bo",authenticateUser,authorizeRoles(_userType.agent ), boManagementRoutes);
slaRoutes.use("/warehouse",authenticateUser,authorizeRoles(_userType.agent ), warehouseRoutes);
slaRoutes.use("/procurement",authenticateUser,authorizeRoles(_userType.agent ), procurementCenterRoutes);
slaRoutes.use("/track-orders",authenticateUser,authorizeRoles(_userType.agent ), trackDeliveryRoutes);
slaRoutes.use('/payment',authenticateUser,authorizeRoles(_userType.agent ), paymentRoutes);
slaRoutes.use("/dashboard",authenticateUser,authorizeRoles(_userType.agent ), dashboardRoutes);
slaRoutes.use("/proc-track",authenticateUser,authorizeRoles(_userType.agent ), procTrackingRoutes);
slaRoutes.use("/agency",authenticateUser,authorizeRoles(_userType.agent ), agencyMngmntRoutes);
slaRoutes.use("/commodity",authenticateUser,authorizeRoles(_userType.agent ), commodityRoutes);
slaRoutes.use("/sla",authenticateUser,authorizeRoles(_userType.agent ), slaRoute);
slaRoutes.use("/standard",authenticateUser,authorizeRoles(_userType.agent ), standardRoutes);

module.exports = { slaRoutes } 