const express = require("express")
const headOfficeRoutes = express.Router()

const {hoAuthRoutes} = require("./ho-auth/Routes")
const {hoBranchRoutes} = require("./ho-branch-management/Routes")
const {hoDashboardRoutes} = require("./ho-dashboard/Routes")
const {requireMentRoutes} = require("./requirement/Routes")


headOfficeRoutes.use("/auth", hoAuthRoutes)
headOfficeRoutes.use("/branch", hoBranchRoutes)
headOfficeRoutes.use("/dashboard", hoDashboardRoutes)
headOfficeRoutes.use("/requirement", requireMentRoutes)

module.exports = { headOfficeRoutes } 

