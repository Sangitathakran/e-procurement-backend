const express = require("express")
const headOfficeRoutes = express.Router()

const ho_auth_routes = require("./ho-auth/Routes")
const ho_branch_routes = require("./ho-branch-management/Routes")
const ho_dashboard_routes = require("./ho-dashboard/Routes")
const requirement_routes = require("./requirement/Routes")


headOfficeRoutes.use("/auth", ho_auth_routes)
headOfficeRoutes.use("/branch", ho_branch_routes)
headOfficeRoutes.use("/dashboard", ho_dashboard_routes)
headOfficeRoutes.use("/requirement", requirement_routes)

module.exports = headOfficeRoutes 

