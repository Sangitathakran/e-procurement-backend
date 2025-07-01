// Path Alias

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
//require('newrelic');
require("module-alias/register");

// import modules
const express = require("express");
const app = express();
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./src/v1/utils/swagger/swagger-output.json");
require("@src/v1/utils/websocket/server");

const { PORT, apiVersion } = require("./config/index");

require("./config/database");
// require('newrelic');
// require('./config/redis')
const {
  handleCatchError,
  handleRouteNotFound,
  handleCors,
  handlePagination,
} = require("@src/v1/middlewares/express_app");
const { combinedLogger, combinedLogStream } = require("@config/logger");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const { router } = require("./src/v1/routes");
const { sendMail } = require("@src/v1/utils/helpers/node_mailer");
const { agristackchRoutes } = require("@src/v1/modules/agristack/Routes");
// application level middlewares
app.use(helmet());
app.use(
  cors({
    origin: "*",
    methods: ["POST", "GET", "PUT", "DELETE", "OPTIONS", "PATCH"],
  })
);
app.use(morgan('dev'));
app.use(morgan("combined", { stream: combinedLogStream }));
app.use(express.json( { limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(compression());
app.use(handleCors);
app.use(handlePagination);
app.use(cookieParser());
app.disable("x-powered-by");
app.use(apiVersion, router);
app.use('/farmer-registry-api-up-qa', agristackchRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
require('./crons/index')
// server status
app.get(
  "/",
  asyncErrorHandler(async (req, res) => {
    res.send(
      `<div align="center" style=""><h1>E-Procurement Server Ready For Requests. <h1><div>`
    );
  })
);

/* Handle errors */
//app.use(handleCatchError)
app.all("*", handleRouteNotFound);

// Listner server
app.listen(PORT, async () => {
  console.log("E-procurement server is running on PORT:", PORT);
});
