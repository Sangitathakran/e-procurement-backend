const AWS = require("aws-sdk");
const { v4: uuidv4 } = require('uuid');
const config = require("@config/index");

 
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
        let { folder_name } = req.query
        let { files } = req

        if (files.length == 0) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: `Attachment file is required` }] }));
        }
        let paths = []
        for (const file of files) {
            let filename = uuidv4() + `_${file.originalname}`
            const key = folder_name ? (folder_name + "/" + filename) : filename;
            const uploadParams = {
                Bucket: config.s3Config.bucketName,
                Key: key,
                Body: file.buffer || file,
            };
            let s3Resp = await S3.upload(uploadParams).promise();
            console.log("s3Resp-->", s3Resp)
            paths.push(`/${s3Resp.Key}`)
        }
        return {
            status : true, 
            details : { count: paths.length, rows: paths },
        }
    } catch (err) {
        console.error("Error while upload_to_s3, reason >> ", err.message)
        return { 
            status: false, 
            details : { count: paths.length, rows: paths },
        }
    }
}

const downloadFromS3 = async (req, res, key) => {
    try {

        const uploadParams = {
            Bucket: config.s3Config.bucketName,
            Key: key,
        };
        
        const signedUrl = await S3.getSignedUrl('getObject', uploadParams);
        console.log("signedUrl-->", signedUrl)

        
        return res.json( {
            status : true, 
            details : signedUrl,
        })
    } catch (err) {
        console.error("Error while upload_to_s3, reason >> ", err.message)
    }
}

module.exports = { uploadToS3, downloadFromS3 }