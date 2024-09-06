const { handlePagination, handleRateLimit } = require("./middlewares/express_app");
const { helperRoutes } = require("./services/api_helpers/Routes");
const { S3Router } = require("./services/aws/routes");
const multer = require('multer');
const { masterRoutes } = require("./services/master/Routes");
const { individualFarmerRoutes } = require("./services/individual-farmer/Routes");
const { procurementRoutes } = require("./services/procurement/Routes");
const { userAuthRoutes } = require("./services/auth/Routes");

// Call Your Routes
const ExpressApp = require("express")();
/**
 * 
 * @param {ExpressApp} app 
 */
module.exports = (app) => {
    /* Define Your Routes */
    app.use(handlePagination)
    app.use(handleRateLimit)
    app.use(multer().any())

    app.use('/aws', S3Router)
    app.use("/master", masterRoutes);
    app.use('/ivd-farmer',individualFarmerRoutes);

    app.use("/procurement", procurementRoutes);
    app.use('/helper', helperRoutes)
    app.use("/auth", userAuthRoutes);
}
