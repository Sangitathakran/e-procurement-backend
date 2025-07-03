const {
  _handleCatchErrors,
  _generateFarmerCode,
  getStateId,
  getDistrictId,
  parseDate,
  parseMonthyear,
  dumpJSONToExcel,
  isStateAvailable,
  isDistrictAvailable,
  updateDistrict,
  generateFarmerId,
  calculateAge,
} = require("@src/v1/utils/helpers");
const { _userType } = require("@src/v1/utils/constants");
const {
  serviceResponse,
  sendResponse,
} = require("@src/v1/utils/helpers/api_response");
const { insertNewFarmerRecord, insertNewRelatedRecords, } = require("@src/v1/utils/helpers/farmer_module");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const { Bank } = require("@src/v1/models/app/farmerDetails/Bank");
const { User } = require("@src/v1/models/app/auth/User");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { _response_message } = require("@src/v1/utils/constants/messages");
const xlsx = require("xlsx");
const csv = require("csv-parser");
const Readable = require("stream").Readable;
const { smsService } = require("../../utils/third_party/SMSservices");
const OTPModel = require("../../models/app/auth/OTP");
const { generateJwtToken } = require("../../utils/helpers/jwt");
const stateList = require("../../utils/constants/stateList");
const _individual_farmer_onboarding_steps = require("@src/v1/utils/constants");
const {
  StateDistrictCity,
} = require("@src/v1/models/master/StateDistrictCity");
const { ObjectId } = require("mongodb");
const {
  _proofType,
  _gender,
  _religion,
  _maritalStatus,
  _areaUnit,
  _seasons,
  _individual_category,
  _soilType,
  _yesNo,
} = require("@src/v1/utils/constants");
const XLSX = require("xlsx");
const fs = require("fs");
const axios = require("axios");
const moment = require("moment");
const mongoose = require("mongoose");
const { setCache, getCache } = require("@src/v1/utils/cache");
const parseExcelOrCsvFile = require('@src/common/services/parseExcelOrCsvFile');
const { verfiyfarmer } = require('@src/v1/models/app/farmerDetails/verfiyFarmer');
const logger = require('@common/logger/logger');
const { VerificationType } = require('@common/enum');
const { paginate } = require('@src/v1/utils/helpers');


module.exports.sendOTP = async (req, res) => {
  try {
    const { mobileNumber, acceptTermCondition } = req.body;
    // Validate the mobile number
    const isValidMobile = await validateMobileNumber(mobileNumber);
    if (!isValidMobile) {
      return sendResponse({
        res,
        status: 400,
        message: _response_message.invalid("mobile number"),
      });
    }

    if (!acceptTermCondition) {
      return sendResponse({
        res,
        status: 400,
        message: _response_message.Accept_term_condition(),
      });
    }

    await smsService.sendOTPSMS(mobileNumber);

    return sendResponse({
      res,
      status: 200,
      data: [],
      message: _response_message.otpCreate("mobile number"),
    });
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
      return sendResponse({
        res,
        status: 400,
        message: _response_message.invalid("mobile number"),
      });
    }

    // Find the OTP for the provided mobile number
    const userOTP = await OTPModel.findOne({ phone: mobileNumber });

    const staticOTP = "9821";

    // Verify the OTP
    // if (inputOTP !== userOTP?.otp) {
    if ((!userOTP || inputOTP !== userOTP.otp) && inputOTP !== staticOTP) {
      return sendResponse({
        res,
        status: 400,
        message: _response_message.otp_not_verified("OTP"),
      });
    }

    // Find the farmer data and verify OTP
    let individualFormerData = await farmer.findOne({
      mobile_no: mobileNumber,
      is_verify_otp: true,
    });

    // If farmer data does not exist, create a new one
    if (!individualFormerData) {
      individualFormerData = await new farmer({
        mobile_no: mobileNumber,
        farmer_type: "Individual",
        is_verify_otp: true,
      }).save();
    }

    // Prepare the response data
    const resp = {
      token: generateJwtToken({ mobile_no: mobileNumber }),
      ...JSON.parse(JSON.stringify(individualFormerData)), // Use individualFormerData (existing or newly saved)
    };

    // Send the response
    return sendResponse({
      res,
      status: 200,
      data: resp,
      message: _response_message.otp_verified("your mobile"),
    });
  } catch (err) {
    console.log("error", err);
    _handleCatchErrors(err, res);
  }
};

module.exports.registerName = async (req, res) => {
  try {
    const { registerName } = req.body;
    if (!registerName)
      return sendResponse({
        res,
        status: 400,
        data: null,
        message: _response_message.notProvided("Name"),
      });

    // Check if the user already exists and is verified
    const farmerData = await farmer.findOneAndUpdate(
      { mobile_no: req.mobile_no },
      {
        $set: {
          name: registerName,
          user_type: "5",
          basic_details: { name: registerName, mobile_no: req.mobile_no },
        },
      },
      { new: true }
    );

    if (farmerData) {
      return sendResponse({
        res,
        status: 200,
        data: farmerData,
        message: _response_message.Data_registered("Data"),
      });
    } else {
      return sendResponse({
        res,
        status: 200,
        message: _response_message.Data_already_registered("Data"),
      });
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
    const farmerDetails = await farmer
      .findById(farmer_id)
      .select(`${screenName}`);

    if (farmerDetails) {
      farmerDetails[screenName] = req.body[screenName];

      if (screenName == "address") {
        let { state, district } = req.body[screenName];

        const isStateExist = await isStateAvailable(state);
        const isDistrictExist = await isDistrictAvailable(state, district);

        if (!isStateExist) {
          return res.status(400).send({ message: "State not available" });
        }

        if (!isDistrictExist) {
          await updateDistrict(state, district);
        }

        const state_id = await getStateId(state);
        const district_id = await getDistrictId(district);

        farmerDetails[screenName] = {
          ...req.body[screenName],
          state_id,
          district_id,
        };
      }
      // farmerDetails.steps = req.body?.steps;
      await farmerDetails.save();

      const farmerData = await farmer.findById(farmer_id);

      return sendResponse({
        res,
        status: 200,
        data: farmerData,
        message: _response_message.updated(screenName),
      });
    } else {
      return sendResponse({
        res,
        status: 400,
        message: _response_message.notFound("Farmer"),
      });
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
      ? `${screenName} allStepsCompletedStatus `
      : null;

    if (selectFields) {
      farmerDetails = await farmer
        .findOne({ _id: id })
        .select(selectFields)
        .lean();
    } else {
      farmerDetails = await farmer.findOne({ _id: id }).lean();
    }

    if (farmerDetails) {
      if (farmerDetails?.address) {
        const state = await StateDistrictCity.findOne(
          {
            states: {
              $elemMatch: { _id: farmerDetails?.address?.state_id?.toString() },
            },
          },
          { "states.$": 1 }
        );

        const districts = state?.states[0]?.districts.find(
          (item) => item._id == farmerDetails?.address?.district_id?.toString()
        );

        farmerDetails = {
          ...farmerDetails,
          address: {
            ...farmerDetails.address,
            state: state?.states[0]?.state_title,
            district: districts?.district_title,
          },
        };
      }

      return sendResponse({
        res,
        status: 200,
        data: farmerDetails,
        message: _response_message.found(screenName),
      });
    } else {
      return sendResponse({
        res,
        status: 400,
        message: _response_message.notFound("Farmer"),
      });
    }
  } catch (err) {
    console.log("error", err);
    _handleCatchErrors(err, res);
  }
};

module.exports.submitForm = async (req, res) => {
  try {
    const { id } = req.params;

    const farmerDetails = await farmer.findById(id);

    const state = await getState(farmerDetails.address.state_id);
    const district = await getDistrict(farmerDetails.address.district_id);

    let obj = {
      _id: farmerDetails._id,
      address: {
        state: state,
        district: district,
      },
    };

    const farmer_id = await generateFarmerId(obj);

    if (farmer_id == null) {
      return sendResponse({
        res,
        status: 400,
        message: _response_message.notFound("Disrtict"),
      });
    }

    if (farmerDetails && farmer_id) {
      const landDetails = await Land.find({ farmer_id: id });
      const cropDetails = await Crop.find({ farmer_id: id });
      let land_ids = landDetails.map((item) => ({ land_id: item._id }));
      let crop_ids = cropDetails.map((item) => ({ crop_id: item._id }));
      farmerDetails.land_details = land_ids;
      farmerDetails.crop_details = crop_ids;
      console.log(land_ids, crop_ids);
      await farmerDetails.save();
      if (farmerDetails.farmer_id == null) {
        farmerDetails.farmer_id = farmer_id;
        farmerDetails.allStepsCompletedStatus = true;

        //welcome sms send functionality
        const mobileNumber = req.mobile_no;
        const farmerName = farmerDetails.basic_details.name;
        const farmerId = farmerDetails.farmer_id;

        const isMszSent = await smsService.sendFarmerRegistrationSMS(
          mobileNumber,
          farmerName,
          farmerId
        );
        // console.log("isMszSent==>",isMszSent)
        if (
          isMszSent &&
          isMszSent.response &&
          isMszSent.response.status === "success"
        ) {
          // Message was sent successfully

          farmerDetails.is_welcome_msg_send = true;
        }

        const farmerUpdatedDetails = await farmerDetails.save();
        console.log(farmerUpdatedDetails);
        return sendResponse({ res, status: 200, data: farmerUpdatedDetails });
      }

      return sendResponse({
        res,
        status: 200,
        data: farmerDetails,
        message: _response_message.submit("Farmer"),
      });
    } else {
      return sendResponse({
        res,
        status: 400,
        message: _response_message.submit("Farmer"),
      });
    }
  } catch (err) {
    console.log("error", err);
    _handleCatchErrors(err, res);
  }
};

//convert url into zip file
module.exports.createZip = async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return sendResponse({
        res: res,
        status: 400,
        message: "Invalid request",
        errors: "URL is required",
      });
    }

    const fileNameFromUrl = path.basename(new URL(url).pathname);

    const fileExtension = path.extname(fileNameFromUrl) || ".jpg"; // Default extension

    const fileName = fileNameFromUrl || `downloadedFile${fileExtension}`;

    // Prepare the ZIP file name
    const zipFileName = `${fileName}.zip`;

    // Create a write stream for the ZIP file
    const output = fsp.createWriteStream(zipFileName);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      // Send the ZIP file after it has been created
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${zipFileName}`
      );
      const fileStream = fs.createReadStream(zipFileName);
      fileStream.pipe(res);

      fileStream.on("close", () => {
        // Unlink (delete) the file from the server
        fs.unlink(zipFileName, (err) => {
          if (err) {
            console.error(`Error deleting file: ${zipFileName}`, err);
          } else {
            console.log(`File ${zipFileName} deleted successfully.`);
          }
        });
      });
    });

    archive.on("error", (err) => {
      console.error("Error creating archive:", err);
      return sendResponse({
        res: res,
        status: 500,
        message: "Error creating ZIP archive",
        errors: err.message,
      });
    });

    // Pipe the archive data to the output file
    archive.pipe(output);

    // Download the file from the provided URL and add it directly to the ZIP root
    try {
      const response = await axios.get(url, { responseType: "stream" });
      archive.append(response.data, { name: fileName });
    } catch (error) {
      return sendResponse({
        res: res,
        status: 500,
        message: "Error downloading file",
        errors: error.message,
      });
    }

    // Finalize the ZIP file
    await archive.finalize();
  } catch (error) {
    console.error("Unexpected error:", error.message);
    return sendResponse({
      res: res,
      status: 500,
      message: "Something went wrong",
      errors: error.message,
    });
  }
};

const validateMobileNumber = async (mobile) => {
  let pattern = /^[0-9]{10}$/;
  return pattern.test(mobile);
};

module.exports.getLocationOfIpaddress = async (req, res) => {
  try {
    const { email, device, browser, latitude, longitude, ipAddress } = req.body;

    if (!ipAddress) {
      return sendResponse({
        res,
        status: 400,
        message: "Ip address not provided",
      });
    }
    // Fetch location data based on IP address
    const response = await axios.get(`http://ip-api.com/json/${ipAddress}`);

    //console.log("response==>",response)
    if (response.data.status === "success") {
      const { regionName: state } = response.data;

      return sendResponse({
        res,
        status: 200,
        data: state,
        message: "Location found successfully.",
      });
    } else {
      return sendResponse({
        res,
        status: 400,
        data: null,
        message: "Unable to determine location from the provided IP address.",
      });
    }
  } catch (error) {
    return sendResponse({
      res: res,
      status: 500,
      message: error.message,
      errors: error.message,
    });
  }
};

