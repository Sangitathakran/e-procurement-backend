const express = require("express");
const { getHo, saveHeadOffice, updateStatus } = require("./Controllers");
const { validateForm } = require("@src/v1/modules/agent/ho-management/Validation");
const { verifyJwtToken } = require("@src/v1/middlewares/jwt")

const hoMngmntRoutes = express.Router();

hoMngmntRoutes.patch("/:id/:status", verifyJwtToken, updateStatus);
hoMngmntRoutes.get("/", verifyJwtToken, getHo);
hoMngmntRoutes.post("/", validateForm, saveHeadOffice);


module.exports = { hoMngmntRoutes }; 