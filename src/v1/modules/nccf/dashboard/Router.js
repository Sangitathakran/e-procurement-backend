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
  getState,
  getCommodity,
  getScheme
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
nccfDashboardRoutes.get("/state", getState)
nccfDashboardRoutes.get("/commodity", getCommodity)
nccfDashboardRoutes.get("/season", getScheme)

module.exports = { nccfDashboardRoutes };
