const express = require("express");
const { createSLA, getSLAList, deleteSLA, updateSLA, getSLAById, updateSLAStatus, addSchemeToSLA, schemeAssign, getAssignedScheme, getUniqueHOBOScheme, getUniqueStates, } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt");

const slaRoute = express.Router();

slaRoute.post("/schemeAssign", schemeAssign);
slaRoute.get("/getAssignedScheme", getAssignedScheme);
slaRoute.get("/states", getUniqueStates);
slaRoute.get("/filterOption", getUniqueHOBOScheme);
slaRoute.post("/", createSLA);
slaRoute.get("/", getSLAList);

slaRoute.get("/:slaId", getSLAById);
slaRoute.put("/:slaId", updateSLA);
slaRoute.patch("/:slaId", updateSLAStatus);
slaRoute.post("/:slaId/add-scheme", addSchemeToSLA);
slaRoute.delete("/:slaId", deleteSLA);

module.exports = { slaRoute };
