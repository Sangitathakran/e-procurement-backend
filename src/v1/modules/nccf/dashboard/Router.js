const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, getonBoardingRequests } = require("./Controller");
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt")
const nccfDashboardRoutes = express.Router();


nccfDashboardRoutes.get("/", getDashboardStats);
nccfDashboardRoutes.get("/onboarding-requests", getonBoardingRequests);

module.exports = { nccfDashboardRoutes }; 
