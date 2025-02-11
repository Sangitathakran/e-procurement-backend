const express = require("express");
const { createWhr,updateWhrById,getWhrById,lotList,batchList} = require("./Controller");
const { verifyAssociate } = require("../utils/verifyAssociate");
const { validateForm } = require("./Validation");
const whrRoutes = express.Router();

whrRoutes.post("/create-whr", [verifyAssociate,validateForm], createWhr);
whrRoutes.put("/update-whr/:id",[verifyAssociate,validateForm],updateWhrById);
whrRoutes.get("/get-whr-details",verifyAssociate,getWhrById);
whrRoutes.get("/batch-list",batchList);
whrRoutes.get("/lot-list",lotList)


module.exports = { whrRoutes }; 