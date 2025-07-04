const AWS = require("aws-sdk");
const { v4: uuidv4 } = require('uuid');
const config = require("@config/index");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
require("aws-sdk/lib/maintenance_mode_message").suppress = true;
 
// Initializing S3 bucket
AWS.config.update({
    accessKeyId: config.s3Config.accessKey,
    secretAccessKey: config.s3Config.secretKey,
    region: config.s3Config.region,
    signatureVersion: 'v4'
});

const S3 = new AWS.S3();

const uploadToS3 = async (req, res) => {
  try {
    // #swagger.tags = ['aws']
    let { folder_name } = req.body;
    let { files } = req;

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/jpg',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

    if (!files || files.length === 0) {
      return sendResponse({
        res,
        status: 400,
        errors: [{ message: `Attachment file is required` }]
      });
    }

    let paths = [];

    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return sendResponse({
          res,
          status: 400,
          errors: [{ message: `${file.originalname} exceeds the 3MB size limit` }]
        });
      }

      // Validate file type
      if (!allowedTypes.includes(file.mimetype)) {
        return sendResponse({
          res,
          status: 400,
          errors: [{ message: `${file.originalname} has an unsupported file type` }]
        });
      }

      let filename = uuidv4() + `_${file.originalname}`;
      const key = folder_name ? `${folder_name}/${filename}` : filename;

      const uploadParams = {
        Bucket: config.s3Config.bucketName,
        Key: key,
        Body: file.buffer || file,
      };

      let s3Resp = await S3.upload(uploadParams).promise();
      paths.push(`/${s3Resp.Key}`);
    }

    return sendResponse({
      res,
      status: 201,
      data: { count: paths.length, rows: paths },
      message: _response_message.uploaded()
    });

  } catch (err) {
    console.error("Error while upload_to_s3, reason >>", err.message);
    return sendResponse({
      res,
      status: 500,
      message: _response_message.error("upload to S3"),
      errors: { message: `Error while upload to S3` }
    });
  }
};


// const uploadToS3 = async (req, res) => {
//     try {
//         // #swagger.tags = ['aws']
//         let { folder_name } = req.body
//         let { files } = req

//         if (files.length == 0) {
//             return sendResponse({res, status: 400, errors: [{ message: `Attachment file is required` }] });
//         }
//         let paths = []
//         for (const file of files) {
//             let filename = uuidv4() + `_${file.originalname}`
//             const key = folder_name ? (folder_name + "/" + filename) : filename;
//             const uploadParams = {
//                 Bucket: config.s3Config.bucketName,
//                 Key: key,
//                 Body: file.buffer || file,
//             };
//             let s3Resp = await S3.upload(uploadParams).promise();

//             paths.push(`/${s3Resp.Key}`)
//         }
//         return sendResponse({ res,status: 201, data: { count: paths.length, rows: paths }, message: _response_message.uploaded() });
//     } catch (err) {
//         console.error("Error while upload_to_s3, reason >> ", err.message)
//         return sendResponse({res, status: 500, errors: [{ message: `Error while upload to s3` }] });
//     }
// }

const deleteFromS3 = async (req, res) => {
    try {
        // #swagger.tags = ['aws']
        let keys = req.body.keys
        if (keys.length == 0) {
            return res.send("No files to be deleted")
        }
        let deleteObjs = keys.map(item => { return { Key: item } })
        var deleteParam = {
            Bucket: config.s3Config.bucketName,
            Delete: {
                Objects: deleteObjs
            }
        };

        S3.deleteObjects(deleteParam, function (err, data) {
            if (err) {
                console.log(err, err.stack);
                return sendResponse({res, status: 400, errors: [{ message: `Error while delete from s3` }] });
            }
            else {
                return sendResponse({res, status: 200, data: data, message: _response_message.deleted() }) /* Return response */

            }
        });
    } catch (err) {

        console.error("Error while delete_from_s3, reason >> ", err.message)
        return sendResponse({res, status: 500, errors: [{ message: `${err}` }] });
    }
}
module.exports = {
    uploadToS3,
    deleteFromS3
}

