const express = require("express");
const { createStandard, getStandard, getStandardById, updateStandard, deleteStandard, statusUpdateStandard } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt");

const standardRoute = express.Router();

standardRoute.post("/", Auth, createStandard);
standardRoute.get("/", Auth, getStandard);
standardRoute.get("/:id", Auth, getStandardById);
standardRoute.put("/", Auth, updateStandard);
standardRoute.delete("/:id", Auth, deleteStandard);
standardRoute.patch("/", Auth, statusUpdateStandard);

module.exports = { standardRoute };