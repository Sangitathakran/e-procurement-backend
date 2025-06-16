const express = require("express");
const { importBranches, exportBranches, downloadTemplate, branchList, toggleBranchStatus, schemeList, schemeAssign } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt");
const hoBranchRoutes = express.Router();

hoBranchRoutes.post("/import", Auth, importBranches);
hoBranchRoutes.get('/export', exportBranches);
hoBranchRoutes.get('/download-temp', downloadTemplate);
hoBranchRoutes.get('/branchList', Auth, branchList);
hoBranchRoutes.put('/toggle-status/:branchId', Auth, toggleBranchStatus);
hoBranchRoutes.get("/schemeList", Auth, schemeList);
hoBranchRoutes.post("/schemeAssign", Auth, schemeAssign);
module.exports = { hoBranchRoutes }; 