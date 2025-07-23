const express = require("express");
const { createSLA, getSLAList, deleteSLA, updateSLA, getSLAById, updateSLAStatus, addSchemeToSLA, schemeAssign, getAssignedScheme, getUniqueSchemes, getUniqueStates, } = require("./Controller");
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

const slaRoute = express.Router();

slaRoute.post("/schemeAssign",authenticateUser,authorizeRoles(_userType.bo), Auth, schemeAssign);
slaRoute.get("/getAssignedScheme",authenticateUser,authorizeRoles(_userType.bo), Auth, getAssignedScheme);

slaRoute.post("/",authenticateUser,authorizeRoles(_userType.bo), createSLA);
slaRoute.get("/",authenticateUser,authorizeRoles(_userType.bo), getSLAList);
slaRoute.get("/states",authenticateUser,authorizeRoles(_userType.bo), getUniqueStates);
slaRoute.get("/filterOption", authenticateUser,authorizeRoles(_userType.bo),getUniqueSchemes);
slaRoute.get("/:slaId",authenticateUser,authorizeRoles(_userType.bo), getSLAById);
slaRoute.put("/:slaId",authenticateUser,authorizeRoles(_userType.bo), updateSLA);
slaRoute.patch("/:slaId",authenticateUser,authorizeRoles(_userType.bo), updateSLAStatus);
slaRoute.post("/:slaId/add-scheme",authenticateUser,authorizeRoles(_userType.bo), addSchemeToSLA);
slaRoute.delete("/:slaId",authenticateUser,authorizeRoles(_userType.bo), deleteSLA);


module.exports = { slaRoute };