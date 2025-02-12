const express = require("express");
const { createSLA, getSLAList, deleteSLA, updateSLA, getSLAById, updateSLAStatus } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt");

const slaRoute = express.Router();

slaRoute.post("/", createSLA);
slaRoute.get("/", getSLAList);
slaRoute.get("/:sla_id", getSLAById);
slaRoute.put("/:sla_id", updateSLA);
slaRoute.patch("/:sla_id", updateSLAStatus);
slaRoute.delete("/:sla_id", deleteSLA);

module.exports = { slaRoute };