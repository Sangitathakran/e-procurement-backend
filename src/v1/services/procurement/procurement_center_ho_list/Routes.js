const { _middleware } = require("@src/v1/utils/constants/messages");
const { body } = require("express-validator");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { getCollectionCenter, createCollectionCenter } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");
const express = require("express");
const centerRoutes = express.Router();

centerRoutes.get("/", verifyJwtToken, getCollectionCenter);