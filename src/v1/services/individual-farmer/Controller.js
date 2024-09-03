<<<<<<< HEAD
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


=======
const {IndividualFarmer} = require("../../models/app/farmer/IndividualFarmer");
const Joi=require('joi');
//update
module.exports.saveFarmerDetails = async (req, res) => {
    try{
        const { farmer_id, screenName } = req.query;
        if(!farmer_id)  return res.status(400).send({message:"Farmer id required"})
        const { error } = await validateIndividualFarmer(req.body, screenName);
        if(error) return res.status(400).send({error:error.message})
        const farmerDetails = await IndividualFarmer.findById(farmer_id).select(
          `${screenName}`
        );
        if (farmerDetails) {
          farmerDetails[screenName] = req.body[screenName];
        } else {
          return res.status(400).send({ message: "Farmer not Found" });
        }
    }catch(err){
        console.log('error',err)
        return res.status(500).send({ message: err });
    }
 
};

async function validateIndividualFarmer(data, screenName) {
  let schema = {};
  switch (screenName) {
    case "basic_details":
      schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().required(),
        father_husband_name: Joi.string().required(),
        mobile_no: Joi.string().required(),
        category: Joi.string().required(),
        dob: Joi.string().required(),
        farmer_type: Joi.string().required(),
        gender: Joi.string().required(),
      });
      break;
      case "address":
      schema = Joi.object({
        address_line_1: Joi.string().required(),
        address_line_2: Joi.string().required(),
        country: Joi.string().required(),
        state: Joi.string().required(),
        district: Joi.string().required(),
        block: Joi.string().required(),
        village: Joi.string().required(),
        pinCode: Joi.string().required(),
      });
      break;
      case "land_details":
        schema = Joi.object({
            area: Joi.string().required(),
            pinCode: Joi.string().required(),
            state: Joi.string().required(),
            district: Joi.string().required(),
            village: Joi.string().required(),
            block: Joi.string().required(),
            ghat_number: Joi.string().required(),
            khasra_number: Joi.string().required(),
        });
        break;
      case "documents":
      schema = Joi.object({
        aadhar_number: Joi.string().required(),
        pan_number: Joi.string().required(),
      });
      break;
      case "bank_details":
        schema = Joi.object({
            bank_name: Joi.string().required(),
            branch_name: Joi.string().required(),
            account_holder_name: Joi.string().required(),
            ifsc_code: Joi.string().required(),
            account_no: Joi.string().required(),
            pinCode: Joi.string().required(),
            proof_doc: Joi.string().required(),
            kharif_crops: Joi.string().required(),
        });
        break;
    default:
      schema = {};
      break;
  }
  return schema.validate(data[screenName]);
}
>>>>>>> 3a35253d6ac5fd7477cd9c6140fbc393cf1fb699
