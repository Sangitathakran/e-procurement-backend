const express = require("express");
const { eKharidHaryanaRoutes } = require("./procurements/Routes");

const eKharidDevelopmentRoutes = express.Router();
eKharidDevelopmentRoutes.use("/procurement", eKharidHaryanaRoutes);

module.exports = { eKharidDevelopmentRoutes };
