
const express = require("express");
const { bulkuplodCenterProjection, getCenterProjections,
  } = require("./Controller");

const nccfCenterProjectionRoutes = express.Router();

nccfCenterProjectionRoutes.get("/", getCenterProjections);
nccfCenterProjectionRoutes.post("/bulk-upload-projection", bulkuplodCenterProjection);
module.exports = { nccfCenterProjectionRoutes };
