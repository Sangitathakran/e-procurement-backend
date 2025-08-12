const express = require("express");
const { getDistiller, bulkuplodDistiller, getDistillerById } = require("./Controllers");
const { validateForm } = require("@src/v1/modules/nccf/auth/Validation");
const { Auth } = require("@src/v1/middlewares/jwt");
const {authenticateUser,authorizeRoles} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

const distillerManagementRoute = express.Router();

distillerManagementRoute.get("/",authenticateUser,authorizeRoles(_userType.nccf), Auth,  getDistiller);
distillerManagementRoute.get('/:id',authenticateUser,authorizeRoles(_userType.nccf), Auth, getDistillerById);
distillerManagementRoute.post("/dist-bulkuplod",authenticateUser,authorizeRoles(_userType.nccf), Auth, bulkuplodDistiller);

module.exports = { distillerManagementRoute }; 