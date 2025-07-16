const express = require("express");
const bulkImport = express.Router();
const { bulkUploadDistiller } = require("@modules/importServices/controller");
bulkImport.post("/uploadDistiller", bulkUploadDistiller);
module.exports = { bulkImport }; 