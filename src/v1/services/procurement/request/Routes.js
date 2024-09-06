const { _middleware } = require("@src/v1/utils/constants/messages");
const { body } = require("express-validator");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { getProcurement, getProcurementById, createProcurement, updateProcurement, getFarmerListById, fpoOffered, requestApprove, offeredFarmerList, editFarmerOffer, associateOrder } = require("./Controller");
const { _sellerOfferStatus } = require("@src/v1/utils/constants");
const { _status } = require("@src/v1/utils/constants/index");
const express = require("express");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");
const requestRoutes = express.Router();

requestRoutes.get("/offered-farmer", verifyJwtToken, offeredFarmerList);
requestRoutes.post("/associate-order", verifyJwtToken, associateOrder);
requestRoutes.put("/offered-farmer", verifyJwtToken, editFarmerOffer);
requestRoutes.get("/farmers", verifyJwtToken, getFarmerListById);
requestRoutes.patch("/request", verifyJwtToken, requestApprove);
requestRoutes.post("/fpo-offered", verifyJwtToken, fpoOffered);
requestRoutes.get("/", verifyJwtToken, getProcurement);
requestRoutes.get("/:id", verifyJwtToken, getProcurementById);
requestRoutes.post("/", /*[
    body("quoteExpiry", _middleware.require("quoteExpiry")).notEmpty().trim(),
    body("product", _middleware.require("product")).notEmpty().trim(),
    body("address", _middleware.require("address")).notEmpty().trim()
],
    validateErrors, */  verifyJwtToken, createProcurement);

requestRoutes.put("/", /*[
    body("id", _middleware.require("id")).notEmpty().trim(),
    body("status")
        .optional()
        .isIn(Object.values(_status))
        .withMessage(`Status must be one of the following: ${Object.values(_status).join(', ')}`)],
    validateErrors,  */ verifyJwtToken, updateProcurement);


module.exports = { requestRoutes }; 
