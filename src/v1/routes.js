const { handlePagination, handleRateLimit } = require("./middlewares/express_app");
const { helperRoutes } = require("./services/api_helpers/Routes");
const { S3Router } = require("./services/aws/routes");
const multer = require('multer');
const { masterRoutes } = require("./services/master/Routes");
const { procurementRoutes } = require("./services/procurement/Routes");
const { farmerRoutes } = require("./services/farmer/Routes");

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
    app.use("/procurement", procurementRoutes);
<<<<<<< HEAD
    app.use('/import-templete', templateRoutes);
    app.use('/farmer', farmerRoutes);
=======
    app.use('/helper', helperRoutes)
>>>>>>> b7cdf22e0c4352186de1538e71f0556410748e25
}
