const express = require("express");
const { eKharidHaryanaRoutes } = require("./procurements/Routes");

const eKharidRoutes = express.Router();
eKharidRoutes.use("/procurement", eKharidHaryanaRoutes);

module.exports = { eKharidRoutes };
