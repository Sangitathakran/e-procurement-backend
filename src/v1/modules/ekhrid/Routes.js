const express = require("express");
const { requestRoutes } = require("./request/Routes");
const { associateMngmntRoutes } = require("./associate-management/Routes");

const agentRoutes = express.Router();


agentRoutes.use("/associate", associateMngmntRoutes);

module.exports = { agentRoutes } 