require('dotenv').config()
const {_response_message } = require("@src/v1/utils/constants/messages");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _handleCatchErrors , _} = require("@src/v1/utils/helpers");
const { _individual_farmer_onboarding_steps } = require("@src/v1/utils/constants");
const {IndividualFarmer} = require("../../models/app/farmer/IndividualFarmer");
const Joi=require('joi');
const axios = require("axios");
const otpModel = require("@src/v1/models/app/auth/FormerOTP");
const { JWT_SECRET_KEY } = require('@config/index');
const { API_KEY, SENDER } = process.env
const { generateJwtToken } = require("@src/v1/utils/helpers/jwt");



module.exports.sendOTP = async (req, res) => {
   try{
    const { mobileNumber } = req.query;
    // Validate the mobile number
     const isValidMobile = await validateMobileNumber(mobileNumber);
     if (!isValidMobile) {
       return res.status(400).send({ message: "Invalid mobile number." });
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
      const resp = {
        url: url,
        msg: _response_message.otpCreate,
       
      };
      
      if (saveOTP) {
        return res.status(200).send(new serviceResponse({ status: 200, data:[], message: _response_message.otpCreate("OTP") }))
        
      } else {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.otpNotCreate("OTP") }] }));
        
      }
    
   }
   catch(err){
    //_handleCatchErrors(err, res)
    return res.status(500).send({ message: err });
   }
}

module.exports.verifyOTP = async (req, res) => {
    try {
        let { mobileNumber, inputOTP } = req.query;
    
        const validateNo =  validateMobileNumber(mobileNumber);

        if(!validateNo){
            return res.status(400).send({message:"Invalid mobile number."})
        }

        const userOTP = await otpModel.findOne({
          phone: mobileNumber,
        });
    
        if (inputOTP !== userOTP?.otp){

            return res.status(200).send({message:"OTP doesn't match."})
        }
          
        const individualFormerData = await IndividualFarmer.findOne({
            mobile_no:mobileNumber,
            //name: registerName,
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
       return res.status(500).send({ message: err });
    }
}

module.exports.registerName = async (req, res) => {
    try {
      const { mobileNumber, registerName, acceptTermCondition=false } = req.query;
  
      // Validate input
      const { error } = validateRegisterDetail(req.query);
      if (error) return res.status(400).send({ error: error.message });
  
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
      return res.status(500).send({ message: err.message });
    }
  };
  
//updates
module.exports.saveFarmerDetails = async (req, res) => {
    try{


        const {screenName } = req.query;
        const {id:farmer_id}=req.params;
        if(!screenName) return res.status(400).send({message:'Please Provide Screen Name'});
        const { error } = await validateIndividualFarmer(req.body, screenName);
        if(error) return res.status(400).send({error:error.message})

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

async function validateRegisterDetail(data) {
  try{
    const schema = Joi.object({
        mobileNumber:Joi.string().min(10).max(10).required(),
        registerName:Joi.string().required()
    })
    return schema.validate(data)
  } catch (err){
    console.log("err",err)
  }
}

const validateMobileNumber =  async (mobile) => {
    let pattern = /^[0-9]{10}$/;
    return pattern.test(mobile);
}
