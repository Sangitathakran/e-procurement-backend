require('dotenv').config()
const {_response_message } = require("@src/v1/utils/constants/messages");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _handleCatchErrors , _} = require("@src/v1/utils/helpers");
const { _individual_farmer_onboarding_steps } = require("@src/v1/utils/constants");
const {IndividualFarmer} = require("../../models/app/farmer/IndividualFarmer");
const Joi=require('joi');
const axios = require("axios");
const otpModel = require("@src/v1/models/app/auth/FarmerOTP");
const { API_KEY, SENDER } = process.env
const { generateJwtToken } = require("@src/v1/utils/helpers/jwt");
const { body, validationResult, checkSchema } = require("express-validator");
const { errorFormatter } = require("@src/v1/utils/helpers/express_validator");

module.exports.sendOTP = async (req, res) => {
   try{
    const { mobileNumber } = req.query;
    // Validate the mobile number
     const isValidMobile = await validateMobileNumber(mobileNumber);
     if(!isValidMobile){  
      return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.invalid("mobile Number") }));
  }

    let otp = Math.floor(1000 + Math.random() * 9000);

    const apikey = encodeURIComponent(API_KEY);
    const number = mobileNumber;
    const sender = SENDER;
    let myMessage = `Your OTP is ${otp} - Radiant Infonet Pvt Ltd.`;
    const message = encodeURIComponent(myMessage);
    
    const url = `https://api.textlocal.in/send/?apikey=${apikey}&numbers=${number}&sender=${sender}&message=${message}`;
    const response = await axios.post(url);
    if (!response){
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.otpNotSent("OTP") }] }));
    }
        
     
      const saveOTP = await new otpModel({
        phone: mobileNumber,
        otp: otp,
      }).save();
      
      
      if (saveOTP) {
        return res.status(200).send(new serviceResponse({ status: 200, data:[], message: _response_message.otpCreate("OTP") }))
        
      } else {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.otpNotCreate("OTP") }] }));
        
      }
    
   }
   catch(err){
    console.log('error',err)
    _handleCatchErrors(err, res);
   }
}

module.exports.verifyOTP = async (req, res) => {
    try {
        let { mobileNumber, inputOTP } = req.query;
    
        const isValidMobile =  await validateMobileNumber(mobileNumber);
         
        if(!isValidMobile){
          
            return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.invalid("mobile Number") }));
        }

        const userOTP = await otpModel.findOne({
          phone: mobileNumber,
        });
    
        if (inputOTP !== userOTP?.otp){

          return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.otp_not_verified("OTP") }));
        }
          
        const individualFormerData = await IndividualFarmer.findOne({
            mobile_no:mobileNumber,
            isVerifyOtp: true
        })
    
      let resp;
      if(individualFormerData)
        {
            resp = {
            token: generateJwtToken({mobile_no:mobileNumber}),
            mobileNumber:mobileNumber,
            _id:individualFormerData._id
        }
      }
       
        return res.status(200).send(new serviceResponse({ status: 200, data:resp, message: _response_message.otp_verified("your mobile") }));
        
    }
    catch(err){
      console.log('error',err)
      _handleCatchErrors(err, res);
    }
}

module.exports.registerName = async (req, res) => {
    try {
      const { mobileNumber, registerName, acceptTermCondition=false } = req.query;
  
  
      if (!acceptTermCondition){
        return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.Accept_term_condition() }));
      }
      // Check if the user already exists and is verified
      const formerData = await IndividualFarmer.findOne({
        mobile_no: mobileNumber,
        isVerifyOtp: true,
      });
      

      if (!formerData) {
        // If user doesn't exist, create a new record with the provided mobile_no and name
        const dataSaved = await new IndividualFarmer({
          mobile_no: mobileNumber,
          name: registerName,
          isVerifyOtp: true,
          steps: _individual_farmer_onboarding_steps // Ensure that this field is set as required
        }).save();
  
        if (dataSaved) {
         
         return res.status(200).send(new serviceResponse({ status: 200, data:dataSaved, message: _response_message.Data_registered("Data") }));
        }
      } else {
        // If the user already exists
       return res.status(400).send(new serviceResponse({ status: 200, message: _response_message.Data_already_registered("Data") }));
      }
    } catch (err) {
      console.log('error',err)
    _handleCatchErrors(err, res);
    }
  };
  
//updates
module.exports.saveFarmerDetails = async (req, res) => {
    try{
        const {screenName } = req.query;
        const {id:farmer_id}=req.params;
        if(!screenName) return res.status(400).send({message:'Please Provide Screen Name'});
        const farmerDetails = await IndividualFarmer.findById(farmer_id).select(
          `${screenName}`
        );
        
        if (farmerDetails) {
          farmerDetails[screenName] = req.body[screenName];

          await farmerDetails.save();
          return res.status(200).send(new serviceResponse({message:_response_message.updated(screenName)}))
        } else {
          return res.status(400).send(new serviceResponse({status:400,message:_response_message.notFound('Farmer')}));
        }
    }catch(err){
        console.log('error',err)
        _handleCatchErrors(err, res);
    } 
};

module.exports.getFarmerDetails = async (req, res) => {
  try{

      const {screenName } = req.query;
      const {id:farmer_id}=req.params;
      if(!screenName) return res.status(400).send({message:'Please Provide Screen Name'});


      const farmerDetails = await IndividualFarmer.findById(farmer_id).select(`${screenName} steps allStepsCompletedStatus` );
      
      if (farmerDetails) {
        return res.status(200).send(new serviceResponse({data: farmerDetails, message:_response_message.found(screenName)}))
      } else {
        return res.status(400).send(new serviceResponse({status:400,message:_response_message.notFound('Farmer')}));
      }

  }catch(err){

      console.log('error',err)
      _handleCatchErrors(err, res);
  } 
};




const validateMobileNumber =  async (mobile) => {
    let pattern = /^[0-9]{10}$/;
    return pattern.test(mobile);
}
