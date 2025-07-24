const express = require("express")
const headOfficeRoutes = express.Router()

const { Auth } = require("@src/v1/middlewares/jwt");

const { hoAuthRoutes } = require("./ho-auth/Routes")
const { hoBranchRoutes } = require("./ho-branch-management/Routes")
const { hoDashboardRoutes } = require("./ho-dashboard/Routes")
const { requireMentRoutes } = require("./requirement/Routes")
const { farmerManagementRoutes } = require("./farmer-management/Route")
const { warehouseRoutes } = require("./warehouse/Route");
const { paymentRoutes } = require("./payment/Routes");
const { schemeRoutes } = require("./scheme/Routes");
const { slaRoute } = require("./ho-sla-management/Routes");
const {authenticateUser,authorizeRoles} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")
const { associateMngmntRoutes } = require("./associate-management/Routes");
const {dropDownRoute} = require("./ho-dropdwon/Routes");
const { mandiWiseProcurementRoute } = require("./mandiWiseProcurement/Routes");

headOfficeRoutes.use("/auth", hoAuthRoutes)
headOfficeRoutes.use("/branch",authenticateUser,authorizeRoles(_userType.ho), Auth, hoBranchRoutes)
headOfficeRoutes.use("/dashboard",authenticateUser,authorizeRoles(_userType.ho),Auth, hoDashboardRoutes)
headOfficeRoutes.use("/requirement",authenticateUser,authorizeRoles(_userType.ho), Auth, requireMentRoutes)
headOfficeRoutes.use("/farmer",authenticateUser,authorizeRoles(_userType.ho), Auth, farmerManagementRoutes)
headOfficeRoutes.use("/warehouse",authenticateUser,authorizeRoles(_userType.ho), Auth, warehouseRoutes)
headOfficeRoutes.use("/payment",authenticateUser,authorizeRoles(_userType.ho), Auth, paymentRoutes)
headOfficeRoutes.use("/schemeAssigned",authenticateUser,authorizeRoles(_userType.ho ,_userType.bo), Auth, schemeRoutes)
headOfficeRoutes.use("/sla",authenticateUser,authorizeRoles(_userType.ho), Auth, slaRoute)
headOfficeRoutes.use("/associate", associateMngmntRoutes);

headOfficeRoutes.use("/dropdown", authenticateUser,authorizeRoles(_userType.ho) ,dropDownRoute )
headOfficeRoutes.use("/mandiWiseProcurement", authenticateUser,authorizeRoles(_userType.ho) ,mandiWiseProcurementRoute )


module.exports = { headOfficeRoutes }
