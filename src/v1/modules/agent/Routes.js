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
const { mandiWiseProcurementRoute } = require("./mandiWiseProcurement/Routes");

const agentRoutes = express.Router();

agentRoutes.use('/request',authenticateUser,authorizeRoles(_userType.agent ,_userType.admin), requestRoutes);
agentRoutes.use('/scheme', schemeRoutes);
agentRoutes.use("/associate",authenticateUser,authorizeRoles(_userType.agent ,_userType.admin), associateMngmntRoutes);
agentRoutes.use("/ho",authenticateUser,authorizeRoles(_userType.agent ,_userType.admin), hoMngmntRoutes);
agentRoutes.use("/bo",authenticateUser,authorizeRoles(_userType.agent ,_userType.admin), boManagementRoutes);
agentRoutes.use("/warehouse",authenticateUser,authorizeRoles(_userType.agent ,_userType.admin), warehouseRoutes);
agentRoutes.use("/procurement", authenticateUser,authorizeRoles(_userType.agent ,_userType.admin),procurementCenterRoutes);
agentRoutes.use("/track-orders",authenticateUser,authorizeRoles(_userType.agent ,_userType.admin), trackDeliveryRoutes);
agentRoutes.use('/payment',authenticateUser,authorizeRoles(_userType.agent ,_userType.admin,_userType.associate), paymentRoutes);
agentRoutes.use("/dashboard",authenticateUser,authorizeRoles(_userType.agent ,_userType.admin), dashboardRoutes);
agentRoutes.use("/proc-track",authenticateUser,authorizeRoles(_userType.agent ,_userType.admin), procTrackingRoutes);
agentRoutes.use("/agency",authenticateUser,authorizeRoles(_userType.agent ,_userType.admin), agencyMngmntRoutes);
agentRoutes.use("/commodity",authenticateUser,authorizeRoles(_userType.agent ,_userType.admin), commodityRoutes);
agentRoutes.use("/sla",authenticateUser,authorizeRoles(_userType.agent ,_userType.admin), slaRoute);
agentRoutes.use("/standard",authenticateUser,authorizeRoles(_userType.agent ,_userType.admin,_userType.associate), standardRoutes);
agentRoutes.use("/mandiWiseProcurement",authenticateUser,authorizeRoles(_userType.agent ,_userType.admin), mandiWiseProcurementRoute )


module.exports = { agentRoutes } 