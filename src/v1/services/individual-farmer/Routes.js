const express = require ("express");
const router = express.Router();
const {sendOTP,verifyOTP} = require("./Controller") 


router.post("/sendOTP",sendOTP)
router.post("/verifyOTP",verifyOTP);



module.exports = { router }