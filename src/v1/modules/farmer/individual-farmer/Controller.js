require("dotenv").config();
const { _response_message } = require("@src/v1/utils/constants/messages");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _handleCatchErrors, _ } = require("@src/v1/utils/helpers");
const {
  _individual_farmer_onboarding_steps,
} = require("@src/v1/utils/constants");
const  IndividualFarmer  = require("@src/v1/models/app/farmerDetails/IndividualFarmer");
const { generateJwtToken } = require("@src/v1/utils/helpers/jwt");
const stateList = require("../../utils/constants/stateList");

const { body, validationResult, checkSchema } = require("express-validator");
const { errorFormatter } = require("@src/v1/utils/helpers/express_validator");
const { smsService } = require("@src/v1/utils/third_party/SMSservices");
const OTPModel = require("@src/v1/models/app/auth/OTP");

module.exports.sendOTP = async (req, res) => {
  try {
    const { mobileNumber, acceptTermCondition } = req.body;
    // Validate the mobile number
    const isValidMobile = await validateMobileNumber(mobileNumber);
    if (!isValidMobile) {
      return  new serviceResponse({res,
        status: 400,
        message: _response_message.invalid("mobile Number"),
      })
    }

    if (!acceptTermCondition) {
      return   new serviceResponse({res,
        status: 400,
        message: _response_message.Accept_term_condition(),
      })
    }

    await smsService.sendOTPSMS(mobileNumber);

    return new serviceResponse({res,
      status: 200,
      data: [],
      message: _response_message.otpCreate("OTP"),
    })
  } catch (err) {
    console.log("error", err);
    _handleCatchErrors(err, res);
  }
};

module.exports.verifyOTP = async (req, res) => {
  try {
    const { mobileNumber, inputOTP } = req.body;

    // Validate the mobile number
    const isValidMobile = await validateMobileNumber(mobileNumber);
    if (!isValidMobile) {
      return  new serviceResponse({res,
        status: 400,
        message: _response_message.invalid("mobile Number"),
      })
    }

    // Find the OTP for the provided mobile number
    const userOTP = await OTPModel.findOne({ phone: mobileNumber });
    // Verify the OTP
    if (inputOTP !== userOTP?.otp) {
      return new serviceResponse({res,
        status: 400,
        message: _response_message.otp_not_verified("OTP"),
      })
    }

    // Find the farmer data and verify OTP
    let individualFormerData = await IndividualFarmer.findOne({
      mobile_no: mobileNumber,
      isVerifyOtp: true,
    });

    // If farmer data does not exist, create a new one
    if (!individualFormerData) {
      individualFormerData = await new IndividualFarmer({
        mobile_no: mobileNumber,
        isVerifyOtp: true,
        steps: _individual_farmer_onboarding_steps, // Ensure that this field is set as required
      }).save();
    }

    // Prepare the response data
    const resp = {
      token: generateJwtToken({ mobile_no: mobileNumber }),
      ...JSON.parse(JSON.stringify(individualFormerData)), // Use individualFormerData (existing or newly saved)
    };

    // Send the response
    return new serviceResponse({
      res,
      status: 200,
      data: resp,
      message: _response_message.otp_verified("your mobile"),
    })
      
  } catch (err) {
    console.log("error", err);
    _handleCatchErrors(err, res);
  }
};

module.exports.registerName = async (req, res) => {
  try {
    const { registerName } = req.body;

    // Check if the user already exists and is verified
    const farmerData = await IndividualFarmer.findOneAndUpdate(
      { mobile_no: req.mobile_no },
      { $set: { name: registerName, userType: 3 } },
      { new: true }
    );

    if (farmerData) {
      return new serviceResponse({
        res,
        status: 200,
        data: farmerData,
        message: _response_message.Data_registered("Data"),
      })
    } else {
      return new serviceResponse({
        res,
        status: 200,
        message: _response_message.Data_already_registered("Data"),
      })
    }
  } catch (err) {
    console.log("error", err);
    _handleCatchErrors(err, res);
  }
};

