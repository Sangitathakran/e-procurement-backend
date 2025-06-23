const dotenv = require('dotenv');
const path = require('path');

// Setup env
dotenv.config({
    path: path.resolve(__dirname, `../.env`)
});

const procurement_partners = {
  Radiant: "Radiant",
  Youkta: "Youkta",
  Beam: "Beam",
  Agribid: "Agribid",
  Supplyvalid: "Supplyvalid",
  NEML: "NEML",
  Others: "Others"
};

module.exports = {
    // Server 
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT || 3000,
    webSocketPort: process.env.WEBSOCKETPORT || 8080,
    rootDir: path.resolve('./'),
    apiVersion: process.env.API_VERSION,
    // Default Secret Key For Auth Token
    JWT_SECRET_KEY: process.env.SECRET_KEY,
    THIRD_PARTY_JWT_SECRET: process.env.THIRD_PARTY_JWT_SECRET,
    THIRD_PARTY_API_KEY: process.env.THIRD_PARTY_API_KEY,
    connection_string: process.env.CONNECTION_STRING,
    platform_org: process.env.PLATFORM_ORG,
    app_name: process.env.APP_NAME,
    license_key: process.env.LICENSE_KEY,
    mailer: {
        service: 'gmail',
        host: 'smtp.mailtrap.io',
        port: 2525,
        type: 'OAuth2',
        user: process.env.EMAIL_USER, /*User for email services*/
        pass: process.env.EMAIL_PASS, /*Password for email services*/
        secureConnection: true,
        tls: {
            ciphers: 'SSLv3'
        },
        requireTLS: true
    },
    s3Config: {
        accessKey: process.env.ACCESS_KEY_ID,
        secretKey: process.env.SECRET_ACCESS_KEY,
        region: process.env.REGION,
        bucketName: process.env.BUCKET_NAME
    },
    logEmails: 'imran@radiantinfonet.com , maneesh@radiantinfonet.com ,ayush@navankur.org , dileep@radiantinfonet.com',
    AADHAR_SERVICE_PROVIDER_KEY: process.env.AADHAR_VERIFICATION_API_KEY,
    AADHAR_SERVICE_PROVIDER: process.env.AADHAR_VERIFICATION_API_PROVIDER,
    procurement_partners
}