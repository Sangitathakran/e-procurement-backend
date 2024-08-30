// Path Alias
require('module-alias/register')
// import modules
const express = require("express");
const app = express();
const apiRouterV1 = express.Router()
const morgan = require("morgan");
const cors = require('cors');
const helmet = require("helmet");
const bodyParser = require("body-parser");
const compression = require('compression');
const cookieParser = require('cookie-parser');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./src/v1/utils/swagger/swagger-output.json');
require('@src/v1/utils/websocket/server');
// configs
const { PORT, apiVersion } = require("./config/index");
require('./config/database')
// require('./config/redis')
const { handleCatchError, handleRouteNotFound, handleCors, handlePagination } = require("@src/v1/middlewares/express_app");
const { combinedLogger, combinedLogStream } = require("@config/logger");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");

// application level middlewares
app.use(helmet())
app.use(cors());
// app.use(morgan('dev'));
app.use(morgan('combined', { stream: combinedLogStream }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "30mb" }));
app.use(compression());
app.use(handleCors)
app.use(handlePagination)
app.use(cookieParser());
app.disable('x-powered-by')
app.use(apiVersion, apiRouterV1)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// server status
app.get('/', asyncErrorHandler(async (req, res) => {
    res.send(`<div align="center" style=""><h1>Server Ready For Requests. <h1><div>`);
}));

// Routes permissions
require("./src/v1/routes")(apiRouterV1)

/* Handle errors */
// app.use(handleCatchError)
app.all("*", handleRouteNotFound)


// Listner server
app.listen(PORT, async () => {
    console.log("Server is running on PORT:", PORT);
})  
