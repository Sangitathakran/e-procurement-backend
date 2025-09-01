process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

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
const crypto = require("crypto");
const { PORT, apiVersion } = require("./config/index");
// require('newrelic');
require("./config/database");
const {
  handleCatchError,
  handleRateLimit,
  handleRouteNotFound,
  handleCors,
  handlePagination,
} = require("@src/v1/middlewares/express_app");


app.use(
  cors({
    origin: ["http://localhost:*", "http://*.khetisauda.com", "https://*.khetisauda.com"],
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use(handleRateLimit); 

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "font-src": ["'self'", "https:", "data:"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'self'"], // Prevents clickjacking
      "img-src": ["'self'", "data:"],
      "object-src": ["'none'"],
      "script-src": ["'self'"],
      "script-src-attr": ["'none'"],
      "style-src": ["'self'"],
      "upgrade-insecure-requests": [] // this directive is a boolean-like switch
    }
  },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  referrerPolicy: { policy: "no-referrer" },
  dnsPrefetchControl: { allow: false },
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  hidePoweredBy: true,
}));


const { combinedLogger, combinedLogStream } = require("@config/logger");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");


const { router } = require("./src/v1/routes");
const { agristackchRoutes } = require("@src/v1/modules/agristack/Routes");
// application level middlewares

app.use(morgan('dev'));
app.use(morgan("combined", { stream: combinedLogStream }));
app.use(express.json( { limit: "50mb"} ));
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

// Remove X-Powered-By header
app.use((req, res, next) => {
  res.removeHeader("X-Powered-By");
  res.removeHeader("server");
  res.removeHeader("Access-Control-Allow-Methods");
  next();
});




app.all("*", handleRouteNotFound);

app.use((req, res, next) => {
  res.setHeader("cps",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'self';"
  );
  next();
});


// Listner server
app.listen(PORT, async () => {
  console.log("E-procurement server is running on PORT:", PORT);
});
