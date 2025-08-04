const express = require("express");
const { getOrder, getOrderById, deleteOrder, createBatch, deliveryScheduledBatchList, orderDetails, batchPayNow } = require("./Controller");
const { verifyDistiller } = require("../utils/verifyDistiller");
const distillerOrderRoutes = express.Router();
const {authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

distillerOrderRoutes.get("/deliveryScheduledBatchList",authenticateUser,authorizeRoles(_userType.distiller), verifyDistiller, deliveryScheduledBatchList);
distillerOrderRoutes.get("/orderDetails",authenticateUser,authorizeRoles(_userType.distiller), verifyDistiller, orderDetails);
distillerOrderRoutes.get("/",authenticateUser,authorizeRoles(_userType.distiller), verifyDistiller, getOrder);
distillerOrderRoutes.put("/batchPayNow",authenticateUser,authorizeRoles(_userType.distiller), verifyDistiller, batchPayNow);
distillerOrderRoutes.get("/:id",authenticateUser,authorizeRoles(_userType.distiller), verifyDistiller, getOrderById);
distillerOrderRoutes.delete("/:id",authenticateUser,authorizeRoles(_userType.distiller), verifyDistiller, deleteOrder);
distillerOrderRoutes.post("/batch",authenticateUser,authorizeRoles(_userType.distiller), verifyDistiller, createBatch);
distillerOrderRoutes.put("/batchPayNow", authenticateUser,authorizeRoles(_userType.distiller),verifyDistiller, batchPayNow);



module.exports = { distillerOrderRoutes }; 