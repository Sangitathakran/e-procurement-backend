const express = require("express");
const warehouseRoutes = express.Router();

const {warehousedata, warehouseList} = require('./Controller')

warehouseRoutes.post("/warehouseDetails", warehousedata);
warehouseRoutes.get('/warehouse-list', warehouseList)

module.exports = {warehouseRoutes};

