const express = require("express");
// const { requestRoutes } = require("./request/Routes");
const { associateMngmntRoutes } = require("./associate-management/Routes");
const { batchManagementRoutes } = require("./batch-management/Routes");

const ekhridRoutes = express.Router();


ekhridRoutes.use("/associate", associateMngmntRoutes);
ekhridRoutes.use("/batch", batchManagementRoutes);

module.exports = { ekhridRoutes } 