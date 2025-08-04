const express = require("express");
const { createPurchaseOrder, getPurchaseOrder, getPurchaseOrderById, updatePurchaseOrder, deletePurchaseOrder, branchList, amountCalculation} = require("./Controller");
const { verifyDistiller } = require("../utils/verifyDistiller");
const distillerpurchaseOrderRoutes = express.Router();
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

distillerpurchaseOrderRoutes.get("/branch-list",authenticateUser,authorizeRoles(_userType.distiller), branchList);
distillerpurchaseOrderRoutes.post("/amountCalculation",authenticateUser,authorizeRoles(_userType.distiller), verifyDistiller, amountCalculation);
distillerpurchaseOrderRoutes.post("/",authenticateUser,authorizeRoles(_userType.distiller), verifyDistiller, createPurchaseOrder);
distillerpurchaseOrderRoutes.get("/",authenticateUser,authorizeRoles(_userType.distiller), verifyDistiller, getPurchaseOrder);
distillerpurchaseOrderRoutes.get("/:id",authenticateUser,authorizeRoles(_userType.distiller), verifyDistiller, getPurchaseOrderById);
distillerpurchaseOrderRoutes.put("/",authenticateUser,authorizeRoles(_userType.distiller), verifyDistiller, updatePurchaseOrder);
distillerpurchaseOrderRoutes.delete("/:id",authenticateUser,authorizeRoles(_userType.distiller), verifyDistiller, deletePurchaseOrder);

module.exports = { distillerpurchaseOrderRoutes }; 