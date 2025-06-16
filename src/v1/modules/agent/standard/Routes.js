const express = require("express");
const { standardListByName, createStandard, getStandard, getStandardById, updateStandard, deleteStandard, statusUpdateStandard } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt");

const standardRoutes = express.Router();

standardRoutes.get("/standardListByName", Auth, standardListByName);
standardRoutes.post("/", Auth, createStandard);
standardRoutes.get("/", Auth, getStandard);
standardRoutes.get("/:id", Auth, getStandardById);
standardRoutes.put("/", Auth, updateStandard);
standardRoutes.delete("/:id", Auth, deleteStandard);
standardRoutes.patch("/", Auth, statusUpdateStandard);


module.exports = { standardRoutes };