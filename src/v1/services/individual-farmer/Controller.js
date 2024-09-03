require('dotenv').config()
const {_response_message } = require("@src/v1/utils/constants/messages");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const axios = require("axios");
const otpModel = require("@src/v1/models/app/auth/FormerOTP");
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { API_KEY, SENDER } = process.env



module.exports.sendOTP = async (req, res) => {
   try{
    const { mobileNumber } = req.query;

    let otp = Math.floor(100000 + Math.random() * 900000);

    const apikey = encodeURIComponent(API_KEY);
    const number = mobileNumber;
    const sender = SENDER;
    let myMessage = `Your OTP is ${otp} - Radiant Infonet Pvt Ltd.`;
    const message = encodeURIComponent(myMessage);
    console.log("inside sendOTP")
    const url = `https://api.textlocal.in/send/?apikey=${apikey}&numbers=${number}&sender=${sender}&message=${message}`;
    const response = await axios.post(url);
     console.log("response==>",response)
    if (!response){
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.otpNotSent("OTP") }] }));
    }
        
     
      const saveOTP = await new otpModel({
        phone: mobileNumber,
        otp: otp,
      }).save();
      const resp = {
        url: url,
        msg: _response_message.otpCreate,
       
      };
      console.log("saveOTP==>",saveOTP)
      if (saveOTP) {
        return res.status(200).send(new serviceResponse({ status: 200, data:[], message: _response_message.otpCreate("OTP") }))
      } else {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.otpNotCreate("OTP") }] }));
      }
    
   }
   catch(error){
    _handleCatchErrors(error, res)
   }
}

module.exports.verifyOTP = async (req, res) => {
    try {
        let { mobileNumber, inputOTP } = req.query;
    
        const userOTP = await otpModel.findOne({
          phone: mobileNumber,
        });
    
        if (inputOTP !== userOTP?.otp){
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.otp_not_verified("OTP") }] }));
        }
          
    
        const data = await otpModel.findOneAndUpdate(
          { phone: mobileNumber },
          { isMobileVerified: true },
          { new: true }
        );
      
      let resp;
      if(data){
         resp = {
            token: jwt.sign({mobileNumber: req.query.mobileNumber}, JWT_SECRET_KEY, {expiresIn: "1d"}),
            mobileNumber:mobileNumber
        }
      }
       
        return res.status(200).send(new serviceResponse({ status: 200, data:resp, message: _response_message.otp_verified("your mobile") }));
    }
    catch(error){
        _handleCatchErrors(error, res)
    }
}


