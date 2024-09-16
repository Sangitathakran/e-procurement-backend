const express = require("express");
const { importBranches, exportBranches } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");
const hoBranchRoutes = express.Router();

hoBranchRoutes.post("/import", verifyJwtToken, importBranches);
hoBranchRoutes.get('/export', exportBranches);


module.exports = { hoBranchRoutes }; 