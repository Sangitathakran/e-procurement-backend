
const express = require("express");
const { requestRoutes } = require("./request/Routes");
const agentRoutes = express.Router();

agentRoutes.use('/request', requestRoutes)

module.exports = { agentRoutes }; 