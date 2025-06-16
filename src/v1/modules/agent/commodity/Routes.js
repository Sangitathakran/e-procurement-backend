const express = require("express");
const { getCommodity, getCommodityById, createCommodity, updateCommodity, deleteCommodity, statusUpdateCommodity, standardListByName, getStandard } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt");
const commodityRoutes = express.Router();


commodityRoutes.get("/standardList", Auth, getStandard);
commodityRoutes.get("/", Auth, getCommodity);
commodityRoutes.get("/:id", getCommodityById);
commodityRoutes.post("/", createCommodity);
commodityRoutes.put("/", Auth, updateCommodity);
commodityRoutes.delete("/:id", Auth, deleteCommodity);
commodityRoutes.patch("/", Auth, statusUpdateCommodity);


module.exports = { commodityRoutes }; 