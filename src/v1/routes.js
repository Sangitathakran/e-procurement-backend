const express = require("express");
const router = express.Router();

const { handlePagination, handleRateLimit } = require("./middlewares/express_app");
const { helperRoutes } = require("./modules/api_helpers/Routes");
const { S3Router } = require("./modules/aws/routes");
const multer = require('multer');
const { masterRoutes } = require("./modules/master/Routes");
const { associateRoutes } = require("./modules/associate/Routes");

const { wareHouseRoutes } = require("./modules/warehouse/Routes");
const { agentRoutes } = require("./modules/agent/Routes");
const { headOfficeRoutes } = require("./modules/head-office/routes");
const { branchOfficeoRoutes } = require("./modules/branch-office/Routes");
const { farmerRoutes } = require("./modules/farmer/Routes");
const { authRoutes } = require("./modules/auth/routes");
const { userManagementRoutes } = require("./modules/user-management/Routes")
const { FeatureRoutes } = require("@src/v1/modules/Features/Routes")
const { distillerRoutes } = require("./modules/distiller/Routes");
const { nccfRoutes } = require("./modules/nccf/routes");
const { bankIntegrationRoutes } = require("./modules/bankIntegration/Routes");
const { dropDownRoutes } = require("./modules/dropDown/Routes");
const { ekhridRoutes } = require("./modules/ekhrid/Routes");
const { upagRoutes } = require("./modules/upag/Routes");
const {commonAuth} = require("@middlewares/jwt")
const { slaRoutes } = require("./modules/sla/Routes");
// const { agristackchRoutes } = require("./modules/agristack/Routes");
const { bulkImport } = require("./modules/importServices/Routes");
const { nafedRoutes } = require("@modules/nafed-apis/routes");

/* Define Your Routes */
router.use(handlePagination)
router.use(handleRateLimit)
router.use(multer().any())

router.use('/aws',commonAuth, S3Router) 
router.use("/master", masterRoutes); 
router.use("/modules", FeatureRoutes)
router.use("/agent", agentRoutes);
router.use("/newsla", commonAuth ,slaRoutes);

router.use('/helper', helperRoutes) 
router.use('/user', userManagementRoutes) 
router.use("/distiller", distillerRoutes); 
router.use("/associate", associateRoutes); 
router.use("/farmer", farmerRoutes);
router.use("/ho", headOfficeRoutes); 
router.use("/bo", branchOfficeoRoutes); 
router.use("/warehouse", wareHouseRoutes); 
router.use("/auth", authRoutes)
router.use("/nccf", nccfRoutes) 
router.use("/bank",commonAuth, bankIntegrationRoutes)
router.use("/dropdown",commonAuth, dropDownRoutes);
router.use("/ekhrid",commonAuth, ekhridRoutes);
router.use("/upag", upagRoutes);
router.use("/distiler_visit", nafedRoutes);

router.use('/', bulkImport)

module.exports = { router };
