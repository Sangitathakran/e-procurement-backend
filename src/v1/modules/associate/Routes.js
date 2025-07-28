
const express = require("express");
const { requestRoutes } = require("./request/Routes");
const { procurementCenterRoutes } = require("./procurement_center/Routes");
const { orderRoutes } = require("./order/Routes");
const { paymentRoutes } = require("./payment/Routes");
const { userAuthRoutes } = require("./auth/Routes");
const { whrRoutes } = require("./whr/Routes");
const associateRoutes = express.Router();
const { Auth ,authenticateUser,authorizeRoles} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

associateRoutes.use("/request",authenticateUser,authorizeRoles(_userType.associate), requestRoutes);
associateRoutes.use("/center",authenticateUser,authorizeRoles(_userType.associate , _userType.ho), procurementCenterRoutes);
associateRoutes.use("/order",authenticateUser,authorizeRoles(_userType.associate), orderRoutes);
associateRoutes.use("/payment",authenticateUser,authorizeRoles(_userType.associate), paymentRoutes);
associateRoutes.use("/whr",authenticateUser,authorizeRoles(_userType.associate), whrRoutes);
associateRoutes.use("/auth", userAuthRoutes);


module.exports = { associateRoutes }; 