//updates
module.exports.saveFarmerDetails = async (req, res) => {
  try {
    const { screenName } = req.query;
    const { id: farmer_id } = req.params;
    if (!screenName)
      return res.status(400).send({ message: "Please Provide Screen Name" });
    const farmerDetails = await IndividualFarmer.findById(farmer_id).select(
      `${screenName}`
    );

    if (farmerDetails) {
      farmerDetails[screenName] = req.body[screenName];
      farmerDetails.steps = req.body?.steps;
      const farmerUpdatedDetails = await farmerDetails.save();
      return new serviceResponse({res,
        status:200,
        data: farmerUpdatedDetails,
        message: _response_message.updated(screenName),
      })
    } else {
      return new serviceResponse({
        res,
        status: 400,
        message: _response_message.notFound("Farmer"),
      })
    }
  } catch (err) {
    console.log("error", err);
    _handleCatchErrors(err, res);
  }
};

module.exports.getFarmerDetails = async (req, res) => {
  try {
    const { screenName } = req.query;
    const { id } = req.params;
    //if(!screenName) return res.status(400).send({message:'Please Provide Screen Name'});

    const selectFields = screenName
      ? `${screenName} allStepsCompletedStatus steps`
      : null;

    if (selectFields) {
      farmerDetails = await IndividualFarmer.findOne({ _id: id }).select(
        selectFields
      );
    } else {
      farmerDetails = await IndividualFarmer.findOne({ _id: id });
    }

    if (farmerDetails) {
      return new serviceResponse({
        res,
        data: farmerDetails,
        message: _response_message.found(screenName)
      })
       
    } else {
      return new serviceResponse({
        res,
        status: 400,
        message: _response_message.notFound("Farmer"),
      })
    }
  } catch (err) {
    console.log("error", err);
    _handleCatchErrors(err, res);
  }
};

module.exports.submitForm = async (req, res) => {
  try {
    const { id } = req.params;

    const farmerDetails = await IndividualFarmer.findById(id).select(
      "address farmer_id basic_details"
    );
    const generateFarmerId = (farmer) => {
      const stateData = stateList.stateList.find(
        (item) =>
          item.state.toLowerCase() === farmer.address.state.toLowerCase()
      );
      //console.log("stateData--->", stateData)
      const district = stateData.districts.find(
        (item) =>
          item.districtName.toLowerCase() ===
          farmer.address.district.toLowerCase()
      );

      if (!district) {
        return  new serviceResponse({
          res,
          status: 400,
          message: _response_message.notFound(
            `${farmer.address.district} district`
          ),
        })
      }
      // console.log("district--->", district)
      const stateCode = stateData.stateCode;
      const districtSerialNumber = district.serialNumber;
      const districtCode = district.districtCode;
      const randomNumber = Math.floor(100 + Math.random() * 900);

      const farmerId =
        stateCode + districtSerialNumber + districtCode + randomNumber;
      // console.log("farmerId-->", farmerId)
      return farmerId;
    };
    const farmer_id = await generateFarmerId(farmerDetails);

    if (farmerDetails && farmer_id) {
      if (farmerDetails.farmer_id == null) {
        farmerDetails.farmer_id = farmer_id;
        farmerDetails.allStepsCompletedStatus = true;
        const farmerUpdatedDetails = await farmerDetails.save();
        //welcome sms send functionality
        const mobileNumber = req.mobile_no;
        const farmerName = farmerDetails.basic_details.name;
        const farmerId = farmerDetails.farmer_id;
        const smsService = new SMSService();
        await smsService.sendFarmerRegistrationSMS(
          mobileNumber,
          farmerName,
          farmerId
        );

        return new serviceResponse({res,status:200, data: farmerUpdatedDetails })
      }

      return  new serviceResponse({
        res,
        status:200,
        data: farmerDetails,
        message: _response_message.submit("Farmer"),
      })
    } else {
      return new serviceResponse({
        res,
        status: 400,
        message: _response_message.submit("Farmer"),
      })
    }
  } catch (err) {
    console.log("error", err);
    _handleCatchErrors(err, res);
  }
};

const validateMobileNumber = async (mobile) => {
  let pattern = /^[0-9]{10}$/;
  return pattern.test(mobile);
};
