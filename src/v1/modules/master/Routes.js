

const express = require("express");
const masterRoutes = express.Router();
const { body } = require("express-validator");
const { getVariety, getVarietyById, createVariety, updateVariety, getUnit, getUnitById, createUnit, updateUnit, deleteUnit, deleteVariety, getGrade, getGradeById, createGrade, updateGrade, deleteGrade, getOrganizations, updateOrganization, createOrganization } = require("./Controller");
const { _middleware } = require("@src/v1/utils/constants/messages");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { _status } = require("@src/v1/utils/constants/index");
const {authenticateUser,authorizeRoles} = require("@middlewares/jwt");

masterRoutes.get("/variety", getVariety);
masterRoutes.get("/variety/:id", getVarietyById);
masterRoutes.post("/variety", body("name", _middleware.require("name")).notEmpty().trim(), validateErrors, createVariety);
masterRoutes.put("/variety", [
    body("id", _middleware.require("id")).notEmpty().trim(),
    body("status")
        .optional()
        .isIn(Object.values(_status))
        .withMessage(`Status must be one of the following: ${Object.values(_status).join(', ')}`)],
    validateErrors, updateVariety);
masterRoutes.delete("/variety/:id", deleteVariety);


masterRoutes.get("/unit", getUnit);
masterRoutes.get("/unit/:id", getUnitById);
masterRoutes.post("/unit", body("name", _middleware.require("name")).notEmpty().trim(), validateErrors, createUnit);
masterRoutes.put("/unit", [
    body("id", _middleware.require("id")).notEmpty().trim(),
    body("status")
        .optional()
        .isIn(Object.values(_status))
        .withMessage(`Status must be one of the following: ${Object.values(_status).join(', ')}`)]
    , validateErrors, updateUnit);
masterRoutes.delete("/unit/:id", deleteUnit);

masterRoutes.get("/grade", getGrade);
masterRoutes.get("/grade/:id", getGradeById);
masterRoutes.post("/grade", body("name", _middleware.require("name")).notEmpty().trim(), validateErrors, createGrade);
masterRoutes.put("/grade", [
    body("id", _middleware.require("id")).notEmpty().trim(),
    body("status")
        .optional()
        .isIn(Object.values(_status))
        .withMessage(`Status must be one of the following: ${Object.values(_status).join(', ')}`)
], validateErrors, updateGrade);
masterRoutes.delete("/grade/:id", deleteGrade);


masterRoutes.get("/organization", getOrganizations);
masterRoutes.post("/organization", body("name", _middleware.require("name")).notEmpty().trim(), validateErrors, createOrganization);
masterRoutes.put("/organization", [
    body("id", _middleware.require("id")).notEmpty().trim(),
    body("status")
        .optional()
        .isIn(Object.values(_status))
        .withMessage(`Status must be one of the following: ${Object.values(_status).join(', ')}`)
], validateErrors, updateOrganization);


module.exports = { masterRoutes }; 