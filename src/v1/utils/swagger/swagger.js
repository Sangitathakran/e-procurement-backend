const { PORT = 3000 } = require('../../../../config/index');

const options = {
    language: null,
    disableLogs: false,
    disableWarnings: false,
    openapi: null,
    autoHeaders: false,
    autoQuery: true,
    autoBody: true,
    autoResponse: true,
    sortParameters: 'normal',
    sanitizeOutputData: false,
    writeOutputFile: true
};

const swaggerAutogen = require('swagger-autogen')(options);
const doc = {
    info: {
        version: 'v1.0.0',
        title: 'API DOC',
        description: 'API Documentation',
    },
    securityDefinitions: {
        bearerAuth: {
            type: "apiKey",
            name: "Authorization",
            in: "header",
            description: "Bearer Token"
        }
    },
    security: [
        {
            bearerAuth: []
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer'
            }
        }
    },
    // host: `192.168.1.147:${PORT}/v1`,
    host: `localhost:${PORT}/v1`,
};

const outputFile = './swagger-output.json';
const routes = ['../../routes.js'];

swaggerAutogen(outputFile, routes, doc);