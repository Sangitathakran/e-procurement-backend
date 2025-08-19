
const express = require("express");
const { distillerAuthRoutes } = require("./auth/Routes");
const { distillerpurchaseOrderRoutes } = require("./purchaseOrder/Routes");
const { distillerOrderRoutes } = require("./order/Routes");
const { distillerWarehouseRoutes } = require("./warehouse/Routes");
const { distillerPenaltyRoutes } = require("./penalty/Routes");
const { dashboardRoutes } = require("./dashboard/Routes");
const {dropDownRoutes} = require("./dropDown/Routes")

const {thirdPartyRoutes} = require("./distiller_third_party_service/routes");
const distillerRoutes = express.Router();

distillerRoutes.use("/auth", distillerAuthRoutes);
distillerRoutes.use("/purchaseOrder", distillerpurchaseOrderRoutes);
distillerRoutes.use("/order", distillerOrderRoutes);
distillerRoutes.use("/warehouse", distillerWarehouseRoutes);
distillerRoutes.use("/penalty", distillerPenaltyRoutes);
distillerRoutes.use("/third-party", thirdPartyRoutes);
distillerRoutes.use("/dashboard", dashboardRoutes);
distillerRoutes.use("/dropDown", dropDownRoutes);


module.exports = { distillerRoutes }; 