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
const { associateMngmntRoutes } = require("./associate-management/Routes");
const {dropDownRoute} = require("./ho-dropdwon/Routes")

headOfficeRoutes.use("/auth", hoAuthRoutes)
headOfficeRoutes.use("/associate", associateMngmntRoutes);
headOfficeRoutes.use("/branch", Auth, hoBranchRoutes)
headOfficeRoutes.use("/dashboard", Auth, hoDashboardRoutes)
headOfficeRoutes.use("/requirement", Auth, requireMentRoutes)
headOfficeRoutes.use("/farmer", Auth, farmerManagementRoutes)
headOfficeRoutes.use("/warehouse", Auth, warehouseRoutes)
headOfficeRoutes.use("/payment", Auth, paymentRoutes)
headOfficeRoutes.use("/schemeAssigned", Auth, schemeRoutes)
headOfficeRoutes.use("/sla", Auth, slaRoute)
headOfficeRoutes.use("/dropdown", Auth ,dropDownRoute )


module.exports = { headOfficeRoutes }
