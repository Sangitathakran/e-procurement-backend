const AWS = require("aws-sdk");
const { v4: uuidv4 } = require('uuid');
const config = require("@config/index");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const sharp = require("sharp");

require("aws-sdk/lib/maintenance_mode_message").suppress = true;

// Initialize S3
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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
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
      if (file.size > MAX_FILE_SIZE) {
        return sendResponse({
          res,
          status: 400,
          errors: [{ message: `${file.originalname} exceeds the 3MB size limit` }]
        });
      }

      if (!allowedTypes.includes(file.mimetype)) {
        return sendResponse({
          res,
          status: 400,
          errors: [{ message: `${file.originalname} has an unsupported file type` }]
        });
      }

      let filename = uuidv4() + `_${file.originalname}`;
      const key = folder_name ? `${folder_name}/${filename}` : filename;

      let bufferToUpload = file.buffer || file;

      // Remove EXIF for image files
      if (file.mimetype.startsWith("image/")) {
        bufferToUpload = await sharp(bufferToUpload).toBuffer(); // removes metadata (EXIF) by default
      }

      const uploadParams = {
        Bucket: config.s3Config.bucketName,
        Key: key,
        Body: bufferToUpload,
        ContentType: file.mimetype
      };

      const s3Resp = await S3.upload(uploadParams).promise();
      paths.push(`/${s3Resp.Key}`);
    }

    return sendResponse({
      res,
      status: 201,
      data: { count: paths.length, rows: paths },
      message: _response_message.uploaded()
    });

  } catch (err) {
    console.error("Error while upload_to_s3, reason >> ", err.message);
    return sendResponse({
      res,
      status: 500,
      errors: [{ message: `Error while upload to s3` }]
    });
  }
};

const deleteFromS3 = async (req, res) => {
  try {
    let keys = req.body.keys;

    if (!Array.isArray(keys) || keys.length === 0) {
      return sendResponse({
        res,
        status: 400,
        errors: [{ message: `No files to be deleted` }]
      });
    }

    // Remove leading slashes from keys
    const deleteObjs = keys.map(item => ({ Key: item.replace(/^\/+/, '') }));

    const deleteParam = {
      Bucket: config.s3Config.bucketName,
      Delete: { Objects: deleteObjs }
    };

    const data = await S3.deleteObjects(deleteParam).promise();

    return sendResponse({
      res,
      status: 200,
      message: _response_message.deleted()
    });
  } catch (err) {
    console.error("Error while delete_from_s3, reason >> ", err.message);
    return sendResponse({
      res,
      status: 500,
      errors: [{ message: `Error while delete from s3` }]
    });
  }
};


const getS3BufferFile = async (req, res) => {
  try {
    const key = req.query.key ? req.query.key.replace(/^\/+/, '') : null;

    if (!key) {
      return sendResponse({
        res,
        status: 400,
        errors: [{ message: `File key is required` }]
      });
    }

    const params = {
      Bucket: config.s3Config.bucketName,
      Key: key
    };

    const fileData = await S3.getObject(params).promise();

    if (!fileData || !fileData.Body) {
      return sendResponse({
        res,
        status: 404,
        errors: [{ message: `File not found in S3` }]
      });
    }

    res.setHeader('Content-Type', fileData.ContentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${key.split('/').pop()}"`);

    return res.send(fileData.Body);

  } catch (error) {
    return sendResponse({
      res,
      status: 400,
      errors: [{ message: error.message }]
    });
  }
};


module.exports = {
  uploadToS3,
  deleteFromS3,
  getS3BufferFile
};
