const express = require('express')
const S3Router = express.Router();
const { uploadToS3, deleteFromS3 } = require("./controller")
const { s3ValSchema } = require("./Validation");

S3Router.post('/upload', s3ValSchema("upload"), uploadToS3)
S3Router.post('/delete', s3ValSchema("delete"), deleteFromS3)

module.exports = { S3Router }