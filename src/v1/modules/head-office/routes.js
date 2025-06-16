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

headOfficeRoutes.use("/auth", hoAuthRoutes)
headOfficeRoutes.use("/branch", Auth, hoBranchRoutes)
headOfficeRoutes.use("/dashboard", Auth, hoDashboardRoutes)
headOfficeRoutes.use("/requirement", Auth, requireMentRoutes)
headOfficeRoutes.use("/farmer", Auth, farmerManagementRoutes)
headOfficeRoutes.use("/warehouse", Auth, warehouseRoutes)
headOfficeRoutes.use("/payment", Auth, paymentRoutes)
headOfficeRoutes.use("/schemeAssigned", Auth, schemeRoutes)


module.exports = { headOfficeRoutes }

