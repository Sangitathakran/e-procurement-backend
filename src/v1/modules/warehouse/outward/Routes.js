const express = require("express");
const {orderList,getPuchaseList,getPurchaseOrderById} = require("./Controller");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");
const { Auth } = require("@src/v1/middlewares/jwt")


const wareHouseOutwardRoutes = express.Router();

wareHouseOutwardRoutes.get("/order-list",verifyWarehouseOwner, orderList);
wareHouseOutwardRoutes.get("/purchase-list",verifyWarehouseOwner, getPuchaseList);
wareHouseOutwardRoutes.get("/purchase-order/:id", verifyWarehouseOwner, getPurchaseOrderById);




module.exports = { wareHouseOutwardRoutes }; 