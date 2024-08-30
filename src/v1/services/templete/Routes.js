const express = require("express")
const templateRoutes = express.Router()
const { getExcelTemplate } = require("./Controller");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { query } = require("express-validator");
const { _middleware } = require("@src/v1/utils/constants/messages");

templateRoutes.get('/', [
    query('template_name', _middleware.require("template_name")).notEmpty().trim(),
], validateErrors, getExcelTemplate)

module.exports = { templateRoutes }