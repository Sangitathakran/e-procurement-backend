const express = require("express");
const { createPurchaseOrder, getPurchaseOrder, getPurchaseOrderById, updatePurchaseOrder, deletePurchaseOrder, branchList } = require("./Controller");
const { verifyDistiller } = require("../utils/verifyDistiller");
const distillerpurchaseOrderRoutes = express.Router();

distillerpurchaseOrderRoutes.get("/branch-list", branchList);
distillerpurchaseOrderRoutes.post("/", verifyDistiller, createPurchaseOrder);
distillerpurchaseOrderRoutes.get("/", verifyDistiller, getPurchaseOrder);
distillerpurchaseOrderRoutes.get("/:id", verifyDistiller, getPurchaseOrderById);
distillerpurchaseOrderRoutes.put("/", verifyDistiller, updatePurchaseOrder);
distillerpurchaseOrderRoutes.delete("/:id", verifyDistiller, deletePurchaseOrder);

module.exports = { distillerpurchaseOrderRoutes }; 