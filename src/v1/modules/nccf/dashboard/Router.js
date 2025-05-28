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
  getStatewiseDistillerCount,
  getProcurmentCountDistiller,
  getDistillerWisePayment
} = require("./Controller");
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt");

const nccfDashboardRoutes = express.Router();

nccfDashboardRoutes.get("/", Auth, getDashboardStats);
nccfDashboardRoutes.get("/onboarding-requests", Auth, getonBoardingRequests);
nccfDashboardRoutes.get("/penalty-status",Auth, getpenaltyStatus);
nccfDashboardRoutes.get("/warehouses",Auth, getWarehouseList);
nccfDashboardRoutes.get("/companyNames", Auth, getCompanyNames);

nccfDashboardRoutes.get("/payment-disteller", Auth, getMonthlyPaidAmount);
nccfDashboardRoutes.get("/global-states", getPublicStates);
nccfDashboardRoutes.get("/global-district/:id", getPublicDistrictByState);
nccfDashboardRoutes.get("/distiller-count-statewise", getStatewiseDistillerCount)
nccfDashboardRoutes.get("/state-wise-procurment", getProcurmentCountDistiller)
nccfDashboardRoutes.get("/distiller-wise-payment", getDistillerWisePayment)



module.exports = { nccfDashboardRoutes };
