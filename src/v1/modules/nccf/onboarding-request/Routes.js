const { getPendingDistillers, getDistillerById, updateApprovalStatus, getPendingMouList, updateMouApprovalStatus } = require("./Controller")
const { validateForm } = require("@src/v1/modules/distiller/auth/Validation")
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt");
const nccfOnboardingRoutes = express.Router();
const {authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

nccfOnboardingRoutes.get("/",authenticateUser,authorizeRoles(_userType.nccf), Auth, getPendingDistillers);
nccfOnboardingRoutes.get("/pending-Mou-list",authenticateUser,authorizeRoles(_userType.nccf), Auth, getPendingMouList);
nccfOnboardingRoutes.get('/:id',authenticateUser,authorizeRoles(_userType.nccf), Auth, getDistillerById);
nccfOnboardingRoutes.patch("/distillers-approve",authenticateUser,authorizeRoles(_userType.nccf), Auth, updateApprovalStatus);
nccfOnboardingRoutes.patch("/mou-approval",authenticateUser,authorizeRoles(_userType.nccf), Auth, updateMouApprovalStatus);

module.exports = { nccfOnboardingRoutes }; 
