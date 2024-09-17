const { handlePagination, handleRateLimit } = require("./middlewares/express_app");
const { helperRoutes } = require("./modules/api_helpers/Routes");
const { S3Router } = require("./modules/aws/routes");
const multer = require('multer');
const { masterRoutes } = require("./modules/master/Routes");
const { individualFarmerRoutes } = require("./modules/individual-farmer/Routes");
const { farmerRoutes } = require("./modules/farmer/Routes");
const { userAuthRoutes } = require("./modules/associate/auth/Routes");
const { hoDashboardRoutes } = require("./modules/ho-dashboard/Routes")
const { requireMentRoutes } = require("./modules/requirement/Routes")
const { hoAuthRoutes } = require("./modules/ho-auth/Routes")
const express = require("express");
const { associateRoutes } = require("./modules/associate/Routes");
const router = express.Router();

/* Define Your Routes */
router.use(handlePagination)
router.use(handleRateLimit)
router.use(multer().any())

router.use('/aws', S3Router)
router.use("/master", masterRoutes);
router.use('/ivd-farmer', individualFarmerRoutes);
router.use('/ho-dashboard', hoDashboardRoutes);
router.use('/requirement', requireMentRoutes)
router.use('/farmer', farmerRoutes);
router.use('/helper', helperRoutes)
router.use("/ho-auth", hoAuthRoutes)
router.use("/associate", associateRoutes);

module.exports = { router };
