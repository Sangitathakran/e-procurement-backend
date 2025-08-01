const express = require("express");
const { getPenaltyOrder, batchList, waiveOff, updatePenaltyAmount } = require("./Controller");
const nccfPenaltyRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt");
const {authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

nccfPenaltyRoutes.get("/",authenticateUser,authorizeRoles(_userType.nccf), Auth, getPenaltyOrder);
nccfPenaltyRoutes.get("/batchList",authenticateUser,authorizeRoles(_userType.nccf), Auth, batchList);
nccfPenaltyRoutes.put("/waiveOff",authenticateUser,authorizeRoles(_userType.nccf), Auth, waiveOff);
nccfPenaltyRoutes.put("/penalty-amount/:batchId",authenticateUser,authorizeRoles(_userType.nccf), Auth, updatePenaltyAmount);

module.exports = { nccfPenaltyRoutes };
