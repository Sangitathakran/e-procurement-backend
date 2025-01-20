const express = require("express");
const {orderList,getPuchaseList} = require("./Controller");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");
const { Auth } = require("@src/v1/middlewares/jwt")


const wareHouseOutwardRoutes = express.Router();

wareHouseOutwardRoutes.get("/order-list", orderList);
wareHouseOutwardRoutes.get("/purchase-list", getPuchaseList);




module.exports = { wareHouseOutwardRoutes }; 