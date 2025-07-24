const express = require("express");
const { createScheme, getScheme, getSchemeById, updateScheme, deleteScheme, statusUpdateScheme, schemeSummary, getBoByScheme, getslaByBo, schemeDropdown } = require("./Controller");
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")
const schemeRoutes = express.Router();

schemeRoutes.get("/schemeDropdown",authenticateUser,authorizeRoles(_userType.agent,_userType.admin), Auth, schemeDropdown);

schemeRoutes.get("/schemeSummary",authenticateUser,authorizeRoles(_userType.agent,_userType.admin), Auth, schemeSummary);
schemeRoutes.get("/getBoByScheme",authenticateUser,authorizeRoles(_userType.agent,_userType.admin), Auth, getBoByScheme);
schemeRoutes.get("/getslaByBo",authenticateUser,authorizeRoles(_userType.agent,_userType.admin), Auth, getslaByBo);

schemeRoutes.post("/",authenticateUser,authorizeRoles(_userType.agent,_userType.admin), Auth, createScheme);
schemeRoutes.get("/",authenticateUser,authorizeRoles(_userType.agent,_userType.admin), Auth, getScheme);
schemeRoutes.get("/:id",authenticateUser,authorizeRoles(_userType.agent,_userType.admin), Auth, getSchemeById);
schemeRoutes.put("/",authenticateUser,authorizeRoles(_userType.agent,_userType.admin), Auth, updateScheme);
schemeRoutes.delete("/:id",authenticateUser,authorizeRoles(_userType.agent,_userType.admin), Auth, deleteScheme);
schemeRoutes.patch("/",authenticateUser,authorizeRoles(_userType.agent,_userType.admin), Auth, statusUpdateScheme);



module.exports = { schemeRoutes };