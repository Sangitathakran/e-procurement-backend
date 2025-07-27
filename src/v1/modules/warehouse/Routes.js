
const express = require("express");
const { wareHouseAuthRoutes } = require("./auth/Routes");
const { wareHouseInwardRoutes } = require("./inward/Routes");
const { wareHouseManagement } = require("./warehouse-management/Routes");
const {wareHouseOutwardRoutes} =require("./outward/Routes");
const {thirdPartyRoutes} =require("./third-party/Routes");
const { whrRoutes } = require("./whr/Routes");

const wareHouseRoutes = express.Router();

const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

wareHouseRoutes.use("/auth", wareHouseAuthRoutes);
wareHouseRoutes.use("/management", wareHouseManagement);
wareHouseRoutes.use("/inward", wareHouseInwardRoutes);
wareHouseRoutes.use("/outward" ,authenticateUser,authorizeRoles(_userType.warehouse),wareHouseOutwardRoutes);
wareHouseRoutes.use("/third" ,thirdPartyRoutes);
wareHouseRoutes.use("/whr", whrRoutes);


module.exports = { wareHouseRoutes }; 