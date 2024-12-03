const express = require("express");
const { getHo, saveHeadOffice, updateStatus,deleteHO ,updateHeadOffice,getHeadOfficeById} = require("./Controllers");
const { validateForm } = require("@src/v1/modules/agent/ho-management/Validation");
const { Auth } = require("@src/v1/middlewares/jwt")

const hoMngmntRoutes = express.Router();

hoMngmntRoutes.patch("/:id/:status", Auth, updateStatus);
hoMngmntRoutes.get("/", Auth, getHo);
hoMngmntRoutes.post("/", Auth, validateForm, saveHeadOffice);
hoMngmntRoutes.delete("/:id", Auth, deleteHO);

hoMngmntRoutes.put("/:id",Auth, updateHeadOffice);

hoMngmntRoutes.get('/:id',Auth, getHeadOfficeById);

module.exports = { hoMngmntRoutes }; 