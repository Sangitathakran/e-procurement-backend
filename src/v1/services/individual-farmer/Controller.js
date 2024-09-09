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
   const { mobileNumber, acceptTermCondition} = req.query;
   // Validate the mobile number
    const isValidMobile = await validateMobileNumber(mobileNumber);
    if(!isValidMobile){  
     return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.invalid("mobile Number") }));
 }

  if(!acceptTermCondition){
  return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.Accept_term_condition()}));
  }
 
let otpEntry = await otpModel.findOne({ phone: mobileNumber });

const otp = otpEntry ? otpEntry.otp : Math.floor(1000 + Math.random() * 9000);
   
   const apikey = encodeURIComponent(API_KEY);
   const sender = SENDER;
   const message = encodeURIComponent(`Your OTP is ${otp} - Radiant Infonet Pvt Ltd.`);
   
   const url = `https://api.textlocal.in/send/?apikey=${apikey}&numbers=${mobileNumber}&sender=${sender}&message=${message}`;
   const response = await axios.post(url);
   if (!response){
       return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.otpNotSent("OTP") }] }));
   }
       
    if(otpEntry) {
      otpEntry.otp = otp;
      await otpEntry.save();
    } else {
      await new otpModel({
        phone: mobileNumber,
        otp: otp,
      }).save();
    }
  
    return res.status(200).send(new serviceResponse({ status: 200, data:[], message: _response_message.otpCreate("OTP") }))
      
  }
  catch(err){
   console.log('error',err)
   _handleCatchErrors(err, res);
  }
}


module.exports.verifyOTP = async (req, res) => {
  try {
      const { mobileNumber, inputOTP } = req.query;

      // Validate the mobile number
      const isValidMobile = await validateMobileNumber(mobileNumber);
      if (!isValidMobile) {
          return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.invalid("mobile Number") }));
      }

      // Find the OTP for the provided mobile number
      const userOTP = await otpModel.findOne({ phone: mobileNumber });

      // Verify the OTP
      if (inputOTP !== userOTP?.otp) {
          return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.otp_not_verified("OTP") }));
      }

      // Find the farmer data and verify OTP
      let individualFormerData = await IndividualFarmer.findOne({ mobile_no: mobileNumber, isVerifyOtp: true });

      // If farmer data does not exist, create a new one
      if (!individualFormerData) {
          individualFormerData = await new IndividualFarmer({
              mobile_no: mobileNumber,
              isVerifyOtp: true,
              steps: _individual_farmer_onboarding_steps // Ensure that this field is set as required
          }).save();
      }

      // Prepare the response data
      const resp = {
          token: generateJwtToken({ mobile_no: mobileNumber }),
          ...JSON.parse(JSON.stringify(individualFormerData)) // Use individualFormerData (existing or newly saved)
      };

      // Send the response
      return res.status(200).send(new serviceResponse({ status: 200, data: resp, message: _response_message.otp_verified("your mobile") }));
  } catch (err) {
      console.log('error', err);
      _handleCatchErrors(err, res);
  }
};


module.exports.registerName = async (req, res) => {
    try {
      const { registerName  } = req.body;

      // Check if the user already exists and is verified
      const farmerData = await IndividualFarmer.findOneAndUpdate(
        {mobile_no: req.mobile_no},
        { $set: { name: registerName }},
        { new: true }
      );
    
      if(farmerData){
        return res.status(200).send(new serviceResponse({ status: 200, data:farmerData, message: _response_message.Data_registered("Data") }));
      } else {
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
          farmerDetails.steps = req.body?.steps
          const farmerUpdatedDetails = await farmerDetails.save();
          return res.status(200).send(new serviceResponse({data: farmerUpdatedDetails, message:_response_message.updated(screenName)}))
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

      const {screenName} = req.query;
      const { id }=req.params;
      //if(!screenName) return res.status(400).send({message:'Please Provide Screen Name'});

      const selectFields = screenName ? `${screenName} allStepsCompletedStatus steps` : null;

      if (selectFields) {
        farmerDetails = await IndividualFarmer.findOne({ _id: id }).select(selectFields);
      } else {
        farmerDetails = await IndividualFarmer.findOne({ _id: id });
      }

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