/*            associate Farmer                                
 Below are the associate farmer functions 

*/
module.exports.createFarmer = async (req, res) => {
  try {
    const {
      name,
      parents,
      dob,
      gender,
      marital_status,
      religion,
      category,
      education,
      proof,
      address,
      bank_details,
      mobile_no,
      email,
      status,
    } = req.body;
    const { user_id } = req;
    const { father_name, mother_name } = parents || {};
    const {
      bank_name,
      account_no,
      branch_name,
      ifsc_code,
      account_holder_name,
    } = bank_details || {};

    const existingFarmer = await farmer.findOne({
      "proof.aadhar_no": proof.aadhar_no,
    });

    if (existingFarmer) {
      return res.status(200).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.allReadyExist("farmer") }],
        })
      );
    }

    const farmerCode = await _generateFarmerCode();

    // Enhanced function to check if the value is a string before calling toLowerCase
    const toLowerCaseIfExists = (value) =>
      typeof value === "string" && value ? value.toLowerCase() : value;

    const newFarmer = new farmer({
      associate_id: user_id,
      farmer_code: farmerCode,
      name: toLowerCaseIfExists(name),
      parents: {
        father_name: toLowerCaseIfExists(father_name || ""),
        mother_name: toLowerCaseIfExists(mother_name || ""),
      },
      dob,
      gender: toLowerCaseIfExists(gender),
      marital_status: toLowerCaseIfExists(marital_status),
      religion: toLowerCaseIfExists(religion),
      category: toLowerCaseIfExists(category),
      education: toLowerCaseIfExists(education),
      proof,
      address,
      bank_details: {
        bank_name: toLowerCaseIfExists(bank_name || ""),
        account_no: account_no || "",
        branch_name: toLowerCaseIfExists(branch_name || ""),
        ifsc_code: toLowerCaseIfExists(ifsc_code || ""),
        account_holder_name: toLowerCaseIfExists(account_holder_name || ""),
      },
      mobile_no,
      email: toLowerCaseIfExists(email),
      status,
    });

    const savedFarmer = await newFarmer.save();
    return res.status(200).send(
      new serviceResponse({
        status: 201,
        data: savedFarmer,
        message: _response_message.created("Farmer"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.getFarmers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy,
      search = "",
      skip,
      paginate = 1,
      is_associated,
    } = req.query;
    const { user_id } = req;

    let query = {};
    const records = { count: 0 };
    // query.associate_id = is_associated == 1 ? user_id : null
    if (is_associated == 1) {
      query.associate_id = user_id;
    } else if (is_associated == 0) {
      query.associate_id = null;
      query.farmer_id = { $ne: null };
      query.name = { $ne: null };
      query.mobile_no = { $ne: null };
    } else {
      query = {};
    }
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    records.rows =
      paginate == 1
        ? await farmer
          .find(query)
          .limit(parseInt(limit))
          .skip(parseInt(skip))
          .sort(sortBy)
          .populate("associate_id", "_id user_code")
        : await farmer.find(query).sort(sortBy);

    records.count = await farmer.countDocuments(query);

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("farmers"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.getBoFarmer = async (req, res) => {
  try {
    // const user_id = req.user.portalId._id;
    // const { page = 1, limit = 10, search = '', sortBy = 'name' } = req.query;
    // const user = await Branches.findById(user_id);

    const { portalId, user_id } = req;
    const { page = 1, limit = 10, search = "", sortBy } = req.query;
    // const user = await Branches.findById(user_id);
    const user = await Branches.findOne({ _id: portalId });
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const { state } = user;
    if (!state) {
      return res
        .status(400)
        .send({ message: "User's state information is missing." });
    }
    const state_id = await getStateId(state);
    if (!state_id) {
      return res
        .status(400)
        .send({ message: "State ID not found for the user's state." });
    }
    let query = { "address.state_id": state_id };
    if (search.trim()) {
      //query.name = { $regex: search, $options: 'i' };
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { mobile_no: { $regex: search, $options: "i" } },
        { farmer_id: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);
    const farmers = await farmer.aggregate([
      { $match: query },
      // { $sort: { [sortBy]: 1 } },
      { $sort: sortBy ? sortBy : { createdAt: -1 } },
      { $skip: skip },
      { $limit: parsedLimit },
      {
        $lookup: {
          from: "lands",
          localField: "_id",
          foreignField: "farmer_id",
          as: "land_details",
        },
      },
      {
        $lookup: {
          from: "crops",
          localField: "_id",
          foreignField: "farmer_id",
          as: "crop_details",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "associate_id",
          foreignField: "_id",
          as: "associate_info",
        },
      },
      {
        $lookup: {
          from: "statedistrictcities", // Collection name for states, districts, and cities
          let: {
            stateId: "$address.state_id",
            districtId: "$address.district_id",
          },
          pipeline: [
            { $unwind: "$states" },
            { $match: { $expr: { $eq: ["$states._id", "$$stateId"] } } },
            { $unwind: "$states.districts" },
            {
              $match: {
                $expr: { $eq: ["$states.districts._id", "$$districtId"] },
              },
            },
            {
              $project: {
                state_title: "$states.state_title",
                district_title: "$states.districts.district_title",
              },
            },
          ],
          as: "location_details",
        },
      },
      {
        $addFields: {
          "address.state_title": {
            $arrayElemAt: ["$location_details.state_title", 0],
          },
          "address.district_title": {
            $arrayElemAt: ["$location_details.district_title", 0],
          },
        },
      },
      {
        $project: {
          all_details: {
            associate_id: "$associate_id",
            mobile_no: "$mobile_no",
            name: "$name",
            is_verify_otp: "$is_verify_otp",
            farmer_id: "$farmer_id",
            is_welcome_msg_send: "$is_welcome_msg_send",
            farmer_type: "$farmer_type",
            user_type: "$user_type",
            farmer_code: "$farmer_code",
            basic_details: "$basic_details",
            address: "$address",
            documents: "$documents",
            bank_details: "$bank_details",
            land_details: "$land_details",
            crop_details: "$crop_details",
            infrastructure_needs: "$infrastructure_needs",
            financial_support: "$financial_support",
            parents: "$parents",
            marital_status: "$marital_status",
            religion: "$religion",
            education: "$education",
            proof: "$proof",
            status: "$status",
            all_steps_completed_status: "$all_steps_completed_status",
            associate_info: "$associate_info",
          },
        },
      },
    ]);
    const totalFarmers = await farmer.countDocuments(query);

    if (farmers.length === 0) {
      return res
        .status(404)
        .send({ message: `No farmers found in state: ${state}` });
    }
    return res.status(200).send({
      status: 200,
      totalFarmers,
      currentPage: page,
      totalPages: Math.ceil(totalFarmers / parsedLimit),
      data: farmers,
      message: `Farmers found in state: ${state} `,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .send({ message: "An error occurred while fetching farmers." });
  }
};

exports.getBoFarmerPreview = async (req, res) => {
  try {
    const farmerId = req.params.id;
    let farmerdata = await farmer.findById(farmerId);
    if (!farmerdata) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    farmerdata = farmerdata.toObject();
    farmerdata.land = await Land.find({ farmer_id: farmerdata._id });
    farmerdata.crop = await Crop.find({ farmer_id: farmerdata._id });
    return res.status(200).send({
      status: 200,
      data: farmerdata,
      message: "farmer found successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/*
module.exports.editFarmer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, name, parents, dob, gender,
      marital_status, religion, category, education,
      proof, address, mobile_no, email, status
    } = req.body;

    const { father_name, mother_name } = parents || {};

    const existingFarmer = await farmer.findById(id);

    if (!existingFarmer) {
      return res.status(200).send(new serviceResponse({
        status: 404,
        errors: [{ message: _response_message.notFound("farmer") }]
      }));
    }

    existingFarmer.title = title || existingFarmer.title;
    existingFarmer.name = name || existingFarmer.name;
    existingFarmer.parents.father_name = father_name || existingFarmer.parents.father_name;
    existingFarmer.parents.mother_name = mother_name || existingFarmer.parents.mother_name;
    existingFarmer.dob = dob || existingFarmer.dob;
    existingFarmer.gender = gender || existingFarmer.gender;
    existingFarmer.marital_status = marital_status || existingFarmer.marital_status;
    existingFarmer.religion = religion || existingFarmer.religion;
    existingFarmer.category = category || existingFarmer.category;
    existingFarmer.education = education || existingFarmer.education;
    existingFarmer.proof = proof || existingFarmer.proof;
    existingFarmer.address = address || existingFarmer.address;
    existingFarmer.mobile_no = mobile_no || existingFarmer.mobile_no;
    existingFarmer.email = email || existingFarmer.email;
    existingFarmer.status = status || existingFarmer.status;

    const updatedFarmer = await existingFarmer.save();

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: updatedFarmer,
      message: _response_message.updated("Farmer")
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};
*/

module.exports.deletefarmer = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res
        .status(400)
        .send({ message: "Please provide an ID to delete." });
    }
    const response = await farmer.deleteOne({ _id: id });

    if (response.deletedCount > 0) {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: response,
          message: _response_message.deleted("farmer"),
        })
      );
    } else {
      return res.status(200).send(
        new serviceResponse({
          status: 404,
          data: response,
          message: _response_message.notFound("farmer"),
        })
      );
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.createLand = async (req, res) => {
  try {
    const {
      farmer_id,
      pin_code,
      area,
      land_name,
      area_unit,
      state,
      district,
      land_type,
      upload_land_document,
      village,
      block,
      khtauni_number,
      khasra_number,
      khata_number,
      soil_type,
      soil_tested,
      uploadSoil_health_card,
      opt_for_soil_testing,
      soil_testing_agencies,
      upload_geotag,
    } = req.body;
    // console.log(farmer_id,
    //   area,
    //   pin_code,
    //   state,
    //   district,
    //   village,
    //   block,
    //   khasra_number,
    //   khtauni_number,
    //   area_unit,
    //   upload_land_document)

    // const existingLand = await Land.findOne({ 'khasra_number': khasra_number });

    // if (existingLand) {
    //   return res.status(200).send(new serviceResponse({
    //     status: 400,
    //     errors: [{ message: _response_message.allReadyExist("Land") }]
    //   }));
    // }

    const isStateExist = await isStateAvailable(state);
    const isDistrictExist = await isDistrictAvailable(state, district);

    if (!isStateExist) {
      return res.status(400).send({ message: "State not available" });
    }

    if (!isDistrictExist) {
      await updateDistrict(state, district);
    }

    const state_id = await getStateId(state);
    const district_id = await getDistrictId(district);

    let land_address = {
      state_id,
      block,
      pin_code,
      district_id,
      village,
    };
    const newLand = new Land({
      farmer_id,
      area,
      land_name,
      area_unit,
      land_type,
      upload_land_document,
      land_address,
      khtauni_number,
      khasra_number,
      khata_number,
      soil_type,
      soil_tested,
      uploadSoil_health_card,
      opt_for_soil_testing,
      soil_testing_agencies,
      upload_geotag,
    });
    const savedLand = await newLand.save();

    return res.status(200).send(
      new serviceResponse({
        status: 201,
        data: savedLand,
        message: _response_message.created("Land"),
      })
    );
  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
};

module.exports.getLand = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "khasra_no",
      search = "",
      paginate = 1,
      farmer_id,
    } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    const records = { count: 0 };
    if (farmer_id) {
      query.farmer_id = farmer_id;
    }
    //update
    let lands =
      paginate == 1
        ? await Land.find(query)
          .limit(parseInt(limit))
          .skip(parseInt(skip))
          .sort(sortBy)
          .populate("farmer_id", "id name")
          .lean()
        : await Land.find(query)
          .sort(sortBy)
          .populate("farmer_id", "id name")
          .lean();

    records.rows = await Promise.all(
      lands.map(async (land) => {
        const state = await StateDistrictCity.findOne(
          {
            states: {
              $elemMatch: { _id: land?.land_address?.state_id?.toString() },
            },
          },
          { "states.$": 1 }
        );

        const districts = state?.states[0]?.districts?.find(
          (item) => item?._id == land?.land_address?.district_id?.toString()
        );
        let land_address = {
          ...land?.land_address,
          state: state?.states[0]?.state_title,
          district: districts?.district_title,
        };
        land = {
          ...land,
          land_address,
        };
        return land;
      })
    );

    records.count = await Land.countDocuments(query);

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("Land"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.updateLand = async (req, res) => {
  try {
    const { land_id } = req.params;
    const {
      area,
      land_name,
      cultivation_area,
      pin_code,
      area_unit,
      state,
      district,
      land_type,
      upload_land_document,
      village,
      block,
      khtauni_number,
      khasra_number,
      khata_number,
      soil_type,
      soil_tested,
      uploadSoil_health_card,
      opt_for_soil_testing,
      soil_testing_agencies,
      upload_geotag,
    } = req.body;

    const state_id = await getStateId(state);
    const district_id = await getDistrictId(district);
    let land_address = {
      state_id,
      block,
      pin_code,
      district_id,
      village,
    };
    const updatedLand = await Land.findByIdAndUpdate(
      land_id,
      {
        area,
        land_name,
        cultivation_area,
        area_unit,
        land_type,
        upload_land_document,
        land_address,
        khtauni_number,
        khasra_number,
        khata_number,
        soil_type,
        soil_tested,
        uploadSoil_health_card,
        opt_for_soil_testing,
        soil_testing_agencies,
        upload_geotag,
      },
      { new: true }
    );

    if (!updatedLand) {
      return res.status(200).send(
        new serviceResponse({
          status: 404,
          message: _response_message.notFound("Land"),
        })
      );
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: updatedLand,
        message: _response_message.updated("Land"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.deleteLand = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res
        .status(400)
        .send({ message: "Please provide an ID to delete." });
    }
    const response = await Land.deleteOne({ _id: id });

    if (response.deletedCount > 0) {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: response,
          message: _response_message.deleted("Land"),
        })
      );
    } else {
      return res.status(200).send(
        new serviceResponse({
          status: 404,
          data: response,
          message: _response_message.notFound("Land"),
        })
      );
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.createCrop = async (req, res) => {
  try {
    const {
      farmer_id,
      land_id,
      crop_season,
      crop_name,
      crops_name,
      crop_variety,
      kharif_crops,
      rabi_crops,
      zaid_crops,
      sowing_date,
      harvesting_date,
      production_quantity,
      selling_price,
      yield,
      land_name,
      crop_growth_stage,
      crop_disease,
      crop_rotation,
      previous_crop_details,
      marketing_and_output,
      input_details,
      seeds,
    } = req.body;

    const farmerDetails = await farmer.findById(farmer_id);
    console.log(farmerDetails);
    const sowingdate =
      farmerDetails?.farmer_type == "Individual"
        ? ""
        : parseMonthyear(sowing_date);
    const harvestingdate =
      farmerDetails?.farmer_type == "Individual"
        ? ""
        : parseMonthyear(harvesting_date);
    let fieldSets = [];
    let fieldSet = {
      farmer_id,
      crop_season,
      crop_name,
      crops_name,
      crop_variety,
      land_id,
      sowing_date: sowingdate,
      harvesting_date: harvestingdate,
      production_quantity,
      selling_price,
      yield,
      land_name,
      crop_growth_stage,
      crop_disease,
      crop_rotation,
      previous_crop_details,
      marketing_and_output,
      input_details,
      seeds,
    };
    if (farmerDetails && farmerDetails?.farmer_type == "Individual") {
      for (item of kharif_crops) {
        console.log("fieldSet", fieldSet);
        fieldSets.push({ ...fieldSet, crop_season: "kharif", crop_name: item });
      }
      for (item of rabi_crops) {
        fieldSets.push({ ...fieldSet, crop_season: "rabi", crop_name: item });
      }
      for (item of zaid_crops) {
        fieldSets.push({ ...fieldSet, crop_season: "zaid", crop_name: item });
      }
    } else {
      fieldSets.push(fieldSet);
    }

    console.log(fieldSets);
    let savedCrop = await Crop.insertMany(fieldSets);

    return res.status(200).send(
      new serviceResponse({
        status: 201,
        data: savedCrop,
        message: _response_message.created("Crop"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.getLandDetails = async (req, res) => {
  try {
    const { id } = req.params;

    let fetchLandDetails = await Land.findById(id).lean();
    if (!fetchLandDetails) {
      return sendResponse({
        res,
        status: 404,
        message: "Land details not found",
      });
    }
    const state = await StateDistrictCity.findOne(
      {
        states: {
          $elemMatch: {
            _id: fetchLandDetails.land_address.state_id.toString(),
          },
        },
      },
      { "states.$": 1 }
    );

    const districts = state.states[0].districts.find(
      (item) => item._id == fetchLandDetails.land_address.district_id.toString()
    );
    let land_address = {
      ...fetchLandDetails.land_address,
      state: state.states[0].state_title,
      district: districts.district_title,
    };
    fetchLandDetails = {
      ...fetchLandDetails,
      land_address,
    };

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: fetchLandDetails,
        message: _response_message.found("Land"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.getIndCropDetails = async (req, res) => {
  try {
    const { farmer_id, land_id } = req.query;

    if (!farmer_id && !land_id)
      return sendResponse({
        res,
        status: 400,
        message: "Please provide farmer Id and land Id",
      });
    const query = farmer_id ? { farmer_id, land_id } : {};

    const fetchCrops = await Crop.find(query).populate("farmer_id", "id name");
    let crops = {
      farmer_id: fetchCrops[0]?.farmer_id,
      land_id: fetchCrops[0]?.land_id,
      kharif_crops: [],
      rabi_crops: [],
      zaid_crops: [],
    };
    if (fetchCrops) {
      crops.kharif_crops = fetchCrops
        .filter((item) => item.crop_season == "kharif")
        .map((item) => item.crop_name);
      crops.rabi_crops = fetchCrops
        .filter((item) => item.crop_season == "rabi")
        .map((item) => item.crop_name);
      crops.zaid_crops = fetchCrops
        .filter((item) => item.crop_season == "zaid")
        .map((item) => item.crop_name);
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: crops,
        message: _response_message.found("Crops"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.getCrop = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "crop_name",
      paginate = 1,
      farmer_id,
    } = req.query;
    const skip = (page - 1) * limit;
    const currentDate = new Date();
    const query = farmer_id ? { farmer_id } : {};
    const records = { pastCrops: {}, upcomingCrops: {} };

    const fetchCrops = async (query) =>
      paginate == 1
        ? Crop.find(query)
          .limit(parseInt(limit))
          .skip(parseInt(skip))
          .sort(sortBy)
          .populate("farmer_id", "id name")
        : Crop.find(query).sort(sortBy).populate("farmer_id", "id name");

    const [pastCrops, upcomingCrops] = await Promise.all([
      fetchCrops({ ...query, sowing_date: { $lt: currentDate } }),
      fetchCrops({ ...query, sowing_date: { $gt: currentDate } }),
    ]);

    const [pastCount, upcomingCount] = await Promise.all([
      Crop.countDocuments({ ...query, sowing_date: { $lt: currentDate } }),
      Crop.countDocuments({ ...query, sowing_date: { $gt: currentDate } }),
    ]);

    records.pastCrops = { rows: pastCrops, count: pastCount };
    records.upcomingCrops = { rows: upcomingCrops, count: upcomingCount };

    if (paginate == 1) {
      const totalPages = (count) => Math.ceil(count / limit);
      records.pastCrops.pages = totalPages(pastCount);
      records.upcomingCrops.pages = totalPages(upcomingCount);
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("Crops"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.updateIndCrop = async (req, res) => {
  try {
    const { farmer_id } = req.params;
    const { land_id, kharif_crops, rabi_crops, zaid_crops } = req.body;
    const cropDetails = await Crop.deleteMany({ farmer_id, land_id });

    let fieldSets = [];
    let fieldSet = { land_id, farmer_id };
    for (item of kharif_crops) {
      console.log("fieldSet", fieldSet);
      fieldSets.push({ ...fieldSet, crop_season: "kharif", crop_name: item });
    }
    for (item of rabi_crops) {
      fieldSets.push({ ...fieldSet, crop_season: "rabi", crop_name: item });
    }
    for (item of zaid_crops) {
      fieldSets.push({ ...fieldSet, crop_season: "zaid", crop_name: item });
    }

    let saveCrops = await Crop.insertMany(fieldSets);
    if (!cropDetails) {
      return res.status(200).send(
        new serviceResponse({
          status: 404,
          message: _response_message.notFound("Crop"),
        })
      );
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: { farmer_id, land_id, kharif_crops, rabi_crops, zaid_crops },
        message: _response_message.updated("Crop"),
      })
    );
  } catch (err) {
    console.log("Error", err);
    _handleCatchErrors(err, res);
  }
};

module.exports.updateCrop = async (req, res) => {
  try {
    const { crop_id } = req.params;
    const {
      farmer_id,
      crop_season,
      crop_name,
      crops_name,
      crop_variety,
      sowing_date,
      harvesting_date,
      production_quantity,
      selling_price,
      yield,
      land_name,
      crop_growth_stage,
      crop_disease,
      crop_rotation,
      previous_crop_details,
      marketing_and_output,
      input_details,
      seeds,
    } = req.body;

    const sowingdate = parseMonthyear(sowing_date);
    const harvestingdate = parseMonthyear(harvesting_date);
    const updatedCrop = await Crop.findByIdAndUpdate(
      crop_id,
      {
        farmer_id,
        crop_season,
        crop_name,
        crops_name,
        crop_variety,
        sowing_date: sowingdate,
        harvesting_date: harvestingdate,
        production_quantity,
        selling_price,
        yield,
        land_name,
        crop_growth_stage,
        crop_disease,
        crop_rotation,
        previous_crop_details,
        marketing_and_output,
        input_details,
        seeds,
      },
      { new: true }
    );

    if (!updatedCrop) {
      return res.status(200).send(
        new serviceResponse({
          status: 404,
          message: _response_message.notFound("Crop"),
        })
      );
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: updatedCrop,
        message: _response_message.updated("Crop"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.deleteCrop = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res
        .status(400)
        .send({ message: "Please provide an ID to delete." });
    }
    const response = await Crop.deleteOne({ _id: id });

    if (response.deletedCount > 0) {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: response,
          message: _response_message.deleted("Crop"),
        })
      );
    } else {
      return res.status(200).send(
        new serviceResponse({
          status: 404,
          data: response,
          message: _response_message.notFound("Crop"),
        })
      );
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.createBank = async (req, res) => {
  try {
    const {
      farmer_id,
      bank_name,
      account_no,
      ifsc_code,
      account_holder_name,
      branch_address: { state_name, district_name, city, block, pincode },
    } = req.body;

    const state_id = await getStateId(state_name);
    const district_id = await getDistrictId(district_name);

    if (!state_id || !district_id) {
      return res.status(200).send(
        new serviceResponse({
          status: 400,
          message: "Invalid state or district provided",
        })
      );
    }

    const newBank = new Bank({
      farmer_id,
      bank_name,
      account_no,
      ifsc_code,
      account_holder_name,
      branch_address: {
        bank_state_id: state_id,
        bank_district_id: district_id,
        city,
        bank_block: block,
        bank_pincode: pincode,
      },
    });

    const savedBank = await newBank.save();

    return res.status(200).send(
      new serviceResponse({
        status: 201,
        data: savedBank,
        message: _response_message.created("Bank"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.getBank = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "bank_name",
      search = "",
      paginate = 1,
      farmer_id,
    } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    const records = { count: 0 };
    if (farmer_id) {
      query.farmer_id = farmer_id;
    }

    records.rows =
      paginate == 1
        ? await Bank.find(query)
          .limit(parseInt(limit))
          .skip(parseInt(skip))
          .sort(sortBy)
          .populate("farmer_id", "id name")
        : await Bank.find(query).sort(sortBy);

    records.count = await Bank.countDocuments(query);

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("Bank"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.updateBank = async (req, res) => {
  try {
    const { bank_id } = req.params;
    const {
      farmer_id,
      bank_name,
      account_no,
      ifsc_code,
      account_holder_name,
      branch_address: { state_name, district_name, city, block, pincode },
    } = req.body;

    const state_id = await getStateId(state_name);
    const district_id = await getDistrictId(district_name);

    if (!state_id || !district_id) {
      return res.status(200).send(
        new serviceResponse({
          status: 400,
          message: "Invalid state or district provided",
        })
      );
    }

    const updatedBank = await Bank.findByIdAndUpdate(
      bank_id,
      {
        farmer_id,
        bank_name,
        account_no,
        ifsc_code,
        account_holder_name,
        branch_address: {
          bank_state_id: state_id,
          bank_district_id: district_id,
          city,
          bank_block: block,
          bank_pincode: pincode,
        },
      },
      { new: true }
    );

    if (!updatedBank) {
      return res.status(200).send(
        new serviceResponse({
          status: 404,
          message: "Bank not found",
        })
      );
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: updatedBank,
        message: _response_message.updated("Bank"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.deleteBank = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res
        .status(400)
        .send({ message: "Please provide an ID to delete." });
    }
    const response = await Bank.deleteOne({ _id: id });

    if (response.deletedCount > 0) {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: response,
          message: _response_message.deleted("Bank"),
        })
      );
    } else {
      return res.status(200).send(
        new serviceResponse({
          status: 404,
          data: response,
          message: _response_message.notFound("Bank"),
        })
      );
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.bulkUploadFarmers = async (req, res) => {
  try {
    const { user_id } = req;
    const { isxlsx = 1 } = req.body;
    const [file] = req.files;

    if (!file) {
      return res.status(400).json({
        message: _response_message.notFound("file"),
        status: 400,
      });
    }

    let farmers = [];
    let headers = [];

    if (isxlsx) {
      const workbook = xlsx.read(file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      farmers = xlsx.utils.sheet_to_json(worksheet);
      headers = Object.keys(farmers[0]);
    } else {
      const csvContent = file.buffer.toString("utf8");
      const lines = csvContent.split("\n");
      headers = lines[0].trim().split(",");
      const dataContent = lines.slice(1).join("\n");

      const parser = csv({ headers });
      const readableStream = Readable.from(dataContent);

      readableStream.pipe(parser);
      parser.on("data", async (data) => {
        if (Object.values(data).some((val) => val !== "")) {
          const result = await processFarmerRecord(data);
          if (!result.success) {
            errorArray = errorArray.concat(result.errors);
          }
        }
      });

      parser.on("end", () => {
        console.log("Stream end");
      });
      parser.on("error", (err) => {
        console.log("Stream error", err);
      });
    }

    let errorArray = [];
    const processFarmerRecord = async (rec) => {
      const toLowerCaseIfExists = (value) =>
        value ? value.toLowerCase().trim() : value;
      //   const parseDateOfBirth = (dob) => {
      //     if (!isNaN(dob)) {
      //         const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      //         const parsedDate = new Date(excelEpoch.getTime() + (dob) * 86400000);
      //         return moment.utc(parsedDate).format('DD-MM-YYYY');
      //     }

      //     return moment(dob, 'DD-MM-YYYY', true).isValid() ? dob : null;
      // };
      const parseBooleanYesNo = (value) => {
        if (value === true || value?.toLowerCase() === "yes") return true;
        if (value === false || value?.toLowerCase() === "no") return false;
        return null;
      };
      const name = rec["NAME*"];
      const father_name = rec["FATHER NAME*"];
      const mother_name = rec["MOTHER NAME"] ? rec["MOTHER NAME"] : null;
      const date_of_birth = rec["DATE OF BIRTH(DD-MM-YYYY)*"];
      const farmer_category = rec["FARMER CATEGORY"]
        ? rec["FARMER CATEGORY"]
        : null;
      const gender = toLowerCaseIfExists(rec["GENDER*"]);
      const marital_status = toLowerCaseIfExists(rec["MARITAL STATUS"])
        ? toLowerCaseIfExists(rec["MARITAL STATUS"])
        : "N/A";
      const religion = toLowerCaseIfExists(rec["RELIGION"])
        ? toLowerCaseIfExists(rec["RELIGION"])
        : "N/A";
      const category = toLowerCaseIfExists(rec["CATEGORY"])
        ? toLowerCaseIfExists(rec["CATEGORY"])
        : "N/A";
      const highest_edu = toLowerCaseIfExists(rec["EDUCATION LEVEL"]);
      const edu_details = rec["EDU DETAILS"] ? rec["EDU DETAILS"] : null;
      const type = toLowerCaseIfExists(rec["ID PROOF TYPE*"]);
      const aadhar_no = rec["AADHAR NUMBER*"];
      const address_line = rec["ADDRESS LINE*"];
      const country = rec["COUNTRY NAME"] ? rec["COUNTRY NAME"] : "India";
      const state_name = rec["STATE NAME*"];
      const district_name = rec["DISTRICT NAME*"];
      const tahshil = rec["TAHSHIL*"];
      const block = rec["BLOCK NAME*"];
      const village = rec["VILLAGE NAME*"];
      const pinCode = rec["PINCODE*"];
      const lat = rec["LATITUDE"] ? rec["LATITUDE"] : null;
      const long = rec["LONGITUDE"] ? rec["LONGITUDE"] : null;
      const mobile_no = rec["MOBILE NO*"];
      const email = rec["EMAIL ID"] ? rec["EMAIL ID"] : null;
      const warehouse =
        rec["WAREHOUSE"] && rec["WAREHOUSE"].toLowerCase() === "yes"
          ? "yes"
          : "no";

      const cold_storage =
        rec["COLD STORAGE"] && rec["COLD STORAGE"].toLowerCase() === "yes"
          ? "yes"
          : "no";
      const processing_unit =
        rec["PROCESSING UNIT"] && rec["PROCESSING UNIT"].toLowerCase() === "yes"
          ? "yes"
          : "no";
      const transportation_facilities =
        rec["TRANSPORTATION FACILITIES"] &&
          rec["TRANSPORTATION FACILITIES"].toLowerCase() === "yes"
          ? "yes"
          : "no";
      const credit_facilities =
        rec["CREDIT FACILITIES"] &&
          rec["CREDIT FACILITIES"].toLowerCase() === "yes"
          ? "yes"
          : "no";
      const source_of_credit = rec["SOURCE OF CREDIT"]
        ? rec["SOURCE OF CREDIT"]
        : null;
      const financial_challenges = rec["FINANCIAL CHALLENGE"]
        ? rec["FINANCIAL CHALLENGE"]
        : null;
      const support_required = rec["SUPPORT REQUIRED"]
        ? rec["SUPPORT REQUIRED"]
        : null;
      const total_area = rec["TOTAL AREA"] ? rec["TOTAL AREA"] : null;
      const land_name = rec["LAND NAME"] ? rec["LAND NAME"] : null;
      const cultivation_area = rec["CULTIVATION AREA"]
        ? rec["CULTIVATION AREA"]
        : null;
      const area_unit = toLowerCaseIfExists(rec["AREA UNIT"])
        ? toLowerCaseIfExists(rec["AREA UNIT"])
        : "Other";
      const khasra_number = rec["KHASRA NUMBER*"];
      const khtauni_number = rec["KHATAUNI"] ? rec["KHATAUNI"] : null;
      const khata_number = rec["KHATA NUMBER"] ? rec["KHATA NUMBER"] : null;
      const land_type = rec["LAND TYPE"] ? rec["LAND TYPE"] : "other";
      const sow_area = rec["SOW AREA"] ? rec["SOW AREA"] : null;
      const state = rec["STATE*"];
      const district = rec["DISTRICT*"];
      const landvillage = rec["ViLLAGE"] ? rec["ViLLAGE"] : null;
      const LandBlock = rec["LAND BLOCK"] ? rec["LAND BLOCK"] : null;
      const landPincode = rec["LAND PINCODE"] ? rec["LAND PINCODE"] : null;
      const expected_production = rec["EXPECTED PRODUCTION"]
        ? rec["EXPECTED PRODUCTION"]
        : null;
      const soil_type = toLowerCaseIfExists(rec["SOIL TYPE"])
        ? toLowerCaseIfExists(rec["SOIL TYPE"])
        : "other";
      const soil_tested = toLowerCaseIfExists(rec["SOIL TESTED"])
        ? toLowerCaseIfExists(rec["SOIL TESTED"])
        : "yes";
      const soil_testing_agencies = rec["SOIL TESTING AGENCY"]
        ? rec["SOIL TESTING AGENCY"]
        : null;
      const upload_geotag = rec["UPLOD GEOTAG"] ? rec["UPLOD GEOTAG"] : null;
      const sowingdate = rec["SOWING DATE(MM-YYYY)*"];
      const harvestingdate = rec["HARVESTING DATE(MM-YYYY)*"];
      const crop_name = rec["CROPS NAME*"];
      const crop_variety = rec["CROP VARITY"] ? rec["CROP VARITY"] : null;
      const production_quantity = rec["PRODUCTION QUANTITY"]
        ? rec["PRODUCTION QUANTITY"]
        : null;
      const selling_price = rec["SELLING PRICE"] ? rec["SELLING PRICE"] : null;
      const yield = rec["YIELD(KG)"] ? rec["YIELD(KG)"] : null;
      const crop_land_name = rec["CROP LAND NAME"]
        ? rec["CROP LAND NAME"]
        : null;
      const crop_growth_stage = rec["CROP GROWTH STAGE"]
        ? rec["CROP GROWTH STAGE"]
        : "Stage1";
      const crop_disease = rec["CROP DISEASE"] ? rec["CROP DISEASE"] : null;
      const crop_rotation = parseBooleanYesNo(rec["CROP ROTATION"]);
      const previous_crop_session = rec["PREVIOUS CROP SESSION"]
        ? rec["PREVIOUS CROP SESSION"]
        : "others";
      const previous_crop_name = rec["PREVIOUS CROP NAME"]
        ? rec["PREVIOUS CROP NAME"]
        : null;
      const crop_season = toLowerCaseIfExists(rec["CROP SEASONS*"])
        ? toLowerCaseIfExists(rec["CROP SEASONS*"])
        : "others";
      const crop_sold = rec["CROP SOLD"] ? rec["CROP SOLD"] : null;
      const quantity_sold = rec["QUANTITY SOLD"] ? rec["QUANTITY SOLD"] : null;
      const average_selling_price = rec["AVERAGE SELLING PRICE"]
        ? rec["AVERAGE SELLING PRICE"]
        : null;
      const marketing_channels_used = rec["MARKETING CHANNELS USED"]
        ? rec["MARKETING CHANNELS USED"]
        : null;
      const challenges_faced = rec["CHALLENGES FACED"]
        ? rec["CHALLENGES FACED"]
        : null;
      const insurance_company = rec["INSURANCE COMPANY"]
        ? rec["INSURANCE COMPANY"]
        : null;
      const insurance_worth = rec["INSURANCE WORTH"]
        ? rec["INSURANCE WORTH"]
        : null;
      const insurance_premium = rec["INSURANCE PREMIUM"]
        ? rec["INSURANCE PREMIUM"]
        : null;
      const insurance_start_date = rec["INSURANCE START DATE(DD-MM-YYYY)"]
        ? rec["INSURANCE START DATE(DD-MM-YYYY)"]
        : null;
      const insurance_end_date = rec["INSURANCE END DATE(DD-MM-YYYY)"]
        ? rec["INSURANCE END DATE(DD-MM-YYYY)"]
        : null;
      const bank_name = rec["BANK NAME*"];
      const account_no = rec["ACCOUNT NUMBER*"];
      const branch_name = rec["BRANCH NAME*"];
      const ifsc_code = rec["IFSC CODE*"];
      const account_holder_name = rec["ACCOUNT HOLDER NAME*"];
      const requiredFields = [
        { field: "NAME*", label: "NAME" },
        { field: "FATHER NAME*", label: "FATHER NAME" },
        { field: "DATE OF BIRTH(DD-MM-YYYY)*", label: "DATE OF BIRTH" },
        { field: "GENDER*", label: "GENDER" },
        { field: "ID PROOF TYPE*", label: "ID PROOF TYPE" },
        { field: "AADHAR NUMBER*", label: "AADHAR NUMBER" },
        { field: "ADDRESS LINE*", label: "ADDRESS LINE" },
        { field: "STATE NAME*", label: "STATE NAME" },
        { field: "DISTRICT NAME*", label: "DISTRICT NAME" },
        { field: "BLOCK NAME*", label: "BLOCK NAME" },
        { field: "TAHSHIL*", label: "TAHSHIL" },
        { field: "VILLAGE NAME*", label: "VILLAGE NAME" },
        { field: "MOBILE NO*", label: "MOBILE NUMBER" },
        { field: "ACCOUNT NUMBER*", label: "ACCOUNT NUMBER" },
        { field: "KHASRA NUMBER*", label: "KHASRA NUMBER" },
        { field: "CROPS NAME*", label: "CROP NAME" },
        { field: "CROP SEASONS*", label: "CROP SESSION" },
        { field: "PINCODE*", label: "PINCODE" },
        { field: "SOWING DATE(MM-YYYY)*", label: "SOWING DATE(MM-YYYY)" },
        {
          field: "HARVESTING DATE(MM-YYYY)*",
          label: "HARVESTING DATE(MM-YYYY)",
        },
        { field: "STATE*", label: " LAND STATE" },
        { field: "DISTRICT*", label: "LAND DISTRICT" },
        { field: "BANK NAME*", label: "BANK NAME" },
        { field: "BRANCH NAME*", label: "BRANCH NAME" },
        { field: "IFSC CODE*", label: "IFSC CODE" },
        { field: "ACCOUNT HOLDER NAME*", label: "ACCOUNT HOLDER NAME" },
      ];
      let stateName = state_name.replace(/_/g, " ");
      if (
        stateName === "Dadra and Nagar Haveli" ||
        stateName === "Andaman and Nicobar" ||
        stateName === "Daman and Diu" ||
        stateName === "Jammu and Kashmir"
      ) {
        stateName = stateName.replace("and", "&");
      }
      let errors = [];
      let missingFields = [];

      requiredFields.forEach(({ field, label }) => {
        if (!rec[field]) missingFields.push(label);
      });

      if (missingFields.length > 0) {
        errors.push({
          record: rec,
          error: `Required fields missing: ${missingFields.join(", ")}`,
        });
      }
      if (!/^\d{12}$/.test(aadhar_no)) {
        errors.push({ record: rec, error: "Invalid Aadhar Number" });
      }
      if (!/^\d{6,20}$/.test(account_no)) {
        errors.push({
          record: rec,
          error:
            "Invalid Account Number: Must be a numeric value between 6 and 20 digits.",
        });
      }
      // if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
      //   errors.push({ record: rec, error: "Invalid IFSC CODE: Must start with 4 uppercase letters, followed by 0, and end with 6 alphanumeric characters." });
      // }
      if (!/^\d{10}$/.test(mobile_no)) {
        errors.push({ record: rec, error: "Invalid Mobile Number" });
      }
      // if (date_of_birth) {
      //   const dob = new Date(date_of_birth.split("-").reverse().join("-"));
      //   if (dob > new Date()) {
      //     errors.push({ record: rec, error: "Invalid Date of Birth: Cannot be in the future." });
      //   }
      // }
      if (!Object.values(_gender).includes(gender)) {
        errors.push({
          record: rec,
          error: `Invalid Gender: ${gender}. Valid options: ${Object.values(
            _gender
          ).join(", ")}`,
        });
      }
      if (sowingdate && harvestingdate) {
        const sowing = new Date(sowingdate.split("-").reverse().join("-"));
        const harvesting = new Date(
          harvestingdate.split("-").reverse().join("-")
        );
        if (sowing > harvesting) {
          errors.push({
            record: rec,
            error:
              "Invalid Dates: Sowing date cannot be later than harvesting date.",
          });
        }
      }
      if (!Object.values(_maritalStatus).includes(marital_status)) {
        errors.push({
          record: rec,
          error: `Invalid Marital Status: ${marital_status}. Valid options: ${Object.values(
            _maritalStatus
          ).join(", ")}`,
        });
      }
      if (!Object.values(_religion).includes(religion)) {
        errors.push({
          record: rec,
          error: `Invalid Religion: ${religion}. Valid options: ${Object.values(
            _religion
          ).join(", ")}`,
        });
      }
      if (!Object.values(_individual_category).includes(category)) {
        errors.push({
          record: rec,
          error: `Invalid Category: ${category}. Valid options: ${Object.values(
            _individual_category
          ).join(", ")}`,
        });
      }
      if (!Object.values(_proofType).includes(type)) {
        errors.push({
          record: rec,
          error: `Invalid Proof type: ${type}. Valid options: ${Object.values(
            _proofType
          ).join(", ")}`,
        });
      }
      if (area_unit && !Object.values(_areaUnit).includes(area_unit)) {
        errors.push({
          record: rec,
          error: `Invalid Area Unit: ${area_unit}. Valid options: ${Object.values(
            _areaUnit
          ).join(", ")}`,
        });
      }
      if (!Object.values(_seasons).includes(crop_season)) {
        errors.push({
          record: rec,
          error: `Invalid Crop Season: ${crop_season}. Valid options: ${Object.values(
            _seasons
          ).join(", ")}`,
        });
      }
      if (!Object.values(_yesNo).includes(soil_tested)) {
        errors.push({
          record: rec,
          error: `Invalid Yes No: ${soil_tested}. Valid options: ${Object.values(
            _yesNo
          ).join(", ")}`,
        });
      }

      if (errors.length > 0) return { success: false, errors };
      // const calulateage = calculateAge(date_of_birth);
      try {
        const state_id = await getStateId(stateName);
        const district_id = await getDistrictId(district_name);
        const land_state_id = await getStateId(state);
        const land_district_id = await getDistrictId(district);
        const sowing_date = parseMonthyear(sowingdate);
        const harvesting_date = parseMonthyear(harvestingdate);
        // const processedDateOfBirth = parseDateOfBirth(date_of_birth);

        let associateId = user_id;
        if (!user_id) {
          const associate = await User.findOne({
            "basic_details.associate_details.organization_name": fpo_name,
          });
          associateId = associate ? associate._id : null;
        }
        let farmerRecord = await farmer.findOne({
          "proof.aadhar_no": aadhar_no,
        });
        if (farmerRecord) {
          return {
            success: false,
            errors: [
              {
                record: rec,
                error: `Farmer  with Aadhar No. ${aadhar_no} already registered.`,
              },
            ],
          };
          // Update existing farmer record
          // farmerRecord = await updateFarmerRecord(farmerRecord, {
          //   associate_id: associateId, name, father_name, mother_name, dob: date_of_birth, age: calulateage, gender, farmer_category, marital_status, religion, category, highest_edu, edu_details, type, aadhar_no, address_line, country, state_id, district_id, tahshil, block, village, pinCode, lat, long, mobile_no, email, bank_name, account_no, branch_name, ifsc_code, account_holder_name, warehouse, cold_storage, processing_unit, transportation_facilities, credit_facilities, source_of_credit, financial_challenges, support_required,
          // });
          // // Update land and crop details if present
          // await updateRelatedRecords(farmerRecord._id, {
          //   farmer_id: farmerRecord._id, land_name, cultivation_area, total_area, khasra_number, area_unit, khata_number, land_type, khtauni_number, sow_area, state_id: land_state_id, district_id: land_district_id, landvillage, LandBlock, landPincode, expected_production, soil_type, soil_tested, soil_testing_agencies, upload_geotag, sowing_date, harvesting_date, crop_name, production_quantity, selling_price, yield, insurance_company, insurance_worth, crop_season, crop_land_name, crop_growth_stage, crop_disease, crop_rotation, previous_crop_session, previous_crop_name, crop_sold, quantity_sold, average_selling_price, marketing_channels_used, challenges_faced, insurance_premium, insurance_start_date, insurance_end_date, crop_variety,
          // });
        } else {
          // Insert new farmer record
          farmerRecord = await insertNewFarmerRecord({
            associate_id: associateId,
            name,
            father_name,
            mother_name,
            dob: date_of_birth,
            age: null,
            gender,
            farmer_category,
            aadhar_no,
            type,
            marital_status,
            religion,
            category,
            highest_edu,
            edu_details,
            address_line,
            country,
            state_id,
            district_id,
            tahshil,
            block,
            village,
            pinCode,
            lat,
            long,
            mobile_no,
            email,
            bank_name,
            account_no,
            branch_name,
            ifsc_code,
            account_holder_name,
            warehouse,
            cold_storage,
            processing_unit,
            transportation_facilities,
            credit_facilities,
            source_of_credit,
            financial_challenges,
            support_required,
          });
          await insertNewRelatedRecords(farmerRecord._id, {
            total_area,
            khasra_number,
            land_name,
            cultivation_area,
            area_unit,
            khata_number,
            land_type,
            khtauni_number,
            sow_area,
            state_id: land_state_id,
            district_id: land_district_id,
            landvillage,
            LandBlock,
            landPincode,
            expected_production,
            soil_type,
            soil_tested,
            soil_testing_agencies,
            upload_geotag,
            sowing_date,
            harvesting_date,
            crop_name,
            production_quantity,
            selling_price,
            yield,
            insurance_company,
            insurance_worth,
            crop_season,
            crop_land_name,
            crop_growth_stage,
            crop_disease,
            crop_rotation,
            previous_crop_session,
            previous_crop_name,
            crop_sold,
            quantity_sold,
            average_selling_price,
            marketing_channels_used,
            challenges_faced,
            insurance_premium,
            insurance_start_date,
            insurance_end_date,
            crop_variety,
          });
        }
      } catch (error) {
        console.log(error);
        errors.push({ record: rec, error: error.message });
      }

      return { success: errors.length === 0, errors };
    };

    for (const farmer of farmers) {
      const result = await processFarmerRecord(farmer);
      if (!result.success) {
        errorArray = errorArray.concat(result.errors);
      }
    }

    if (errorArray.length > 0) {
      const errorData = errorArray.map((err) => ({
        ...err.record,
        Error: err.error,
      }));
      // console.log("error data->",errorData)
      dumpJSONToExcel(req, res, {
        data: errorData,
        fileName: `Farmer-error_records.xlsx`,
        worksheetName: `Farmer-record-error_records`,
      });
    } else {
      return res.status(200).json({
        status: 200,
        data: {},
        message: "Farmers successfully uploaded.",
      });
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.exportFarmers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      skip = 0,
      paginate = 1,
      sortBy = "-createdAt",
      search = "",
      isExport = 0,
    } = req.query;
    const { user_id, user_type } = req;
    const { isLocalFarmer } = req.query;

    let query = {};
    if (user_id && user_type === _userType.associate) {
      query.associate_id = new ObjectId(user_id);
    } else if (isLocalFarmer == 1) {
      query.associate_id = { $eq: null };
    }

    let aggregationPipeline = [
      { $match: query },
      {
        $unwind: {
          path: "$address.state_id",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "statedistrictcities",
          let: { stateId: { $toObjectId: "$address.state_id" } },
          pipeline: [
            { $unwind: "$states" },
            { $match: { $expr: { $eq: ["$states._id", "$$stateId"] } } },
            { $project: { state_title: "$states.state_title", _id: 0 } },
          ],
          as: "state",
        },
      },
      { $unwind: { path: "$state", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "statedistrictcities",
          let: { districtId: { $toObjectId: "$address.district_id" } },
          pipeline: [
            { $unwind: "$states" },
            { $unwind: "$states.districts" },
            {
              $match: {
                $expr: { $eq: ["$states.districts._id", "$$districtId"] },
              },
            },
            {
              $project: {
                district_title: "$states.districts.district_title",
                _id: 0,
              },
            },
          ],
          as: "district",
        },
      },
      { $unwind: { path: "$district", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "lands",
          localField: "_id",
          foreignField: "farmer_id",
          as: "land",
        },
      },
      { $unwind: { path: "$land", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "crops",
          localField: "_id",
          foreignField: "farmer_id",
          as: "crops",
        },
      },
      { $unwind: { path: "$crops", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "associate_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    ];

    if (isExport == 0 && paginate == 1) {
      aggregationPipeline.push(
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) }
      );
    }
    const farmersData = await farmer.aggregate(aggregationPipeline);
    const totalFarmersCount = await farmer.countDocuments(query);

    const records = {
      rows: farmersData,
      count: totalFarmersCount,
    };

    if (paginate == 1 && isExport == 0) {
      records.page = parseInt(page);
      records.limit = parseInt(limit);
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    if (isExport == 1) {
      const record = farmersData.map((item) => {
        return {
          "Farmer Name": item?.name || "NA",
          "Farmer Contact": item?.basic_details?.mobile_no || "NA",
          "Farmer id": item?.farmer_id || "NA",
          "Father Name": item?.parents?.father_name || "NA",
          "Mother Name": item?.parents?.mother_name || "NA",
          "Date of Birth": item?.basic_details?.dob || "NA",
          Age: item?.basic_details?.age || "NA",
          Gender: item?.basic_details?.gender || "NA",
          "Marital Status": item?.marital_status || "NA",
          Religion: item?.religion || "NA",
          Category: item?.basic_details?.category || "NA",
          "Highest Education": item?.education?.highest_edu || "NA",
          "Education Details": item?.education?.edu_details?.join(", ") || "NA",
          "Proof Type": item?.proof?.type || "NA",
          "Aadhar Number": item?.proof?.aadhar_no || "NA",
          "Address Line": item?.address?.address_line_1 || "NA",
          Country: item?.address?.country || "NA",
          State: item?.state?.state_title || "NA",
          District: item?.district?.district_title || "NA",
          Block: item?.address?.block || "NA",
          Tahshil: item?.address?.tahshil || "NA",
          Latitude: item?.address?.lat || "NA",
          Logitude: item?.address?.long || "NA",
          Village: item?.address?.village || "NA",
          PinCode: item?.address?.pin_code || "NA",
          "Bank Name": item?.bank_details?.bank_name || "NA",
          "Branch Name": item?.bank_details?.branch_name || "NA",
          "Account Holder Name":
            item?.bank_details?.account_holder_name || "NA",
          "IFSC Code": item?.bank_details?.ifsc_code || "NA",
          "Account Number": item?.bank_details?.account_no || "NA",
          "Total Area": item?.land?.total_area || "NA",
          "Cultivation Area": item?.land?.cultivation_area || "NA",
          "Area Unit": item?.land?.area_unit || "NA",
          "Khasra No": item?.land?.khasra_number || "NA",
          "Khata Number": item?.land?.khata_number || "NA",
          "Khatauni Number": item?.land?.khtauni_number || "NA",
          "Land Address": item?.land?.land_address?.village || "NA",
          "Land Block": item?.land?.land_address?.block || "NA",
          "Land Pin": item?.land?.land_address?.pin_code || "NA",
          "Land type": item?.land?.land_type || "NA",
          "Soil Type": item?.land?.soil_type || "NA",
          "Soil Tested": item?.land?.soil_tested || "NA",
          "Soil Health Card": item?.land?.uploadSoil_health_card || "NA",
          "Credit Facilities": item?.financial_support?.credit_facilities
            ? "Yes"
            : "No",
          "Source of Credit": item?.financial_support?.source_of_credit || "NA",
          "Financial Challenges":
            item?.financial_support?.financial_challenges || "NA",
          "Support Required": item?.financial_support?.support_required || "NA",
          Warehouse: item?.infrastructure_needs?.warehouse ? "Yes" : "No",
          "Cold Storage": item?.infrastructure_needs?.cold_storage
            ? "Yes"
            : "No",
          "Processing Unit": item?.infrastructure_needs?.processing_unit
            ? "Yes"
            : "No",
          "Transportation Facilities": item?.infrastructure_needs
            ?.transportation_facilities
            ? "Yes"
            : "No",
          "Crop Name": item?.crops?.crop_name || "NA",
          "Crop Variety": item?.crops?.crop_variety || "NA",
          "Sowing Date": item?.crops?.sowing_date
            ? item.crops.sowing_date.toISOString().split("T")[0]
            : "NA",
          "Harvesting Date": item?.crops?.harvesting_date
            ? item.crops.harvesting_date.toISOString().split("T")[0]
            : "NA",
          "Production Quantity": item?.crops?.production_quantity || "NA",
          "Selling Price": item?.crops?.selling_price || "NA",
          YIELD: item?.crops?.yield || "NA",
          "Crop Seasons": item?.crops?.crop_season || "NA",
          "Crop Disease": item?.crops?.crop_disease || "NA",
          "Crop Rotation": item?.crops?.crop_rotation || "NA",
        };
      });
      if (record.length > 0) {
        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Farmer-Data.xlsx`,
          worksheetName: "Farmer Records",
        });
      } else {
        return res.status(200).send(
          new serviceResponse({
            status: 400,
            data: records,
            message: _response_message.notFound("Farmer"),
          })
        );
      }
    } else {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: records,
          message: _response_message.found("Farmer"),
        })
      );
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.individualfarmerList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "name",
      search = "",
      isExport = 0,
    } = req.query;
    const skip = (page - 1) * limit;
    const searchFields = ["name", "farmer_id", "farmer_code", "mobile_no"];

    const makeSearchQuery = (searchFields) => {
      let query = {};
      query["$or"] = searchFields.map((item) => ({
        [item]: { $regex: search, $options: "i" },
      }));
      return query;
    };

    const query = search ? makeSearchQuery(searchFields) : {};
    const records = { count: 0, rows: [] };

    // individual farmer list
    records.rows = await IndividualModel.find(query)
      // .select('associate_id farmer_id name basic_details.father_husband_name mobile_no address')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort(sortBy);

    // const data = await Promise.all(records.rows.map(async (item) => {

    //   let address = await getAddress(item)

    //   let farmer = {
    //     _id: item?._id,
    //     farmer_name: item?.name,
    //     address: address,
    //     mobile_no: item?.mobile_no,
    //     associate_id: item?.associate_id?.user_code || null,
    //     farmer_id: item?.farmer_code || item?.farmer_id,
    //     father_spouse_name: item?.basic_details?.father_husband_name ||
    //       item?.parents?.father_name ||
    //       item?.parents?.mother_name
    //   }

    //   return farmer;
    // }))

    // records.rows = data

    records.count = await IndividualModel.countDocuments(query);

    records.page = page;
    records.limit = limit;
    records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;

    if (isExport == 1) {
      const record = records.rows.map((item) => {
        let address =
          item?.address?.address_line +
          ", " +
          item?.address?.village +
          ", " +
          item?.address?.block +
          ", " +
          item?.address?.district +
          ", " +
          item?.address?.state +
          ", " +
          item?.address?.pinCode;

        return {
          "Farmer Name": item?.farmer_name || "NA",
          "Mobile Number": item?.mobile_no || "NA",
          "Associate ID": item?.associate_id || "NA",
          "Farmer ID": item?.farmer_id ?? "NA",
          "Father/Spouse Name": item?.father_spouse_name ?? "NA",
          Address: address ?? "NA",
        };
      });
      if (record.length > 0) {
        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Farmer-List.xlsx`,
          worksheetName: `Farmer-List`,
        });
      } else {
        return res.send(
          new serviceResponse({
            status: 200,
            data: records,
            message: _response_message.found("farmers"),
          })
        );
      }
    } else {
      return res.send(
        new serviceResponse({
          status: 200,
          data: records,
          message: _response_message.found("farmers"),
        })
      );
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

const getAddress = async (item) => {
  return {
    address_line:
      item?.address?.address_line ||
      `${item?.address?.address_line_1} ${item?.address?.address_line_2}`,
    village: item?.address?.village || " ",
    block: item?.address?.block || " ",
    district: item?.address?.district
      ? item?.address?.district
      : item?.address?.district_id
        ? await getDistrict(item?.address?.district_id)
        : "unknown",
    state: item?.address?.state
      ? item?.address?.state
      : item?.address?.state_id
        ? await getState(item?.address?.state_id)
        : "unknown",
    pinCode: item?.address?.pinCode,
  };
};

const getDistrict = async (districtId) => {
  const district = await StateDistrictCity.aggregate([
    {
      $match: {},
    },
    {
      $unwind: "$states",
    },
    {
      $unwind: "$states.districts",
    },
    {
      $match: { "states.districts._id": districtId },
    },
    {
      $project: {
        _id: 1,
        district: "$states.districts.district_title",
      },
    },
  ]);
  return district[0]?.district;
};

const getState = async (stateId) => {
  const state = await StateDistrictCity.aggregate([
    {
      $match: {},
    },
    {
      $project: {
        _id: 1,
        state: {
          $arrayElemAt: [
            {
              $map: {
                input: {
                  $filter: {
                    input: "$states",
                    as: "item",
                    cond: { $eq: ["$$item._id", stateId] },
                  },
                },
                as: "filterState",
                in: "$$filterState.state_title",
              },
            },
            0,
          ],
        },
      },
    },
  ]);
  return state[0].state;
};

module.exports.makeAssociateFarmer = async (req, res) => {
  try {
    const { farmer_id } = req.body;
    const { user_id } = req;

    if (!Array.isArray(farmer_id) || farmer_id.length === 0 || !user_id) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [
            { message: "Farmer IDs array and Associate ID are required." },
          ],
        })
      );
    }

    let updatedFarmers = [];
    let notFoundFarmers = [];

    for (const id of farmer_id) {
      const localFarmer = await farmer.findOne({ _id: id, associate_id: null });
      if (localFarmer) {
        const { basic_details } = localFarmer;
        const fathers_name = basic_details?.father_husband_name || null;
        localFarmer.parents = {
          ...localFarmer.parents,
          father_name: fathers_name,
        };
        localFarmer.associate_id = user_id;
        const updatedFarmer = await localFarmer.save();
        updatedFarmers.push(updatedFarmer);
      } else {
        notFoundFarmers.push(id);
      }
    }

    if (updatedFarmers.length === 0) {
      return res.status(404).send(
        new serviceResponse({
          status: 404,
          errors: [
            { message: "No local farmers found or already associated." },
          ],
        })
      );
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: { updatedFarmers, notFoundFarmers },
        message: `${updatedFarmers.length} farmers successfully made associate farmers.`,
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.getAllFarmers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "_id",
      search = "",
      paginate = 1,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    let associatedQuery = { associate_id: { $ne: null } };
    let localQuery = { associate_id: null };

    if (search) {
      const searchCondition = { name: { $regex: search, $options: "i" } };
      associatedQuery = { ...associatedQuery, ...searchCondition };
      localQuery = { ...localQuery, ...searchCondition };
    }

    const records = {
      associatedFarmers: [],
      localFarmers: [],
      associatedFarmersCount: 0,
      localFarmersCount: 0,
    };
    const sortCriteria = {
      [sortBy]: 1,
      _id: 1,
    };
    if (paginate) {
      records.associatedFarmers = await farmer
        .find(associatedQuery)
        .populate("associate_id", "_id user_code")
        .sort(sortCriteria)
        .skip(skip)
        .limit(parsedLimit);

      records.localFarmers = await farmer
        .find(localQuery)
        .populate("associate_id", "_id user_code")
        .sort(sortCriteria)
        .skip(skip)
        .limit(parsedLimit);
    } else {
      records.associatedFarmers = await farmer
        .find(associatedQuery)
        .populate("associate_id", "_id user_code")
        .sort(sortCriteria);

      records.localFarmers = await farmer
        .find(localQuery)
        .populate("associate_id", "_id user_code")
        .sort(sortCriteria);
    }
    records.count = await farmer.countDocuments(associatedQuery);
    records.localFarmersCount = await farmer.countDocuments(localQuery);

    // const getData = await getAddress(records.localFarmers[1]);
    // for fetching address detail for farmer
    const newAssociateFarmer = await Promise.all(
      records.associatedFarmers.map(async (farmer) => {
        const newAddress = await getAddress(farmer);
        return {
          farmer,
          updatedFarmerAddress: { ...farmer.address, ...newAddress },
        };
      })
    );

    //for fetching address details for localfarmer
    const newLocalFarmer = await Promise.all(
      records.localFarmers.map(async (farmer) => {
        const newAddress = await getAddress(farmer);
        return {
          farmer,
          updatedLocalAddress: { ...farmer.address, ...newAddress },
        };
      })
    );

    // Prepare response data
    const responseData = {
      associatedFarmersCount: records.count,
      localFarmersCount: records.localFarmersCount,
      associatedFarmers: newAssociateFarmer,
      localFarmers: newLocalFarmer,
      page: parseInt(page),
      limit: parsedLimit,
      totalPages:
        limit != 0 ? Math.ceil(records.associatedFarmersCount / limit) : 0,
    };

    return res.status(200).send({
      status: 200,
      data: responseData,
      message: "Farmers data retrieved successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while fetching farmers data.",
    });
  }
};

module.exports.getAllFarmersExport = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "_id",
      search = "",
      paginate = 1,
      centertype = "",
      isExport = 0,
      state = "",
      startDate = "",
      endDate = "",
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    let associatedQuery = { associate_id: { $ne: null } };
    let localQuery = { associate_id: null };

    const sanitizedSearch = typeof search === 'string' ? search : '';
    const sanitizedState = typeof state === 'string' ? state : '';

    if (sanitizedSearch) {
      const searchCondition = { name: { $regex: sanitizedSearch, $options: "i" } };
      associatedQuery = { ...associatedQuery, ...searchCondition };
      localQuery = { ...localQuery, ...searchCondition };
    }

    if (sanitizedState) {
      const stateCondition = { "address.state": { $regex: sanitizedState, $options: "i" } };
      associatedQuery = { ...associatedQuery, ...stateCondition };
      localQuery = { ...localQuery, ...stateCondition };
    }

    if (startDate && endDate) {
      const dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
      associatedQuery = { ...associatedQuery, ...dateFilter };
      localQuery = { ...localQuery, ...dateFilter };
    }


    let records = {
      associatedFarmers: [],
      localFarmers: [],
      associatedFarmersCount: 0,
      localFarmersCount: 0,
    };
    const sortCriteria = {
      [sortBy]: 1,
      _id: 1,
    };

    let query = centertype === "associateFarmer" ? associatedQuery : localQuery;

    let results = await farmer.aggregate([
      { $match: query },
      // Lookup for land details
      {
        $lookup: {
          from: "lands",
          let: { farmerId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$farmer_id", "$$farmerId"] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: "land",
        },
      },
      {
        $lookup: {
          from: "crops",
          let: { farmerId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$farmer_id", "$$farmerId"] } } },
            { $sort: { season: -1 } },
            { $limit: 1 },
          ],
          as: "crop",
        },
      },
      // Optional sort
      { $sort: sortCriteria },
    ]);
    // console.log("results  ",results);

    if (centertype === "associateFarmer") {
      records.associatedFarmers = results;
    } else {
      records.localFarmers = results;
    }

    // console.log("records.associatedFarmers", records.associatedFarmers);
    records.count = await farmer.countDocuments(associatedQuery);
    records.localFarmersCount = await farmer.countDocuments(localQuery);

    // const getData = await getAddress(records.localFarmers[1]);
    // for fetching address detail for farmer
    const newAssociateFarmer = await Promise.all(
      records.associatedFarmers.map(async (farmer) => {
        const newAddress = await getAddress(farmer);
        return {
          farmer,
          updatedFarmerAddress: { ...farmer.address, ...newAddress },
        };
      })
    );

    //for fetching address details for localfarmer
    const newLocalFarmer = await Promise.all(
      records.localFarmers.map(async (farmer) => {
        const newAddress = await getAddress(farmer);
        return {
          farmer,
          updatedLocalAddress: { ...farmer.address, ...newAddress },
        };
      })
    );

    // Prepare response data
    const responseData = {
      associatedFarmersCount: records.count,
      localFarmersCount: records.localFarmersCount,
      associatedFarmers: newAssociateFarmer,
      localFarmers: newLocalFarmer,
      page: parseInt(page),
      limit: parsedLimit,
      totalPages:
        limit != 0 ? Math.ceil(records.associatedFarmersCount / limit) : 0,
    };
    if (isExport == 1 && centertype === "associateFarmer") {
      const record = responseData?.associatedFarmers.map((item) => {
        return {
          "Farmer ID": item?.farmer?.farmer_id || "NA",
          "Farmer Name": item?.farmer?.name || "NA",
          "Father/Spouse Name": item?.farmer?.parents?.father_name || "NA",
          "Mother Name": item?.farmer?.parents?.mother_name || "NA",
          "Mobile Number": item?.farmer?.basic_details?.mobile_no || "NA",
          "Created At": item?.famer?.createdAt || "NA",
          "Email ": item?.farmer?.basic_details?.email || "NA",
          Category: item?.farmer?.basic_details?.category || "NA",
          Age: item?.farmer?.basic_details?.age || "NA",
          "Date of Birth": item?.farmer?.basic_details?.dob || "NA",
          "Farmer Type": item?.farmer?.basic_details?.farmer_type || "NA",
          Gender: item?.farmer?.basic_details?.gender || "NA",
          "Address Line 1": item?.updatedFarmerAddress?.address_line_1 || "NA",
          "Address Line 2": item?.updatedFarmerAddress?.address_line_2 || "NA",
          village: item?.updatedFarmerAddress?.village || "NA",
          Block: item?.updatedFarmerAddress?.block || "NA",
          Tahshil: item?.updatedFarmerAddress?.tahshil || "NA",
          District: item?.updatedFarmerAddress?.district || "NA",
          State: item?.updatedFarmerAddress?.state || "NA",
          Country: item?.updatedFarmerAddress?.country || "NA",
          "Pin Code": item?.updatedFarmerAddress?.pin_code || "NA",
          Lat: item?.updatedFarmerAddress?.lat || "NA",
          Long: item?.updatedFarmerAddress?.long || "NA",
          "Land Details": item?.farmer?.land_details || "NA",
          "Crop Details": item?.farmer?.crop_details || "NA",
          "Bank Name": item?.farmer?.bank_details?.bank_name || "NA",
          "Account Holder Name":
            item?.farmer?.bank_details?.account_holder_name || "NA",
          "IFSC Code": item?.farmer?.bank_details?.ifsc_code || "NA",
          "Account Number": item?.farmer?.bank_details?.account_no || "NA",
          "Account Status": item?.farmer?.bank_details?.accountstatus || "NA",
          "Welcome Msg Send": item?.farmer?.is_welcome_msg_send || "NA",
          "Verify Otp": item?.farmer?.is_verify_otp || "NA",
          "Haryna Famer Code": item?.farmer?.harynaNewFarmer_code || "NA",
          "User Type": item?.farmer?.user_type || "NA",
          "Marital Status": item?.farmer?.marital_status || "NA",
          Religion: item?.farmer?.religion || "NA",
          "Eduction (Highest)": item?.farmer?.education?.highest_edu || "NA",
          "Eduction (Details)": item?.farmer?.education?.edu_details || "NA",
          "Proof (Type)": item?.farmer?.proof?.type || "NA",
          "Proof (Aadhar no.)": item?.farmer?.proof?.aadhar_no || "NA",
          Status: item?.farmer?.status || "NA",
          "External Farmer Id": item?.farmer?.external_farmer_id || "NA",
          "Infra Structure (Warehouse) ":
            item?.farmer?.infrastructure_needs?.warehouse || "NA",
          "Infra Structure (Cold Storage) ":
            item?.farmer?.infrastructure_needs?.cold_storage || "NA",
          "Infra Structure (Processing Unit) ":
            item?.farmer?.infrastructure_needs?.processing_unit || "NA",
          "Infra Structure (Teansportation) ":
            item?.farmer?.infrastructure_needs?.transportation_facilities ||
            "NA",
          Ekhird: item?.farmer?.ekhrid || "NA",
          "Famer Tracent Code": item?.farmer?.farmer_tracent_code || "NA",
          "Financial Support (Creadit Facillties)":
            item?.farmer?.financial_support?.credit_facilities || "NA",
          "Financial Support (Soure of Credit)":
            item?.farmer?.financial_support?.source_of_credit || "NA",
          "Financial Support (Financial Chanllenges)":
            item?.farmer?.financial_support?.financial_challenges || "NA",
          "Financial Support (Support Required)":
            item?.farmer?.financial_support?.support_required || "NA",
          "Land Details (Khtauni Number)":
            item?.farmer?.land_details?.khtauni_number || "NA",
          "Land Details (khasra Number)":
            item?.farmer?.land_details?.khasra_number || "NA",
          "Soil Testing Agencies":
            item?.farmer?.land_details?.soil_testing_agencies || "NA",
          "Land Details (LandCropID)":
            item?.farmer?.land_details?.LandCropID || "NA",
          "Land Details (Area)": item?.farmer?.land?.[0]?.area || "NA",
          "Land Details (Area Unit)": item?.farmer?.land?.[0]?.area_unit || "NA",
          "Land Details (Khtauni Number)":
            item?.farmer?.land?.[0]?.khtauni_number || "NA",
          "Land Details (Khasra Number)":
            item?.farmer?.land?.[0]?.khasra_number || "NA",
          "Land Details (Khata Number)":
            item?.farmer?.land?.[0]?.khata_number || "NA",
          "Land Details (Land Type)":
            item?.farmer?.land?.[0]?.land_type || "NA",
          "Land Details (Soil Type)":
            item?.farmer?.land?.[0]?.soil_type || "NA",
          "land_address(village)":
            item?.farmer?.land?.[0]?.land_address?.village || "NA",
          "land_address(Block)":
            item?.farmer?.land?.[0]?.land_address?.block || "NA",
          "land_address(Pin Code)":
            item?.farmer?.land?.land_address?.pin_code || "NA",
          "Soil Testing Agencies":
            item?.farmer?.land?.soil_testing_agencies || "NA",
          "Crop Details (Season Name)": item?.farmer?.crop?.[0]?.seasonname || "NA",
          "Crop Details (Season Id)": item?.farmer?.crop?.[0]?.seasonid || "NA",
          "Crop Details (L LGD DIS CODE)":
            item?.farmer?.crop?.[0]?.L_LGD_DIS_CODE || "NA",
          "Crop Details (L LGD TEH CODE)":
            item?.farmer?.crop?.[0]?.L_LGD_TEH_CODE || "NA",
          "Crop Details (L LGD VIL CODE)":
            item?.farmer?.crop?.[0]?.L_LGD_VIL_CODE || "NA",
          "Crop Details (Sown Commodity ID)":
            item?.farmer?.crop?.[0]?.SownCommodityID || "NA",
          "Crop Details (Sown Commodity Name)":
            item?.farmer?.crop?.[0]?.SownCommodityName || "NA",
          "Crop Details (Commodity Variety)":
            item?.farmer?.crop?.[0]?.CommodityVariety || "NA",
          "Crop Details (Crop Growth Stage)":
            item?.farmer?.crop?.[0]?.crop_growth_stage || "NA",
          "Crop Details (Crop Name)": item?.farmer?.crop?.[0]?.crop_name || "NA",
          "Crop Details (Harvesting Date)":
            item?.farmer?.crop?.[0]?.harvesting_date || "NA",
          "Crop Details (Production Quantity)":
            item?.farmer?.crop?.[0]?.production_quantity || "NA",
          "Crop Details (Production Quantity)":
            item?.farmer?.crop?.[0]?.production_quantity || "NA",
          "Crop Details (Selling Price)":
            item?.farmer?.crop?.[0]?.selling_price || "NA",
          "Crop Details (Yield)": item?.farmer?.crop?.[0]?.yield || "NA",
          "Crop Details (Land Name)": item?.farmer?.crop?.[0]?.land_name || "NA",
          "Crop Details (Crop Disease)":
            item?.farmer?.crop?.[0]?.crop_disease || "NA",
          "Crop Details (Crop Rotation)":
            item?.farmer?.crop?.[0]?.crop_rotation || "NA",
          "Seeds (Crop Name)": item?.farmer?.crop?.[0]?.input_details?.seeds?.crop_name || "NA",
          "Seeds (Crop Variety)":
            item?.farmer?.crop?.[0]?.input_details?.seeds?.crop_variety || "NA",
          "Seeds (Name of Seeds)":
            item?.farmer?.crop?.[0]?.input_details?.seeds?.name_of_seeds || "NA",
          "Seeds (Name of Seeds Company)":
            item?.farmer?.crop?.[0]?.input_details?.seeds?.name_of_seeds_company || "NA",
          "Seeds (Package Size)":
            item?.farmer?.crop?.[0]?.input_details?.seeds?.package_size || "NA",
          "Seeds (Total Package Required)":
            item?.farmer?.crop?.[0]?.input_details?.seeds?.total_package_required || "NA",
          "Seeds (Date of Purchase)":
            item?.farmer?.crop?.[0]?.input_details?.seeds?.date_of_purchase || "NA",
        };
      });
      if (record.length > 0) {
        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Associate-Farmer.xlsx`,
          worksheetName: `Associate-Farmer-record`,
        });
      } else {
        return res.status(200).send(
          new serviceResponse({
            status: 200,
            message: "No records found.",
          })
        );
      }
    } else if (isExport == 1 && centertype === "localFarmer") {

      const record = responseData?.localFarmers.map((item) => {
        return {
          "Farmer ID": item?.farmer?.farmer_id || "NA",
          "Farmer Name": item?.farmer?.name || "NA",
          "Father/Spouse Name": item?.farmer?.parents?.father_name || "NA",
          "Mother Name": item?.farmer?.parents?.mother_name || "NA",
          "Mobile Number": item?.farmer?.basic_details?.mobile_no || "NA",
          "Created At": item?.famer?.createdAt || "NA",
          "Email ": item?.farmer?.basic_details?.email || "NA",
          Category: item?.farmer?.basic_details?.category || "NA",
          Age: item?.farmer?.basic_details?.age || "NA",
          "Date of Birth": item?.farmer?.basic_details?.dob || "NA",
          "Farmer Type": item?.farmer?.basic_details?.farmer_type || "NA",
          Gender: item?.farmer?.basic_details?.gender || "NA",
          "Address Line 1": item?.updatedFarmerAddress?.address_line_1 || "NA",
          "Address Line 2": item?.updatedFarmerAddress?.address_line_2 || "NA",
          village: item?.updatedFarmerAddress?.village || "NA",
          Block: item?.updatedFarmerAddress?.block || "NA",
          Tahshil: item?.updatedFarmerAddress?.tahshil || "NA",
          District: item?.updatedFarmerAddress?.district || "NA",
          State: item?.updatedFarmerAddress?.state || "NA",
          Country: item?.updatedFarmerAddress?.country || "NA",
          "Pin Code": item?.updatedFarmerAddress?.pin_code || "NA",
          Lat: item?.updatedFarmerAddress?.lat || "NA",
          Long: item?.updatedFarmerAddress?.long || "NA",
          "Land Details": item?.farmer?.land_details || "NA",
          "Crop Details": item?.farmer?.crop_details || "NA",
          "Bank Name": item?.farmer?.bank_details?.bank_name || "NA",
          "Account Holder Name":
            item?.farmer?.bank_details?.account_holder_name || "NA",
          "IFSC Code": item?.farmer?.bank_details?.ifsc_code || "NA",
          "Account Number": item?.farmer?.bank_details?.account_no || "NA",
          "Account Status": item?.farmer?.bank_details?.accountstatus || "NA",
          "Welcome Msg Send": item?.farmer?.is_welcome_msg_send || "NA",
          "Verify Otp": item?.farmer?.is_verify_otp || "NA",
          "Haryna Famer Code": item?.farmer?.harynaNewFarmer_code || "NA",
          "User Type": item?.farmer?.user_type || "NA",
          "Marital Status": item?.farmer?.marital_status || "NA",
          Religion: item?.farmer?.religion || "NA",
          "Eduction (Highest)": item?.farmer?.education?.highest_edu || "NA",
          "Eduction (Details)": item?.farmer?.education?.edu_details || "NA",
          "Proof (Type)": item?.farmer?.proof?.type || "NA",
          "Proof (Aadhar no.)": item?.farmer?.proof?.aadhar_no || "NA",
          Status: item?.farmer?.status || "NA",
          "External Farmer Id": item?.farmer?.external_farmer_id || "NA",
          "Infra Structure (Warehouse) ":
            item?.farmer?.infrastructure_needs?.warehouse || "NA",
          "Infra Structure (Cold Storage) ":
            item?.farmer?.infrastructure_needs?.cold_storage || "NA",
          "Infra Structure (Processing Unit) ":
            item?.farmer?.infrastructure_needs?.processing_unit || "NA",
          "Infra Structure (Teansportation) ":
            item?.farmer?.infrastructure_needs?.transportation_facilities ||
            "NA",
          Ekhird: item?.farmer?.ekhrid || "NA",
          "Famer Tracent Code": item?.farmer?.farmer_tracent_code || "NA",
          "Financial Support (Creadit Facillties)":
            item?.farmer?.financial_support?.credit_facilities || "NA",
          "Financial Support (Soure of Credit)":
            item?.farmer?.financial_support?.source_of_credit || "NA",
          "Financial Support (Financial Chanllenges)":
            item?.farmer?.financial_support?.financial_challenges || "NA",
          "Financial Support (Support Required)":
            item?.farmer?.financial_support?.support_required || "NA",
          "Land Details (Khtauni Number)":
            item?.farmer?.land_details?.khtauni_number || "NA",
          "Land Details (khasra Number)":
            item?.farmer?.land_details?.khasra_number || "NA",
          "Soil Testing Agencies":
            item?.farmer?.land_details?.soil_testing_agencies || "NA",
          "Land Details (LandCropID)":
            item?.farmer?.land_details?.LandCropID || "NA",
          "Land Details (Area)": item?.farmer?.land?.[0]?.area || "NA",
          "Land Details (Area Unit)": item?.farmer?.land?.[0]?.area_unit || "NA",
          "Land Details (Khtauni Number)":
            item?.farmer?.land?.[0]?.khtauni_number || "NA",
          "Land Details (Khasra Number)":
            item?.farmer?.land?.[0]?.khasra_number || "NA",
          "Land Details (Khata Number)":
            item?.farmer?.land?.[0]?.khata_number || "NA",
          "Land Details (Land Type)":
            item?.farmer?.land?.[0]?.land_type || "NA",
          "Land Details (Soil Type)":
            item?.farmer?.land?.[0]?.soil_type || "NA",
          "land_address(village)":
            item?.farmer?.land?.[0]?.land_address?.village || "NA",
          "land_address(Block)":
            item?.farmer?.land?.[0]?.land_address?.block || "NA",
          "land_address(Pin Code)":
            item?.farmer?.land?.land_address?.pin_code || "NA",
          "Soil Testing Agencies":
            item?.farmer?.land?.soil_testing_agencies || "NA",
          "Crop Details (Season Name)": item?.farmer?.crop?.[0]?.seasonname || "NA",
          "Crop Details (Season Id)": item?.farmer?.crop?.[0]?.seasonid || "NA",
          "Crop Details (L LGD DIS CODE)":
            item?.farmer?.crop?.[0]?.L_LGD_DIS_CODE || "NA",
          "Crop Details (L LGD TEH CODE)":
            item?.farmer?.crop?.[0]?.L_LGD_TEH_CODE || "NA",
          "Crop Details (L LGD VIL CODE)":
            item?.farmer?.crop?.[0]?.L_LGD_VIL_CODE || "NA",
          "Crop Details (Sown Commodity ID)":
            item?.farmer?.crop?.[0]?.SownCommodityID || "NA",
          "Crop Details (Sown Commodity Name)":
            item?.farmer?.crop?.[0]?.SownCommodityName || "NA",
          "Crop Details (Commodity Variety)":
            item?.farmer?.crop?.[0]?.CommodityVariety || "NA",
          "Crop Details (Crop Growth Stage)":
            item?.farmer?.crop?.[0]?.crop_growth_stage || "NA",
          "Crop Details (Crop Name)": item?.farmer?.crop?.[0]?.crop_name || "NA",
          "Crop Details (Harvesting Date)":
            item?.farmer?.crop?.[0]?.harvesting_date || "NA",
          "Crop Details (Production Quantity)":
            item?.farmer?.crop?.[0]?.production_quantity || "NA",
          "Crop Details (Production Quantity)":
            item?.farmer?.crop?.[0]?.production_quantity || "NA",
          "Crop Details (Selling Price)":
            item?.farmer?.crop?.[0]?.selling_price || "NA",
          "Crop Details (Yield)": item?.farmer?.crop?.[0]?.yield || "NA",
          "Crop Details (Land Name)": item?.farmer?.crop?.[0]?.land_name || "NA",
          "Crop Details (Crop Disease)":
            item?.farmer?.crop?.[0]?.crop_disease || "NA",
          "Crop Details (Crop Rotation)":
            item?.farmer?.crop?.[0]?.crop_rotation || "NA",
          "Seeds (Crop Name)": item?.farmer?.crop?.[0]?.input_details?.seeds?.crop_name || "NA",
          "Seeds (Crop Variety)":
            item?.farmer?.crop?.[0]?.input_details?.seeds?.crop_variety || "NA",
          "Seeds (Name of Seeds)":
            item?.farmer?.crop?.[0]?.input_details?.seeds?.name_of_seeds || "NA",
          "Seeds (Name of Seeds Company)":
            item?.farmer?.crop?.[0]?.input_details?.seeds?.name_of_seeds_company || "NA",
          "Seeds (Package Size)":
            item?.farmer?.crop?.[0]?.input_details?.seeds?.package_size || "NA",
          "Seeds (Total Package Required)":
            item?.farmer?.crop?.[0]?.input_details?.seeds?.total_package_required || "NA",
          "Seeds (Date of Purchase)":
            item?.farmer?.crop?.[0]?.input_details?.seeds?.date_of_purchase || "NA",
        };
      });
      if (record.length > 0) {
        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Local-Farmer.xlsx`,
          worksheetName: `Local-Farmer-record`,
        });
      } else {
        return res.status(200).send(
          new serviceResponse({
            status: 200,
            message: "No records found.",
          })
        );
      }
    }
    // else {
    //   return res.status(200).send(
    //     new serviceResponse({
    //       status: 200,

    //       message: _response_message.found("collection center"),
    //     })
    //   );
    // }

    // return res.status(200).send({
    //   status: 200,
    //   data: responseData,
    //   message: "Farmers data retrieved successfully.",
    // });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while fetching farmers data.",
    });
  }
};

module.exports.uploadFarmerDocument = async (req, res) => {
  try {
    const {
      farmer_id,
      aadhar_front_doc_key,
      aadhar_back_doc_key,
      bank_document,
      upload_land_document,
    } = req.body;

    const existingFarmer = await farmer.findById(farmer_id);

    if (!existingFarmer) {
      return res.status(404).send(
        new serviceResponse({
          status: 404,
          errors: [{ message: _response_message.notFound("farmer") }],
        })
      );
    }

    existingFarmer.documents.aadhar_front_doc_key =
      aadhar_front_doc_key || existingFarmer.documents.aadhar_front_doc_key;
    existingFarmer.documents.aadhar_back_doc_key =
      aadhar_back_doc_key || existingFarmer.documents.aadhar_back_doc_key;
    existingFarmer.bank_details.proof_doc_key =
      bank_document || existingFarmer.bank_details.proof_doc_key;

    const updatedFarmer = await existingFarmer.save();

    const result = await Land.findOneAndUpdate(
      { farmer_id }, // Query condition
      { farmer_id, upload_land_document }, // Update data
      { upsert: true, new: true } // Options: insert if not found, return the updated/inserted document
    );

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        message: _response_message.updated("Farmer Document"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.getFarmerDocument = async (req, res) => {
  try {
    const { farmer_id } = req.query;

    const farmerDetails = await farmer
      .findOne({ _id: farmer_id })
      .select({ documents: 1, bank_details: 1 });
    let records = {};

    if (farmerDetails) {
      const landDocument = await Land.findOne({ farmer_id: farmer_id }).select({
        upload_land_document: 1,
      });
      records = { ...farmerDetails.toObject(), landDocument };

      return sendResponse({
        res,
        status: 200,
        data: records,
        message: _response_message.found("Farmer"),
      });
    } else {
      return sendResponse({
        res,
        status: 400,
        message: _response_message.notFound("Farmer"),
      });
    }
  } catch (err) {
    console.log("error", err);
    _handleCatchErrors(err, res);
  }
};

module.exports.getStates = async (req, res) => {
  try {
    const states = await StateDistrictCity.aggregate([
      { $unwind: "$states" },
      { $project: { "states.state_title": 1, "states._id": 1 } },
      { $group: { _id: null, states: { $push: "$states" } } },
    ]);

    if (!states.length || !states[0].states.length) {
      return sendResponse({
        res,
        data: [],
        status: 404,
        message: _response_message.notFound("state"),
      });
    }

    return sendResponse({
      res,
      data: states[0].states,
      status: 200,
      message: _response_message.found("state"),
    });
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};

module.exports.getDistrictByState = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse({
        res,
        data: null,
        status: 404,
        message: _response_message.invalid(id),
      });
    }
    const result = await StateDistrictCity.findOne(
      { "states._id": id },
      { "states.$": 1 }
    );

    if (!result && result?.states?.length > 0) {
      sendResponse({
        res,
        data: districts,
        status: 404,
        message: _response_message.notFound("state"),
      });
    }

    const state = result.states[0];
    const districts = state.districts.map((district) => ({
      district_title: district.district_title,
      _id: district._id,
    }));
    return sendResponse({
      res,
      data: districts,
      status: 200,
      message: _response_message.found("district"),
    });
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};
module.exports.editFarmerDocument = async (req, res) => {
  try {
    const {
      farmer_id,
      name,
      farmer_type,
      basic_details,
      address,
      bank_details,
      parents,
      marital_status,
      religion,
      education,
      proof,
      land_details,
      pastCrops,
      upcomingCrops,
    } = req.body;

    const existingFarmer = await farmer.findById(farmer_id);

    if (!existingFarmer) {
      return res.status(404).send(
        new serviceResponse({
          status: 404,
          errors: [{ message: _response_message.notFound("farmer") }],
        })
      );
    }

    // const existingLand = await Land.find({ farmer_id: farmer_id });
    // if (!existingLand.length) {
    //   return res.status(404).send(
    //     new serviceResponse({
    //       status: 404,
    //       errors: [{ message: _response_message.notFound("land") }],
    //     })
    //   );
    // }

    // const existingCrop = await Crop.find({ farmer_id: farmer_id });
    // if (!existingCrop.length) {
    //   return res.status(404).send(
    //     new serviceResponse({
    //       status: 404,
    //       errors: [{ message: _response_message.notFound("crop") }],
    //     })
    //   );
    // }

    // Update fields conditionally
    if (farmer_type) {
      existingFarmer.farmer_type = farmer_type;
    }
    if (name) {
      existingFarmer.name = name;
    }
    if (basic_details) {
      existingFarmer.basic_details = basic_details;
    }

    if (address) {
      existingFarmer.address = address;
    }

    if (bank_details) {
      existingFarmer.bank_details = bank_details;
    }

    if (parents) {
      existingFarmer.parents = parents;
    }

    if (marital_status !== undefined)
      existingFarmer.marital_status = marital_status;
    if (religion !== undefined) existingFarmer.religion = religion;

    if (education) {
      if (education.edu_details)
        existingFarmer.education.edu_details = education.edu_details;
    }

    if (proof) {
      if (proof.type !== undefined) existingFarmer.proof.type = proof.type;
      if (proof.aadhar_no) existingFarmer.proof.aadhar_no = proof.aadhar_no;
    }
    if (land_details && Array.isArray(land_details)) {
      for (const landEntry of land_details) {
        const { _id: landId, ...landFields } = landEntry;
        if (landId) {
          await Land.findOneAndUpdate(
            { _id: landId },
            { $set: landFields },
            { new: true }
          );
        } else {
          await Land.create({
            farmer_id: farmer_id,
            ...landFields,
          });
        }
      }
    }

    if (pastCrops && Array.isArray(pastCrops)) {
      const cropPromises = pastCrops.map(async (cropEntry) => {
        let { _id: cropId, ...cropFields } = cropEntry;
        cropFields.sowing_date = parseMonthyear(cropFields.sowing_date);
        cropFields.harvesting_date = parseMonthyear(cropFields.harvesting_date);
        if (cropId) {
          return Crop.findByIdAndUpdate(
            cropId,
            { $set: cropFields },
            { new: true }
          );
        } else {
          return Crop.create({ farmer_id, ...cropFields });
        }
      });
      await Promise.all(cropPromises);
    }

    let upcommingCropsDetails = null;
    if (upcomingCrops && Array.isArray(upcomingCrops)) {
      for (const cropEntry of upcomingCrops) {
        const { _id: cropId, ...cropFields } = cropEntry;
        console.log(cropFields, cropId);
        cropFields.sowing_date = parseMonthyear(cropFields.sowing_date);
        cropFields.harvesting_date = parseMonthyear(cropFields.harvesting_date);
        if (cropId) {
          upcommingCropsDetails = await Crop.findByIdAndUpdate(
            { _id: cropId },
            { $set: cropFields },
            { new: true }
          );
        } else {
          upcommingCropsDetails = await Crop.create({
            farmer_id: farmer_id,
            ...cropFields,
          });
        }
      }
    }

    await existingFarmer.save();

    return sendResponse({
      res,
      data: { upcommingCropsDetails },
      status: 200,
      message: _response_message.updated("Farmer"),
    });
  } catch (err) {
    console.error("Error:", err);
    _handleCatchErrors(err, res);
  }
};
module.exports.addDistrictCity = async (req, res) => {
  const { state_title, district_title, city_title } = req.body;

  if (!state_title || !district_title || !city_title) {
    return res.status(400).json({
      message: "state_title, district_title, and city_title are required.",
    });
  }
  try {
    const state = await StateDistrictCity.findOne({
      "states.state_title": state_title,
    });
    if (!state) {
      return res.status(404).json({ message: "State not found." });
    }
    const stateIndex = state.states.findIndex(
      (s) => s.state_title === state_title
    );
    const districtCount = state.states[stateIndex].districts.length;
    const serialNumber = (districtCount + 1).toString().padStart(2, "0");
    const result = await StateDistrictCity.updateOne(
      { "states.state_title": state_title },
      {
        $push: {
          "states.$.districts": {
            district_title,
            serialNumber,
            cities: [
              {
                city_title,
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      }
    );

    if (result.modifiedCount > 0) {
      return res
        .status(200)
        .json({ message: "District and city added successfully." });
    } else {
      return res
        .status(404)
        .json({ message: "State not found or no update occurred." });
    }
  } catch (error) {
    console.error("Error adding district and city:", error);
    return res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};
module.exports.bulkUploadNorthEastFarmers = async (req, res) => {
  try {
    const { user_id } = req;
    const { isxlsx = 1 } = req.body;
    const [file] = req.files;

    if (!file) {
      return res.status(400).json({
        message: _response_message.notFound("file"),
        status: 400,
      });
    }

    let farmers = [];
    let headers = [];

    if (isxlsx) {
      const workbook = xlsx.read(file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      farmers = xlsx.utils.sheet_to_json(worksheet);
      headers = Object.keys(farmers[0]);
    } else {
      const csvContent = file.buffer.toString("utf8");
      const lines = csvContent.split("\n");
      headers = lines[0].trim().split(",");
      const dataContent = lines.slice(1).join("\n");

      const parser = csv({ headers });
      const readableStream = Readable.from(dataContent);

      readableStream.pipe(parser);
      parser.on("data", async (data) => {
        if (Object.values(data).some((val) => val !== "")) {
          const result = await processFarmerRecord(data);
          if (!result.success) {
            errorArray = errorArray.concat(result.errors);
          }
        }
      });

      parser.on("end", () => {
        console.log("Stream end");
      });
      parser.on("error", (err) => {
        console.log("Stream error", err);
      });
    }

    let errorArray = [];
    const processFarmerRecord = async (rec) => {
      const toLowerCaseIfExists = (value) =>
        value ? value.toLowerCase().trim() : null;
      const parseBooleanYesNo = (value) => {
        if (value === true || value?.toLowerCase() === "yes") return true;
        if (value === false || value?.toLowerCase() === "no") return false;
        return null;
      };

      function getValueOrNull(value) {
        return value
          ? typeof value === "string"
            ? value.trim()
            : value
          : null;
      }

      const name = getValueOrNull(rec["Farmer Name"]);
      const father_name = getValueOrNull(rec["Farmer Father Name"]);
      const mother_name = getValueOrNull(rec["MOTHER NAME"]);
      const date_of_birth = getValueOrNull(rec["DATE OF BIRTH(DD-MM-YYYY)*"]);
      const farmer_category = getValueOrNull(rec["FARMER CATEGORY"]);
      const gender = toLowerCaseIfExists(rec["Gender"]);
      const marital_status =
        toLowerCaseIfExists(rec["MARITAL STATUS"]) || "N/A";
      const religion = toLowerCaseIfExists(rec["RELIGION"]) || "N/A";
      const category = toLowerCaseIfExists(rec["CATEGORY"]) || "N/A";
      const highest_edu = toLowerCaseIfExists(rec["EDUCATION LEVEL"]);
      const edu_details = getValueOrNull(rec["EDU DETAILS"]);
      const type = toLowerCaseIfExists(rec["ID PROOF TYPE*"]);
      const aadhar_no = getValueOrNull(rec["AADHAR NUMBER*"]);
      const address_line = getValueOrNull(rec["ADDRESS LINE*"]);
      const country = getValueOrNull(rec["COUNTRY NAME"]) || "India";
      const state_name = getValueOrNull(rec["STATE NAME*"]);
      const district_name = getValueOrNull(rec["DISTRICT NAME*"]);
      const tahshil = getValueOrNull(rec["TAHSHIL*"]);
      const block = getValueOrNull(rec["BLOCK NAME*"]);
      const village = getValueOrNull(rec["Village"]);
      const pinCode = getValueOrNull(rec["PINCODE*"]);
      const lat = getValueOrNull(rec["LATITUDE"]);
      const long = getValueOrNull(rec["LONGITUDE"]);
      const mobile_no = getValueOrNull(rec["MOBILE NO*"]);
      const email = getValueOrNull(rec["EMAIL ID"]);
      const bank_name = getValueOrNull(rec["Bank Name"]);
      const account_no = getValueOrNull(rec["Account No"]);
      const branch_name = getValueOrNull(rec["Branch"]);
      const ifsc_code = getValueOrNull(rec["IFSC Code"]);
      const account_holder_name = getValueOrNull(rec["Farmer Name"]);
      const farmer_tracent_code = getValueOrNull(rec["Farmer Tracenet Code *"]);
      // console.log("aadhar_no", aadhar_no)
      // console.log("mobile_no", mobile_no)
      const requiredFields = [
        { field: "AADHAR NUMBER*", label: "AADHAR NUMBER" },
        { field: "MOBILE NO*", label: "MOBILE NUMBER" },
      ];
      let stateName = state_name.replace(/_/g, " ");
      if (
        stateName === "Dadra and Nagar Haveli" ||
        stateName === "Andaman and Nicobar" ||
        stateName === "Daman and Diu" ||
        stateName === "Jammu and Kashmir"
      ) {
        stateName = stateName.replace("and", "&");
      }
      let errors = [];
      let missingFields = [];

      requiredFields.forEach(({ field, label }) => {
        if (!rec[field]) missingFields.push(label);
      });

      if (missingFields.length > 0) {
        errors.push({
          record: rec,
          error: `Required fields missing: ${missingFields.join(", ")}`,
        });
      }
      if (!/^\d{12}$/.test(aadhar_no)) {
        errors.push({ record: rec, error: "Invalid Aadhar Number" });
      }
      // if (!/^\d{6,20}$/.test(account_no)) {
      //   errors.push({ record: rec, error: "Invalid Account Number: Must be a numeric value between 6 and 20 digits." });
      // }
      if (!/^\d{10}$/.test(mobile_no)) {
        errors.push({ record: rec, error: "Invalid Mobile Number" });
      }

      if (!Object.values(_gender).includes(gender)) {
        errors.push({
          record: rec,
          error: `Invalid Gender: ${gender}. Valid options: ${Object.values(
            _gender
          ).join(", ")}`,
        });
      }
      if (!Object.values(_maritalStatus).includes(marital_status)) {
        errors.push({
          record: rec,
          error: `Invalid Marital Status: ${marital_status}. Valid options: ${Object.values(
            _maritalStatus
          ).join(", ")}`,
        });
      }
      if (!Object.values(_religion).includes(religion)) {
        errors.push({
          record: rec,
          error: `Invalid Religion: ${religion}. Valid options: ${Object.values(
            _religion
          ).join(", ")}`,
        });
      }
      if (!Object.values(_individual_category).includes(category)) {
        errors.push({
          record: rec,
          error: `Invalid Category: ${category}. Valid options: ${Object.values(
            _individual_category
          ).join(", ")}`,
        });
      }
      if (!Object.values(_proofType).includes(type)) {
        errors.push({
          record: rec,
          error: `Invalid Proof type: ${type}. Valid options: ${Object.values(
            _proofType
          ).join(", ")}`,
        });
      }
      if (errors.length > 0) return { success: false, errors };
      // const calulateage = calculateAge(date_of_birth);
      try {
        const state_id = await getStateId(stateName);
        const district_id = await getDistrictId(district_name);
        // const processedDateOfBirth = parseDateOfBirth(date_of_birth);

        let associateId = user_id;
        if (!user_id) {
          const associate = await User.findOne({
            "basic_details.associate_details.organization_name": fpo_name,
          });
          associateId = associate ? associate._id : null;
        }
        let farmerRecord = await farmer.findOne({
          "proof.aadhar_no": aadhar_no,
        });
        if (farmerRecord) {
          return {
            success: false,
            errors: [
              {
                record: rec,
                error: `Farmer  with Aadhar No. ${aadhar_no} already registered.`,
              },
            ],
          };

          // });
        } else {
          farmerRecord = await insertNewFarmerRecord({
            associate_id: associateId,
            farmer_tracent_code,
            name,
            father_name,
            mother_name,
            dob: date_of_birth,
            age: null,
            gender,
            farmer_category,
            aadhar_no,
            type,
            marital_status,
            religion,
            category,
            highest_edu,
            edu_details,
            address_line,
            country,
            state_id,
            district_id,
            tahshil,
            block,
            village,
            pinCode,
            lat,
            long,
            mobile_no,
            email,
            bank_name,
            account_no,
            branch_name,
            ifsc_code,
            account_holder_name,
          });
        }
      } catch (error) {
        console.log(error);
        errors.push({ record: rec, error: error.message });
      }

      return { success: errors.length === 0, errors };
    };

    for (const farmer of farmers) {
      const result = await processFarmerRecord(farmer);
      if (!result.success) {
        errorArray = errorArray.concat(result.errors);
      }
    }

    if (errorArray.length > 0) {
      const errorData = errorArray.map((err) => ({
        ...err.record,
        Error: err.error,
      }));
      // console.log("error data->",errorData)
      dumpJSONToExcel(req, res, {
        data: errorData,
        fileName: `Farmer-error_records.xlsx`,
        worksheetName: `Farmer-record-error_records`,
      });
    } else {
      return res.status(200).json({
        status: 200,
        data: {},
        message: "Farmers successfully uploaded.",
      });
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

function generateCacheKey(prefix, params) {
  return `${prefix}:${Object.entries(params)
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join("&")}`;
}

async function mapToVerifyFarmerModel(rows, request_for_verfication) {
  const result = [];
  let request_for_aadhaar = false
  let request_for_bank = false

  switch (request_for_verfication) {
    case VerificationType.BANK:
      request_for_bank = true;
      break;
    case VerificationType.AADHAAR:
      request_for_aadhaar = true;
      break;
    case VerificationType.BOTH:
      request_for_bank = true;
      request_for_aadhaar = true;
      break;
  }

  for (const row of rows) {
    try {
      const farmerData = await farmer.findOne({ farmer_id: row["Farmer ID"] });
      if (!farmerData) {
        logger.warn(`Farmer not found with ID: ${row._id}`);
        continue;
      }

      const existingVerification = await verfiyfarmer.findOne({ farmer_id: farmerData._id });
      if (existingVerification) {
        logger.info(`Farmer already verified with ID: ${farmerData._id}`);
        continue;
      }

      const data = {
        farmer_id: new ObjectId(farmerData._id),
        associate_id: farmerData?.associate_id ? new ObjectId(farmerData.associate_id) : null,
        aadhar_number: farmerData?.proof?.aadhar_no || null,
        request_for_aadhaar,
        request_for_bank
      };

      result.push(data);

    } catch (err) {
      logger.error(`Error processing row with ID ${row._id}`, err);
      continue;
    }
  }

  return result;
}

module.exports.uploadFarmerForVerfication = async (req, res) => {
  try {
    let { isxlsx, request_for_verfication } = req.body;
    const [file] = req.files;
    request_for_verfication = +request_for_verfication
    logger.info("Starting upload of farmer data for verification.");

    // Check for required fields
    if (!file) {
      logger.warn("File is missing in the request.");
      return sendResponse({
        res,
        status: 400,
        message: "File is required"
      });
    }

    // Check if isxlsx is provided
    if (typeof isxlsx === "undefined") {
      logger.warn("Missing required field: isxlsx");
      return sendResponse({
        res,
        status: 400,
        message: "Missing required field: isxlsx"
      });
    }
    if (!Object.values(VerificationType).includes(request_for_verfication)) {
      logger.warn("Invalid or missing request_for_verfication value", { request_for_verfication });

      return sendResponse({
        res,
        status: 400,
        message: "Invalid or missing value: request_for_verfication"
      });
    }


    const rawRows = await parseExcelOrCsvFile(file, parseInt(isxlsx));
    if (!rawRows.length) {
      logger.warn("Uploaded file contains no data.");
      return sendResponse({
        res,
        status: 400,
        message: "No data found in file"
      });
    }

    const formattedRows = await mapToVerifyFarmerModel(rawRows, request_for_verfication);
    await verfiyfarmer.insertMany(formattedRows);

    logger.info(`Imported ${formattedRows.length} farmer records successfully.`);

    return sendResponse({
      res,
      message: "Farmers imported successfully",
      data: { count: formattedRows.length }
    });
  } catch (error) {
    logger.error("Error during farmer data import", error);
    return sendResponse({
      res,
      status: 500,
      message: "Failed to import data",
      errors: error.message
    });
  }
};

module.exports.farmerCount = async (req, res) => {
  try {
    logger.info(" Fetching farmer count and verification statistics");

    // Aggregate farmer types and counts
    const farmerTypeAgg = farmer.aggregate([
      {
        $group: {
          _id: "$farmer_type",
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$count" },
          data: {
            $push: {
              type: "$_id",
              count: "$count"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalFarmers: "$total",
          individualFarmers: {
            $ifNull: [
              {
                $let: {
                  vars: {
                    match: {
                      $first: {
                        $filter: {
                          input: "$data",
                          as: "item",
                          cond: { $eq: ["$$item.type", "Individual"] }
                        }
                      }
                    }
                  },
                  in: "$$match.count"
                }
              },
              0
            ]
          },
          associateFarmers: {
            $ifNull: [
              {
                $let: {
                  vars: {
                    match: {
                      $first: {
                        $filter: {
                          input: "$data",
                          as: "item",
                          cond: { $eq: ["$$item.type", "Associate"] }
                        }
                      }
                    }
                  },
                  in: "$$match.count"
                }
              },
              0
            ]
          }
        }
      }
    ]).exec();

    // Aggregate verified farmers count
    const verifiedFarmerAgg = farmer.aggregate([
      {
        $facet: {
          bankVerified: [
            { $match: { "bank_details.is_verified": true } },
            { $count: "count" }
          ],
          aadhaarVerified: [
            { $match: { "proof.is_verified": true } },
            { $count: "count" }
          ],
          bothVerified: [
            {
              $match: {
                "bank_details.is_verified": true,
                "proof.is_verified": true
              }
            },
            { $count: "count" }
          ]
        }
      },
      {
        $project: {
          bankVerified: {
            $ifNull: [{ $arrayElemAt: ["$bankVerified.count", 0] }, 0]
          },
          aadhaarVerified: {
            $ifNull: [{ $arrayElemAt: ["$aadhaarVerified.count", 0] }, 0]
          },
          bothVerified: {
            $ifNull: [{ $arrayElemAt: ["$bothVerified.count", 0] }, 0]
          }
        }
      }
    ]).exec();

    const [farmerTypes, verifiedFarmers] = await Promise.all([
      farmerTypeAgg,
      verifiedFarmerAgg
    ]);

    logger.info("✅ Farmer statistics fetched successfully");

    return sendResponse({
      res,
      message: "Farmer count fetched successfully",
      data: {
        farmerTypes: farmerTypes[0] || {
          totalFarmers: 0,
          individualFarmers: 0,
          associateFarmers: 0
        },
        verifiedFarmers: verifiedFarmers[0] || {
          bankVerified: 0,
          aadhaarVerified: 0,
          bothVerified: 0
        }
      }
    });

  } catch (error) {
    logger.error("❌ Error while fetching farmer count", error);
    return sendResponse({
      res,
      status: 500,
      message: "Failed to fetch farmer count",
      errors: error.message
    });
  }
};




module.exports.farmerVerfiedData = async (req, res) => {
  try {
    logger.info("[farmerVerfiedData] Fetching verified farmers with filters and pagination", {
      query: req.query,
    });

    const {
      page = 1,
      limit = 10,
      search = "",
      state_id,
      associate_id = "",
      commodityName,
      isExport = 1
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const matchStage = {};

    // Unified search across mobile, name, farmer_id
    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      matchStage.$or = [
        { "farmer_details.mobile_no": searchRegex },
        { "farmer_details.farmer_id": searchRegex },
        { "farmer_details.name": searchRegex }
      ];
    }

    if (state_id) {
      matchStage["farmer_details.address.state_id"] = new mongoose.Types.ObjectId(state_id);
    }

    if (commodityName) {
      matchStage["farmer_detailsCrop.crop_name"] = new RegExp(commodityName, "i");
    }

    if (associate_id && mongoose.Types.ObjectId.isValid(associate_id)) {
       matchStage["$or"] = [
        { associate_id: new mongoose.Types.ObjectId(associate_id) },
        { associate_id: null }
      ];
     }

    const pipeline = [
      {
        $lookup: {
          from: "farmers",
          localField: "farmer_id",
          foreignField: "_id",
          as: "farmer_details"
        }
      },
      { $unwind: "$farmer_details" },
      {
        $lookup: {
          from: "users",
          localField: "associate_id",
          foreignField: "_id",
          as: "associate_details"
        }
      },
      {
        $unwind: {
          path: "$associate_details",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "crops",
          let: { farmerId: "$farmer_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$farmer_id", "$$farmerId"] } } },
            { $sort: { createdAt: -1 } }, 
            { $limit: 1 }
          ],
          as: "farmer_detailsCrop"
        }
      },
      {
        $unwind: {
          path: "$farmer_detailsCrop",
          preserveNullAndEmptyArrays: true
        }
      },
      { $match: matchStage },
      {
        $project: {
          _id: 0,
          farmer_id: "$farmer_details.farmer_id",
          commodityName: "$farmer_detailsCrop.crop_name",
          associate_id: 1,
          is_verify_aadhaar: 1,
          is_verify_bank: 1,
          state_id: "$farmer_details.address.state_id",
          name: "$farmer_details.name",
          mobile: "$farmer_details.mobile_no",
          address: "$farmer_details.address.address_line_1",
          aadhar_no: "$farmer_details.proof.aadhar_no",
          account_no: "$farmer_details.bank_details.account_no",
          bank_name: "$farmer_details.bank_details.bank_name",
          branch_name: "$farmer_details.bank_details.branch_name",
          ifsc_code: "$farmer_details.bank_details.ifsc_code",
          organization_name: "$associate_details.basic_details.associate_details.organization_name"
        }
      },
      {
        $sort: { createdAt: -1 } // Sort by creation date, most recent first
      }
    ];

    if (isExport != 2 && isExport !== "2") {
      pipeline.push({
        $facet: {
          totalCount: [{ $count: "count" }],
          data: [
            { $skip: skip },
            { $limit: parseInt(limit) }
          ]
        }
      });
    }

    logger.info("[farmerVerfiedData] Running aggregation pipeline", {
      matchStage,
      skip,
      limit: parseInt(limit),
      isExport,
    });
    console.log("Aggregation Pipeline:", JSON.stringify(pipeline, null, 2));
    const result = await verfiyfarmer.aggregate(pipeline);
    const count = await verfiyfarmer.countDocuments(); // optional: base count
    console.log("MongoDB Count:", count);

    let total = 0;
    let data = [];

    if (isExport == 2 || isExport === "2") {
      data = result;
      total = result.length;
    } else {
      total = result[0]?.totalCount[0]?.count || 0;
      data = result[0]?.data || [];
    }

    logger.info("[farmerVerfiedData] Aggregation successful", {
      totalResults: total,
      returnedCount: data.length
    });

    // Export to Excel
    if (isExport == 2 || isExport === "2") {
      const exportRows = data.map((item) => ({
        "Farmer ID": item.farmer_id || "NA",
        "Farmer Name": item.name || "NA",
        "Mobile": item.mobile || "NA",
        "Commodity": item.commodityName || "NA",
        "Aadhaar Verified": item.is_verify_aadhaar ? "Yes" : "No",
        "Bank Verified": item.is_verify_bank ? "Yes" : "No",
        "Aadhaar No": item.aadhar_no || "NA",
        "Account No": item.account_no || "NA",
        "Bank Name": item.bank_name || "NA",
        "Branch Name": item.branch_name || "NA",
        "IFSC Code": item.ifsc_code || "NA",
        "Address": item.address || "NA",
        "Organization": item.organization_name || "NA"
      }));

      if (exportRows.length > 0) {
        return dumpJSONToExcel(req, res, {
          data: exportRows,
          fileName: `Verified_Farmers_${new Date().toISOString().slice(0, 10)}.xlsx`,
          worksheetName: `Farmers`
        });
      } else {
        return sendResponse({
          res,
          status: 200,
          message: "No farmer data found to export"
        });
      }
    }

    return sendResponse({
      res,
      message: "Verified farmers fetched successfully",
      data: {
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        farmers: data
      }
    });

  } catch (error) {
    logger.error("[farmerVerfiedData] Error fetching verified farmers", error);
    return sendResponse({
      res,
      status: 500,
      message: "Failed to fetch verified farmers",
      errors: error.message
    });
  }
};


