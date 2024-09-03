const { handlePagination, handleRateLimit } = require("./middlewares/express_app");
const { templateRoutes } = require("./services/templete/Routes");
const { S3Router } = require("./services/aws/routes");
const multer = require('multer');
const { masterRoutes } = require("./services/master/Routes");
const { individualFarmer } = require("./services/individual-farmer/Routes");
const { procurementRoutes } = require("./services/procurement/Routes");

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
    app.use('/individual-farmer',individualFarmer)

    app.use("/procurement", procurementRoutes);
    app.use('/import-templete', templateRoutes)
}
