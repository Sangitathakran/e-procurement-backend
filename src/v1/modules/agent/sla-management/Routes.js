const express = require("express");
const { createSLA, getSLAList, deleteSLA, updateSLA, getSLAById, updateSLAStatus, addSchemeToSLA, schemeAssign, getAssignedScheme, getUniqueStates, getUniqueHOBOScheme, updateBankPaymentPermission } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt");

const slaRoute = express.Router();

slaRoute.post("/schemeAssign", Auth, schemeAssign);
slaRoute.get("/getAssignedScheme", Auth, getAssignedScheme);

slaRoute.post("/", Auth, createSLA);
slaRoute.get("/", Auth, getSLAList);
slaRoute.get("/states", Auth, getUniqueStates);
slaRoute.get("/filterOption", Auth, getUniqueHOBOScheme);
slaRoute.put('/bank-permission', Auth, updateBankPaymentPermission);

slaRoute.get("/:slaId", Auth, getSLAById);
slaRoute.put("/:slaId", Auth, updateSLA);
slaRoute.patch("/:slaId", Auth, updateSLAStatus);
slaRoute.post("/:slaId/add-scheme", Auth, addSchemeToSLA);
slaRoute.delete("/:slaId", Auth, deleteSLA);
slaRoute.patch("/:slaId", Auth, updateSLAStatus);

module.exports = { slaRoute };