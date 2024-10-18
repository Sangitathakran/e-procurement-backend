const express = require("express");
const { importBranches, exportBranches, downloadTemplate, branchList, toggleBranchStatus } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt");
const hoBranchRoutes = express.Router();

hoBranchRoutes.post("/import/:id", Auth, importBranches);
hoBranchRoutes.get('/export', exportBranches);
hoBranchRoutes.get('/download-temp', downloadTemplate);
hoBranchRoutes.get('/branchList', branchList);
hoBranchRoutes.put('/toggle-status/:branchId', Auth, toggleBranchStatus);


module.exports = { hoBranchRoutes }; 