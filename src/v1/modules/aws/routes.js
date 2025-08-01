const express = require('express')
const S3Router = express.Router();
const { uploadToS3, deleteFromS3 } = require("./controller")
const { s3ValSchema } = require("./Validation");
const {sendResponse} = require('@src/v1/utils/helpers/api_response');
const multer = require('multer');

S3Router.post('/upload', s3ValSchema("upload"), uploadToS3)
S3Router.post('/delete', s3ValSchema("delete"), deleteFromS3)

S3Router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return sendResponse({
      res,
      status: 400,
      errors: [{ message: err.message }]
    });
  } else if (err) {
    return sendResponse({
      res,
      status: 400,
      errors: [{ message: err.message }]
    });
  }
  next();
});


module.exports = { S3Router }