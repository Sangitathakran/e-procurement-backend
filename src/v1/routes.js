const { handlePagination, handleRateLimit } = require("./middlewares/express_app");
const { helperRoutes } = require("./services/api_helpers/Routes");
const { S3Router } = require("./services/aws/routes");
const multer = require('multer');
const { masterRoutes } = require("./services/master/Routes");
const { individualFarmerRoutes } = require("./services/individual-farmer/Routes");
const { procurementRoutes } = require("./services/procurement/Routes");
const { userAuthRoutes } = require("./services/auth/Routes");
const {hoDashboardRoutes}=require("./services/ho-dashboard/Routes")
const {requireMentRoutes}=require("./services/requirement/Routes")
const {hoAuthRoutes}=require("./services/ho-auth/Routes")
const {hoBranchRoutes}=require("./services/ho-branch-management/Routes")
const express = require("express");
const router = express.Router();

 /* Define Your Routes */
 router.use(handlePagination)
 router.use(handleRateLimit)
 router.use(multer().any())

 router.use('/aws', S3Router)
 router.use("/master", masterRoutes);
 router.use('/ivd-farmer',individualFarmerRoutes);
 router.use('/ho-dashboard',hoDashboardRoutes);
 router.use('/requirement',requireMentRoutes)
 router.use("/procurement", procurementRoutes);
 router.use('/helper', helperRoutes)
 router.use("/auth", userAuthRoutes);
 router.use("/ho-auth",hoAuthRoutes)
 router.use("/ho-branch",hoBranchRoutes)
module.exports = router;
