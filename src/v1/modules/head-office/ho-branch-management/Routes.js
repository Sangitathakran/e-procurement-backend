const express = require("express");
const { importBranches, exportBranches, downloadTemplate, branchList, toggleBranchStatus } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");
const hoBranchRoutes = express.Router();

hoBranchRoutes.post("/import", verifyJwtToken, importBranches);
hoBranchRoutes.get('/export', exportBranches);
hoBranchRoutes.get('/download-temp', downloadTemplate);
hoBranchRoutes.get('/branchList', branchList);
hoBranchRoutes.put('/toggle-status/:branchId', toggleBranchStatus);


module.exports = { hoBranchRoutes }; 