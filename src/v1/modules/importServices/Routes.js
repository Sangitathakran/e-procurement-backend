const express = require("express");
const bulkImport = express.Router();
const { bulkUploadDistiller ,bulkUploadBatch} = require("@modules/importServices/controller");
const { Auth } = require("@src/v1/middlewares/jwt")

bulkImport.post("/uploadDistiller", bulkUploadDistiller);

bulkImport.post("/uploadBatch", Auth,bulkUploadBatch);

module.exports = { bulkImport }; 