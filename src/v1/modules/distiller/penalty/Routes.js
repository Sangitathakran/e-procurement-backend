const express = require("express");
const { getPenaltyOrder, batchList } = require("./Controller");
const { verifyDistiller } = require("../utils/verifyDistiller");
const distillerPenaltyRoutes = express.Router();
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

distillerPenaltyRoutes.get("/", authenticateUser,authorizeRoles(_userType.distiller),verifyDistiller, getPenaltyOrder);
distillerPenaltyRoutes.get("/batchList", authenticateUser,authorizeRoles(_userType.distiller),verifyDistiller, batchList);

module.exports = { distillerPenaltyRoutes }; 
