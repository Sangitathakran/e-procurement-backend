const express = require("express");
// const { requestRoutes } = require("./request/Routes");
const { associateMngmntRoutes } = require("./associate-management/Routes");

const ekhridRoutes = express.Router();


ekhridRoutes.use("/associate", associateMngmntRoutes);

module.exports = { ekhridRoutes } 