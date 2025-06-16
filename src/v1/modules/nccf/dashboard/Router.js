const { _middleware } = require("@src/v1/utils/constants/messages");
const {
  getDashboardStats,
  getonBoardingRequests,
  getpenaltyStatus,
  getWarehouseList,
  getMonthlyPaidAmount,
  getPublicStates,
  getPublicDistrictByState,
  getCompanyNames,
} = require("./Controller");
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt");

const nccfDashboardRoutes = express.Router();

nccfDashboardRoutes.get("/", Auth, getDashboardStats);
nccfDashboardRoutes.get("/onboarding-requests", Auth, getonBoardingRequests);
nccfDashboardRoutes.get("/penalty-status", Auth, getpenaltyStatus);
nccfDashboardRoutes.get("/warehouses", Auth, getWarehouseList);
nccfDashboardRoutes.get("/companyNames", Auth, getCompanyNames);

nccfDashboardRoutes.get("/payment-disteller", Auth, getMonthlyPaidAmount);
nccfDashboardRoutes.get("/global-states", getPublicStates);
nccfDashboardRoutes.get("/global-district/:id", getPublicDistrictByState);

module.exports = { nccfDashboardRoutes };
