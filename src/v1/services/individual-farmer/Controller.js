const {_response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { axios } = require("axios");
const {otpModel} = require("@src/v1/models/app/auth/OTP") 
const { API_KEY, SENDER } = require("process.env");


module.exports.sendOTP = async (req,res) => {
   try{
    const { mobileNumber } = req.body;

    let otp = Math.floor(100000 + Math.random() * 900000);

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
        phone: mobile,
        otp: otp,
      }).save();
      const resp = {
        url: url,
        msg: _response_message.otpCreate,
      };
      if (saveOTP) {
        return res.status(200).send(new serviceResponse({ status: 200, message: resp.msg }))
      } else {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.otpNotCreate("OTP") }] }));
      }
    
   }
   catch(error){
    _handleCatchErrors(error, res)
   }
}

module.exports.verifyOTP = async (req,res) => {
    try {
        let { mobile, inputOTP } = req.body;
    
        const userOTP = await CreateOTP.findOne({
          phone: mobile,
        });
    
        if (inputOTP !== userOTP?.otp){
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.otp_not_verified("OTP") }] }));
        }
          
    
        const data = await otpModel.findOneAndUpdate(
          { mobile: mobile },
          { isMobileVerified: true },
          { new: true }
        );
    
        return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.otp_verified("your mobile") }));
    }
    catch(error){
        _handleCatchErrors(error, res)
    }
}