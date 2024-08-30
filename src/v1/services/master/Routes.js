
const express = require("express");
const masterRoutes = express.Router();
const { body } = require("express-validator");
const { createVariety, getVariety, getVarietyById, updateVariety, deleteVariety, getUnit, getUnitById, createUnit, updateUnit, deleteUnit, getGrade, getGradeById, createGrade, updateGrade, deleteGrade } = require("./Controller");
const { _middleware } = require("@src/v1/utils/constants/messages");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");

masterRoutes.get("/variety", getVariety);
masterRoutes.get("/variety/:id", getVarietyById);
masterRoutes.post("/variety", body("name", _middleware.require("name")).notEmpty().trim(), validateErrors, createVariety);
masterRoutes.put("/variety", body("id", _middleware.require("id")).notEmpty().trim(), validateErrors, updateVariety);
masterRoutes.delete("/variety/:id", deleteVariety);

masterRoutes.get("/unit", getUnit);
masterRoutes.get("/unit/:id", getUnitById);
masterRoutes.post("/unit", body("name", _middleware.require("name")).notEmpty().trim(), validateErrors, createUnit);
masterRoutes.put("/unit", body("id", _middleware.require("id")).notEmpty().trim(), validateErrors, updateUnit);
masterRoutes.delete("/unit/:id", deleteUnit);

masterRoutes.get("/grade", getGrade);
masterRoutes.get("/grade/:id", getGradeById);
masterRoutes.post("/grade", body("name", _middleware.require("name")).notEmpty().trim(), validateErrors, createGrade);
masterRoutes.put("/grade", body("id", _middleware.require("id")).notEmpty().trim(), validateErrors, updateGrade);
masterRoutes.delete("/grade/:id", deleteGrade);

module.exports = { masterRoutes };
