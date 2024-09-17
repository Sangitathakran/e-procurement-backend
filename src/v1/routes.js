const { handlePagination, handleRateLimit } = require("./middlewares/express_app");
const { helperRoutes } = require("./services/api_helpers/Routes");
const { S3Router } = require("./services/aws/routes");
const multer = require('multer');
const { masterRoutes } = require("./services/master/Routes");
const { individualFarmerRoutes } = require("./services/individual-farmer/Routes");
const { farmerRoutes } = require("./services/farmer/Routes");
const { userAuthRoutes } = require("./services/associate/auth/Routes");
const { hoDashboardRoutes } = require("./services/ho-dashboard/Routes")
const { requireMentRoutes } = require("./services/requirement/Routes")
const { hoAuthRoutes } = require("./services/ho-auth/Routes")
const express = require("express");
const { associateRoutes } = require("./services/associate/Routes");
const { agentRoutes } = require("./services/agent/Routes");
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
router.use("/agent", agentRoutes);

module.exports = { router };
