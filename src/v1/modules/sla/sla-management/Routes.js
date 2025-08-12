const express = require("express");
const { createSLA, getSLAList, deleteSLA, updateSLA, getSLAById, updateSLAStatus, addSchemeToSLA, schemeAssign, getAssignedScheme, getUniqueStates, getUniqueHOBOScheme } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt");

const slaRoute = express.Router();

slaRoute.post("/schemeAssign", Auth, schemeAssign);
slaRoute.get("/getAssignedScheme", Auth, getAssignedScheme);

slaRoute.post("/", Auth, createSLA);
slaRoute.get("/", getSLAList);
slaRoute.get("/states", getUniqueStates);
slaRoute.get("/filterOption", getUniqueHOBOScheme);


slaRoute.get("/:slaId", getSLAById);
slaRoute.put("/:slaId", Auth, updateSLA);
slaRoute.patch("/:slaId", Auth, updateSLAStatus);
slaRoute.post("/:slaId/add-scheme", Auth, addSchemeToSLA);
slaRoute.post("/", Auth, createSLA);
slaRoute.delete("/:slaId", Auth, deleteSLA);


module.exports = { slaRoute };