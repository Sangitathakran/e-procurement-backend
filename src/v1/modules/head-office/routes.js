const express = require("express")
const headOfficeRoutes = express.Router()

const { verifyJwtToken } = require("@src/v1/middlewares/jwt");

const {hoAuthRoutes} = require("./ho-auth/Routes")
const {hoBranchRoutes} = require("./ho-branch-management/Routes")
const {hoDashboardRoutes} = require("./ho-dashboard/Routes")
const {requireMentRoutes} = require("./requirement/Routes")
const {farmerManagementRoutes} = require("./farmer-management/Route")
const {warehouseRoutes} = require("./warehouse/Route")

headOfficeRoutes.use("/auth", hoAuthRoutes)
headOfficeRoutes.use("/branch", verifyJwtToken, hoBranchRoutes)
headOfficeRoutes.use("/dashboard", verifyJwtToken, hoDashboardRoutes)
headOfficeRoutes.use("/requirement", verifyJwtToken, requireMentRoutes)
headOfficeRoutes.use("/farmer", verifyJwtToken, farmerManagementRoutes)
headOfficeRoutes.use("/warehouse", verifyJwtToken, warehouseRoutes)

module.exports = { headOfficeRoutes } 

