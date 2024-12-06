const express = require("express");
const router = express.Router();

const { handlePagination, handleRateLimit } = require("./middlewares/express_app");
const { helperRoutes } = require("./modules/api_helpers/Routes");
const { S3Router } = require("./modules/aws/routes");
const multer = require('multer');
const { masterRoutes } = require("./modules/master/Routes");
const { associateRoutes } = require("./modules/associate/Routes");

const { agentRoutes } = require("./modules/agent/Routes");
const { headOfficeRoutes}  = require("./modules/head-office/routes");
const { branchOfficeoRoutes}  = require("./modules/branch-office/Routes");
const { farmerRoutes} = require("./modules/farmer/Routes");
const { authRoutes } = require("./modules/auth/routes");
const { userManagementRoutes } = require("./modules/user-management/Routes")
const { FeatureRoutes } = require("@src/v1/modules/Features/Routes")
const { distillerRoutes } = require("./modules/distiller/Routes");

/* Define Your Routes */
router.use(handlePagination)
router.use(handleRateLimit)
router.use(multer().any())

router.use('/aws', S3Router)
router.use("/master", masterRoutes);
router.use("/modules", FeatureRoutes)

router.use("/agent", agentRoutes);
router.use('/helper', helperRoutes)

router.use('/user', userManagementRoutes)

router.use("/distiller", distillerRoutes);
router.use("/associate", associateRoutes);
router.use("/farmer", farmerRoutes);
router.use("/ho", headOfficeRoutes);
router.use("/bo", branchOfficeoRoutes);
router.use("/auth", authRoutes)

module.exports = { router };
