const express = require("express");
const { payment, associateOrders, getBatchesByWarehouse, batchApproveOrReject, lot_list } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt")

const paymentRoutes = express.Router();

paymentRoutes.get("/associate-orders", Auth, associateOrders);
paymentRoutes.get("/batch-list", Auth, getBatchesByWarehouse);
paymentRoutes.put("/batch-approval", Auth, batchApproveOrReject);
paymentRoutes.get("/lot-list", Auth, lot_list);


module.exports = { paymentRoutes }; 