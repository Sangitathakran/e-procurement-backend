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
const {authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

const nccfDashboardRoutes = express.Router();

nccfDashboardRoutes.get("/",authenticateUser,authorizeRoles(_userType.nccf), Auth, getDashboardStats);
nccfDashboardRoutes.get("/onboarding-requests",authenticateUser,authorizeRoles(_userType.nccf), Auth, getonBoardingRequests);
nccfDashboardRoutes.get("/penalty-status",authenticateUser,authorizeRoles(_userType.nccf),Auth, getpenaltyStatus);
nccfDashboardRoutes.get("/warehouses",authenticateUser,authorizeRoles(_userType.nccf),Auth, getWarehouseList);
nccfDashboardRoutes.get("/companyNames",authenticateUser,authorizeRoles(_userType.nccf), Auth, getCompanyNames);

nccfDashboardRoutes.get("/payment-disteller",authenticateUser,authorizeRoles(_userType.nccf), Auth, getMonthlyPaidAmount);
nccfDashboardRoutes.get("/global-states",authenticateUser,authorizeRoles(_userType.nccf), getPublicStates);
nccfDashboardRoutes.get("/global-district/:id",authenticateUser,authorizeRoles(_userType.nccf), getPublicDistrictByState);
nccfDashboardRoutes.get("/distiller-count-statewise",authenticateUser,authorizeRoles(_userType.nccf), getStatewiseDistillerCount)
nccfDashboardRoutes.get("/state-wise-procurment",authenticateUser,authorizeRoles(_userType.nccf), getProcurmentCountDistiller)
nccfDashboardRoutes.get("/distiller-wise-payment",authenticateUser,authorizeRoles(_userType.nccf), getDistillerWisePayment)



module.exports = { nccfDashboardRoutes };
