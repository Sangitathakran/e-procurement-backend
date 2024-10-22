const { _handleCatchErrors, _generateFarmerCode, getStateId, getDistrictId, parseDate, parseMonthyear, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { insertNewFarmerRecord, updateFarmerRecord, updateRelatedRecords, insertNewRelatedRecords } = require("@src/v1/utils/helpers/farmer_module");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const { Bank } = require("@src/v1/models/app/farmerDetails/Bank");
const { User } = require("@src/v1/models/app/auth/User");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { _response_message } = require("@src/v1/utils/constants/messages");
const xlsx = require('xlsx');
const csv = require("csv-parser");
const Readable = require('stream').Readable;
const { smsService } = require('../../utils/third_party/SMSservices');
const OTPModel = require("../../models/app/auth/OTP")
const { generateJwtToken } = require('../../utils/helpers/jwt')
const stateList=require("../../utils/constants/stateList");
const _individual_farmer_onboarding_steps = require('@src/v1/utils/constants');
const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
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
      })
    }

    if (!acceptTermCondition) {
      return sendResponse({
        res,
        status: 400,
        message: _response_message.Accept_term_condition(),
      })
    }

    await smsService.sendOTPSMS(mobileNumber);

    return sendResponse({
      res,
      status: 200,
      data: [],
      message: _response_message.otpCreate("mobile number"),
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
      return sendResponse({
        res,
        status: 400,
        message: _response_message.invalid("mobile number"),
      })
    }

    // Find the OTP for the provided mobile number
    const userOTP = await OTPModel.findOne({ phone: mobileNumber });
    // Verify the OTP
    if (inputOTP !== userOTP?.otp) {
      return sendResponse({
        res,
        status: 400,
        message: _response_message.otp_not_verified("OTP"),
      })
    }

    // Find the farmer data and verify OTP
    let individualFormerData = await farmer.findOne({
      mobile_no: mobileNumber,
      is_verify_otp: true
    });

    // If farmer data does not exist, create a new one
    if (!individualFormerData) {
      individualFormerData = await new farmer({
        mobile_no: mobileNumber,
        farmer_type:'Individual',
        is_verify_otp: true
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
    })

  } catch (err) {
    console.log("error", err);
    _handleCatchErrors(err, res);
  }
};

module.exports.registerName = async (req, res) => {
  try {
    const { registerName } = req.body;
    if (!registerName)
      return sendResponse({ res, status: 400, data: null, message: _response_message.notProvided('Name') })

    // Check if the user already exists and is verified
    const farmerData = await farmer.findOneAndUpdate(
      { mobile_no: req.mobile_no },
      {
        $set: {
          name: registerName,
          user_type: "5",
          basic_details: { name: registerName, mobile_no: req.mobile_no }
        }
      },
      { new: true }
    );

    if (farmerData) {
      return sendResponse({
        res,
        status: 200,
        data: farmerData,
        message: _response_message.Data_registered("Data"),
      })
    } else {
      return sendResponse({
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
    const farmerDetails = await farmer.findById(farmer_id).select(
      `${screenName}`
    );

    if (farmerDetails) {
      farmerDetails[screenName] = req.body[screenName];

      if(screenName=='address'){
        let {state,district}=req.body[screenName];
        const state_id = await getStateId(state);
    const district_id = await getDistrictId(district);
        farmerDetails[screenName]={
          ...req.body[screenName],
          state_id,
          district_id
        }
      }
      // farmerDetails.steps = req.body?.steps;
      await farmerDetails.save();


      const farmerData = await farmer.findById(farmer_id)

      return sendResponse({
        res,
        status: 200,
        data: farmerData,
        message: _response_message.updated(screenName),
      })
    } else {
      return sendResponse({
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
      ? `${screenName} allStepsCompletedStatus `
      : null;
    
    if (selectFields) {
      farmerDetails = await farmer.findOne({ _id: id }).select(
        selectFields
      ).lean();
    } else {
      farmerDetails = await farmer.findOne({ _id: id }).lean();
    }

    if (farmerDetails) {
      if(farmerDetails?.address){
        const state = await StateDistrictCity.findOne({ "states": { $elemMatch: { "_id": farmerDetails?.address?.state_id?.toString() } } },{ "states.$": 1 });
  
        const districts = state?.states[0]?.districts.find(item=>item._id==farmerDetails?.address?.district_id?.toString())
        
              farmerDetails={
                ...farmerDetails,
                address:{
                  ...farmerDetails.address,
                  state:state?.states[0]?.state_title,
                  district:districts?.district_title
                }
              }
      }
     
      
      return sendResponse({
        res,
        status: 200,
        data: farmerDetails,
        message: _response_message.found(screenName)
      })

    } else {
      return sendResponse({
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

    const farmerDetails = await farmer.findById(id)
    // .populate('address.state_id')
    const state = await StateDistrictCity.findOne({ "states": { $elemMatch: { "_id": farmerDetails.address.state_id.toString() } } },{ "states.$": 1 });
  
  const districts = state.states[0].districts.find(item=>item._id==farmerDetails.address.district_id.toString())
    
    const generateFarmerId = (farmer) => {
      const stateData = stateList.stateList.find(
        (item) =>
          item.state.toLowerCase() === state.states[0].state_title.toLowerCase()
      );
      // console.log("stateData--->", stateData)
      const district = stateData.districts.find(
        (item) =>
          item.districtName.toLowerCase() ===districts.district_title.toLowerCase()
      );

      if (!district) {
        return sendResponse({
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
      // const districtCode = district.districtCode;
      const farmer_mongo_id = farmer._id.toString().slice(-3).toUpperCase()
      const randomNumber = Math.floor(100 + Math.random() * 900);

      const farmerId =
        stateCode + districtSerialNumber + farmer_mongo_id + randomNumber;
      // console.log("farmerId-->", farmerId)
      return farmerId;
    };
    const farmer_id = await generateFarmerId(farmerDetails);
      console.log(farmer_id)
    if (farmerDetails && farmer_id) {
      const landDetails = await Land.find({farmer_id:id});
        const cropDetails=await Crop.find({farmer_id:id})
        let land_ids=landDetails.map(item=>({land_id:item._id}))
        let crop_ids=cropDetails.map(item=>({crop_id:item._id}))
        farmerDetails.land_details=land_ids
        farmerDetails.crop_details=crop_ids
        console.log(land_ids,crop_ids)
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
        if (isMszSent && isMszSent.response && isMszSent.response.status === 'success') {
          // Message was sent successfully
          
          farmerDetails.is_welcome_msg_send = true;
          
        }

        const farmerUpdatedDetails = await farmerDetails.save();
        console.log(farmerUpdatedDetails)
        return sendResponse({ res, status: 200, data: farmerUpdatedDetails })
      }

      return sendResponse({
        res,
        status: 200,
        data: farmerDetails,
        message: _response_message.submit("Farmer"),
      })
    } else {
      return sendResponse({
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


//convert url into zip file
module.exports.createZip = async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return sendResponse({
        res: res,
        status: 400,
        message: 'Invalid request',
        errors: 'URL is required'
      });
    }

    const fileNameFromUrl = path.basename(new URL(url).pathname);

    const fileExtension = path.extname(fileNameFromUrl) || '.jpg'; // Default extension 

    const fileName = fileNameFromUrl || `downloadedFile${fileExtension}`;

    // Prepare the ZIP file name
    const zipFileName = `${fileName}.zip`;

    // Create a write stream for the ZIP file
    const output = fsp.createWriteStream(zipFileName);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      // Send the ZIP file after it has been created
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);
      const fileStream = fs.createReadStream(zipFileName);
      fileStream.pipe(res)

      fileStream.on('close', () => {
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



    archive.on('error', (err) => {
      console.error('Error creating archive:', err);
      return sendResponse({
        res: res,
        status: 500,
        message: 'Error creating ZIP archive',
        errors: err.message
      });
    });

    // Pipe the archive data to the output file
    archive.pipe(output);

    // Download the file from the provided URL and add it directly to the ZIP root 
    try {
      const response = await axios.get(url, { responseType: 'stream' });
      archive.append(response.data, { name: fileName });
    } catch (error) {
      return sendResponse({
        res: res,
        status: 500,
        message: 'Error downloading file',
        errors: error.message
      });
    }

    // Finalize the ZIP file
    await archive.finalize();

  } catch (error) {
    console.error('Unexpected error:', error.message);
    return sendResponse({
      res: res,
      status: 500,
      message: 'Something went wrong',
      errors: error.message
    });
  }
};

const validateMobileNumber = async (mobile) => {
  let pattern = /^[0-9]{10}$/;
  return pattern.test(mobile);
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
      status
    } = req.body;
    const { user_id } = req
    const { father_name, mother_name } = parents || {};
    const { bank_name, account_no, branch_name, ifsc_code, account_holder_name } = bank_details || {};

    const existingFarmer = await farmer.findOne({ 'proof.aadhar_no': proof.aadhar_no });

    if (existingFarmer) {
      return res.status(200).send(new serviceResponse({
        status: 400,
        errors: [{ message: _response_message.allReadyExist("farmer") }]
      }));
    }

    const farmerCode = await _generateFarmerCode();

    // Enhanced function to check if the value is a string before calling toLowerCase
    const toLowerCaseIfExists = (value) => (typeof value === 'string' && value) ? value.toLowerCase() : value;

    const newFarmer = new farmer({
      associate_id: user_id,
      farmer_code: farmerCode,
      name: toLowerCaseIfExists(name),
      parents: {
        father_name: toLowerCaseIfExists(father_name || ''),
        mother_name: toLowerCaseIfExists(mother_name || '')
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
        bank_name: toLowerCaseIfExists(bank_name || ''),
        account_no: account_no || '',
        branch_name: toLowerCaseIfExists(branch_name || ''),
        ifsc_code: toLowerCaseIfExists(ifsc_code || ''),
        account_holder_name: toLowerCaseIfExists(account_holder_name || '')
      },
      mobile_no,
      email: toLowerCaseIfExists(email),
      status
    });

    const savedFarmer = await newFarmer.save();

    return res.status(200).send(new serviceResponse({
      status: 201,
      data: savedFarmer,
      message: _response_message.created("Farmer")
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.getFarmers = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy, search = '', skip, paginate = 1, is_associated } = req.query;
    const { user_id } = req

    let query = {};
    const records = { count: 0 };
    // query.associate_id = is_associated == 1 ? user_id : null
    if (is_associated == 1) {
      query.associate_id = user_id;
    }
    else if (is_associated == 0) {
      query.associate_id = null;
    } else {
      query = {};
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    records.rows = paginate == 1
      ? await farmer.find(query)
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .sort(sortBy)
        .populate('associate_id', '_id user_code')
      : await farmer.find(query).sort(sortBy);

    records.count = await farmer.countDocuments(query);

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: records,
      message: _response_message.found("farmers")
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};
module.exports.getBoFarmer = async (req, res) => {
  try {
    const user_id  = req.user.portalId._id;
    const { page = 1, limit = 10, search = '', sortBy = 'name' } = req.query; 

    const user = await Branches.findById(user_id);
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const { state, district } = user; 
    if (!state || !district) {
      return res.status(400).send({ message: "User's state information is missing." });
    }

    const state_id = await getStateId(state);
    const district_id = await getDistrictId(district);
    if (!state_id || !district_id) {
      return res.status(400).send({ message: "State ID not found for the user's state." });
    }

    let query = { 'address.state_id': state_id,  'address.district_id': district_id};
    if (search) {
      query.name = { $regex: search, $options: 'i' }; 
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const farmers = await farmer.find(query)
      .sort({ [sortBy]: 1 })
      .skip(skip)
      .limit(parsedLimit)
      .populate('associate_id', '_id user_code ');
    const totalFarmers = await farmer.countDocuments(query);

    if (farmers.length === 0) {
      return res.status(404).send({ message: `No farmers found in state: ${state} and  District: ${district}`  });
    }
    return res.status(200).send({
      status: 200,
      totalFarmers, 
      currentPage: page,
      totalPages: Math.ceil(totalFarmers / parsedLimit),
      data: farmers,
      message: `Farmers found in state: ${state} and  District: ${district}`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "An error occurred while fetching farmers." });
  }
};

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

module.exports.deletefarmer = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).send({ message: 'Please provide an ID to delete.' });
    }
    const response = await farmer.deleteOne({ _id: id });

    if (response.deletedCount > 0) {
      return res.status(200).send(new serviceResponse({
        status: 200,
        data: response,
        message: _response_message.deleted("farmer"),
      }));
    } else {
      return res.status(200).send(new serviceResponse({
        status: 404,
        data: response,
        message: _response_message.notFound("farmer"),
      }));
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.createLand = async (req, res) => {
  try {
    const {
      farmer_id,pin_code, area, land_name, area_unit, state, district,land_type,upload_land_document,
      village, block, khtauni_number, khasra_number, khata_number,
      soil_type, soil_tested, uploadSoil_health_card, opt_for_soil_testing, soil_testing_agencies, upload_geotag
    } = req.body;
    console.log(farmer_id,
    area,
    pin_code,
    state,
    district,
    village,
    block,
    khasra_number,
    khtauni_number,
    area_unit,
    upload_land_document)
  
    const existingLand = await Land.findOne({ 'khasra_number': khasra_number });

    if (existingLand) {
      return res.status(200).send(new serviceResponse({
        status: 400,
        errors: [{ message: _response_message.allReadyExist("Land") }]
      }));
    }
    const state_id = await getStateId(state);
    const district_id = await getDistrictId(district);
    
    let land_address={
      state_id,
      block,
      pin_code,
      district_id,
      village
    }
    const newLand = new Land({
      farmer_id,area, land_name, area_unit,land_type,upload_land_document,land_address,
       khtauni_number, khasra_number, khata_number,
      soil_type, soil_tested, uploadSoil_health_card, opt_for_soil_testing, soil_testing_agencies, upload_geotag
    });
    const savedLand = await newLand.save();

    return res.status(200).send(new serviceResponse({
      status: 201,
      data: savedLand,
      message: _response_message.created("Land")
    }));

  } catch (error) {
    console.log('error', error)
    _handleCatchErrors(error, res);
  }
};
module.exports.getLand = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'khasra_no', search = '', paginate = 1, farmer_id } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    const records = { count: 0 };
    if (farmer_id) {
      query.farmer_id = farmer_id;
    }
//update
    let lands = paginate == 1
      ? await Land.find(query)
          .limit(parseInt(limit))
          .skip(parseInt(skip))
          .sort(sortBy)
          .populate('farmer_id', 'id name')
          .lean()
      : await Land.find(query)
          .sort(sortBy)
          .populate('farmer_id', 'id name')
          .lean();

    const stateIds = [...new Set(lands.map(land => land.land_address.state_id.toString()))];
    
    const states = await StateDistrictCity.find(
      { "states._id": { $in: stateIds } },
      { "states.$": 1 }
    ).lean();

    const stateMap = new Map();
    states.forEach(state => {
      if (state.states && state.states[0]) {
        stateMap.set(state.states[0]._id.toString(), {
          state_title: state.states[0].state_title,
          districts: state.states[0].districts
        });
      }
    });
    records.rows = lands.map(land => {
      const stateInfo = stateMap.get(land.land_address.state_id.toString());
      if (stateInfo) {
        const districtInfo = stateInfo.districts.find(
          district => district._id.toString() === land.land_address.district_id.toString()
        );

        return {
          ...land,
          land_address: {
            ...land.land_address,
            state: stateInfo.state_title,
            district: districtInfo ? districtInfo.district_title : null
          }
        };
      }
      return land;
    });

    

    records.count = await Land.countDocuments(query);

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: records,
      message: _response_message.found("Land")
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.updateLand = async (req, res) => {
  try {
    const { land_id } = req.params;
    const {
      area, land_name, cultivation_area,pin_code, area_unit, state, district,land_type,upload_land_document,
      village, block, khtauni_number, khasra_number, khata_number,
      soil_type, soil_tested, uploadSoil_health_card, opt_for_soil_testing, soil_testing_agencies, upload_geotag
    } = req.body;

    const state_id = await getStateId(state);
    const district_id = await getDistrictId(district);
    let land_address={
      state_id,
      block,
      pin_code,
      district_id,
      village
    }
    const updatedLand = await Land.findByIdAndUpdate(
      land_id,
      {
        area, land_name, cultivation_area, area_unit,land_type,upload_land_document,land_address
        , khtauni_number, khasra_number, khata_number,
        soil_type, soil_tested, uploadSoil_health_card, opt_for_soil_testing, soil_testing_agencies, upload_geotag
      },
      { new: true }
    );

    if (!updatedLand) {
      return res.status(200).send(new serviceResponse({
        status: 404,
        message: _response_message.notFound("Land")
      }));
    }

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: updatedLand,
      message: _response_message.updated("Land")
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};


module.exports.deleteLand = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).send({ message: 'Please provide an ID to delete.' });
    }
    const response = await Land.deleteOne({ _id: id });

    if (response.deletedCount > 0) {
      return res.status(200).send(new serviceResponse({
        status: 200,
        data: response,
        message: _response_message.deleted("Land"),
      }));
    } else {
      return res.status(200).send(new serviceResponse({
        status: 404,
        data: response,
        message: _response_message.notFound("Land"),
      }));
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.createCrop = async (req, res) => {
  try {
    const {
      farmer_id,land_id, crop_season, crop_name, crops_name, crop_variety,kharif_crops,rabi_crops,zaid_crops,
      sowing_date, harvesting_date, production_quantity, selling_price, yield, land_name
      , crop_growth_stage, crop_disease, crop_rotation, previous_crop_details, marketing_and_output, input_details, seeds
    } = req.body;

   
    const farmerDetails=await farmer.findById(farmer_id);
    console.log(farmerDetails)
    const sowingdate = (farmerDetails?.farmer_type=='Individual')?'':parseMonthyear(sowing_date);
    const harvestingdate = (farmerDetails?.farmer_type=='Individual')?'':parseMonthyear(harvesting_date); 
    let fieldSets=[]
    let fieldSet={
      farmer_id, crop_season, crop_name, crops_name, crop_variety,land_id,
      sowing_date: sowingdate, harvesting_date: harvestingdate, production_quantity, selling_price, yield, land_name
      , crop_growth_stage, crop_disease, crop_rotation, previous_crop_details, marketing_and_output, input_details, seeds
    }
    if(farmerDetails && farmerDetails?.farmer_type=='Individual'){
     
      for(item of kharif_crops){
        console.log('fieldSet',fieldSet)
        fieldSets.push({...fieldSet,crop_season:"kharif",crop_name:item})
        
      }
      for(item of rabi_crops){
        fieldSets.push({...fieldSet,crop_season:"rabi",crop_name:item})
        
      }
      for(item of zaid_crops){
        fieldSets.push({...fieldSet,crop_season:"zaid",crop_name:item})
      }
      
    }else{
      fieldSets.push(fieldSet)
    }
   
    console.log(fieldSets)
   let savedCrop= await Crop.insertMany(fieldSets)

    return res.status(200).send(new serviceResponse({
      status: 201,
      data: savedCrop,
      message: _response_message.created("Crop")
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};
module.exports.getLandDetails=async(req,res)=>{
  try {
    const { id} = req.params;

    let fetchLandDetails = await Land.findById(id).lean()
    if(!fetchLandDetails){
      return sendResponse({res,status:404,message:"Land details not found"})
     }
    const state = await StateDistrictCity.findOne({ "states": { $elemMatch: { "_id": fetchLandDetails.land_address.state_id.toString() } } },{ "states.$": 1 });
  
  const districts = state.states[0].districts.find(item=>item._id==fetchLandDetails.land_address.district_id.toString())
   let land_address={
    ...fetchLandDetails.land_address,
    state:state.states[0].state_title,
    district:districts.district_title
   }
  fetchLandDetails={
    ...fetchLandDetails,
    land_address
  }
     
   
    return res.status(200).send(new serviceResponse({
      status: 200,
      data: fetchLandDetails,
      message: _response_message.found("Land")
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
}
module.exports.getIndCropDetails = async (req, res) => {
  try {
    const { farmer_id,land_id } = req.query;
    
    if(!farmer_id && !land_id) return sendResponse({res,status:400,message:"Please provide farmer Id and land Id"})
    const query = farmer_id ? { farmer_id,land_id } : {};

    const fetchCrops = await Crop.find(query).populate('farmer_id', 'id name')
    let crops={
      farmer_id:fetchCrops[0]?.farmer_id,
      land_id:fetchCrops[0]?.land_id,
      kharif_crops:[],rabi_crops:[],zaid_crops:[]
    }
      if(fetchCrops){
        crops.kharif_crops=fetchCrops.filter(item=>item.crop_season=='kharif').map(item=>item.crop_name)
        crops.rabi_crops=fetchCrops.filter(item=>item.crop_season=='rabi').map(item=>item.crop_name)
        crops.zaid_crops=fetchCrops.filter(item=>item.crop_season=='zaid').map(item=>item.crop_name)
      }



    

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: crops,
      message: _response_message.found("Crops")
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};
module.exports.getCrop = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'crops_name', paginate = 1, farmer_id } = req.query;
    const skip = (page - 1) * limit;
    const currentDate = new Date();
    const query = farmer_id ? { farmer_id } : {};
    const records = { pastCrops: {}, upcomingCrops: {} };

    const fetchCrops = async (cropQuery) => paginate == 1
      ? Crop.find(cropQuery).limit(parseInt(limit)).skip(parseInt(skip)).sort(sortBy).populate('farmer_id', 'id name')
      : Crop.find(cropQuery).sort(sortBy).populate('farmer_id', 'id name');

    const [pastCrops, upcomingCrops] = await Promise.all([
      fetchCrops({ ...query, sowing_date: { $lt: currentDate } }),
      fetchCrops({ ...query, sowing_date: { $gt: currentDate } })
    ]);

    const [pastCount, upcomingCount] = await Promise.all([
      Crop.countDocuments({ ...query, sowing_date: { $lt: currentDate } }),
      Crop.countDocuments({ ...query, sowing_date: { $gt: currentDate } })
    ]);

    records.pastCrops = { rows: pastCrops, count: pastCount };
    records.upcomingCrops = { rows: upcomingCrops, count: upcomingCount };

    if (paginate == 1) {
      const totalPages = (count) => Math.ceil(count / limit);
      records.pastCrops.pages = totalPages(pastCount);
      records.upcomingCrops.pages = totalPages(upcomingCount);
    }

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: records,
      message: _response_message.found("Crops")
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};
module.exports.updateIndCrop=async(req,res)=>{
             try{
            
            
             const { farmer_id } = req.params;
             const {
              land_id,kharif_crops,rabi_crops,zaid_crops
            } = req.body;
            const cropDetails=await Crop.deleteMany({farmer_id,land_id});
          
            let fieldSets=[]
            let fieldSet={land_id,farmer_id}
            for(item of kharif_crops){
              console.log('fieldSet',fieldSet)
              fieldSets.push({...fieldSet,crop_season:"kharif",crop_name:item})
              
            }
            for(item of rabi_crops){
              fieldSets.push({...fieldSet,crop_season:"rabi",crop_name:item})
              
            }
            for(item of zaid_crops){
              fieldSets.push({...fieldSet,crop_season:"zaid",crop_name:item})
            }
            
            let saveCrops= await Crop.insertMany(fieldSets)
            if (!cropDetails) {
              return res.status(200).send(new serviceResponse({
                status: 404,
                message: _response_message.notFound("Crop")
              }));
            }
        
            return res.status(200).send(new serviceResponse({
              status: 200,
              data: {farmer_id,land_id,kharif_crops,rabi_crops,zaid_crops},
              message: _response_message.updated("Crop")
            }));
          
          }catch(err){
            console.log('Error',err)
            _handleCatchErrors(err, res);
           }        
}

module.exports.updateCrop = async (req, res) => {
  try {
    const { crop_id } = req.params;
    const {
      farmer_id, crop_season, crop_name, crops_name, crop_variety,
      sowing_date, harvesting_date, production_quantity, selling_price, yield, land_name
      , crop_growth_stage, crop_disease, crop_rotation, previous_crop_details, marketing_and_output, input_details, seeds
    } = req.body;

    const sowingdate = parseMonthyear(sowing_date);
    const harvestingdate = parseMonthyear(harvesting_date);
    const updatedCrop = await Crop.findByIdAndUpdate(
      crop_id,
      {
        farmer_id, crop_season, crop_name, crops_name, crop_variety,
        sowing_date: sowingdate, harvesting_date: harvestingdate, production_quantity, selling_price, yield, land_name
        , crop_growth_stage, crop_disease, crop_rotation, previous_crop_details, marketing_and_output, input_details, seeds
      },
      { new: true }
    );

    if (!updatedCrop) {
      return res.status(200).send(new serviceResponse({
        status: 404,
        message: _response_message.notFound("Crop")
      }));
    }

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: updatedCrop,
      message: _response_message.updated("Crop")
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.deleteCrop = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).send({ message: 'Please provide an ID to delete.' });
    }
    const response = await Crop.deleteOne({ _id: id });

    if (response.deletedCount > 0) {
      return res.status(200).send(new serviceResponse({
        status: 200,
        data: response,
        message: _response_message.deleted("Crop"),
      }));
    } else {
      return res.status(200).send(new serviceResponse({
        status: 404,
        data: response,
        message: _response_message.notFound("Crop"),
      }));
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
      branch_address: {
        state_name,
        district_name,
        city,
        block,
        pincode
      },
    } = req.body;

    const state_id = await getStateId(state_name);
    const district_id = await getDistrictId(district_name);

    if (!state_id || !district_id) {
      return res.status(200).send(new serviceResponse({
        status: 400,
        message: "Invalid state or district provided"
      }));
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
      }
    });

    const savedBank = await newBank.save();

    return res.status(200).send(new serviceResponse({
      status: 201,
      data: savedBank,
      message: _response_message.created("Bank")
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};
module.exports.getBank = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'bank_name', search = '', paginate = 1, farmer_id } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    const records = { count: 0 };
    if (farmer_id) {
      query.farmer_id = farmer_id;
    }

    records.rows = paginate == 1
      ? await Bank.find(query).limit(parseInt(limit)).skip(parseInt(skip)).sort(sortBy).populate('farmer_id', 'id name')
      : await Bank.find(query).sort(sortBy);

    records.count = await Bank.countDocuments(query);

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: records,
      message: _response_message.found("Bank")
    }));

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
      branch_address: {
        state_name,
        district_name,
        city,
        block,
        pincode
      },
    } = req.body;

    const state_id = await getStateId(state_name);
    const district_id = await getDistrictId(district_name);

    if (!state_id || !district_id) {
      return res.status(200).send(new serviceResponse({
        status: 400,
        message: "Invalid state or district provided"
      }));
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
        }
      },
      { new: true }
    );

    if (!updatedBank) {
      return res.status(200).send(new serviceResponse({
        status: 404,
        message: "Bank not found"
      }));
    }

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: updatedBank,
      message: _response_message.updated("Bank")
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};
module.exports.deleteBank = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).send({ message: 'Please provide an ID to delete.' });
    }
    const response = await Bank.deleteOne({ _id: id });

    if (response.deletedCount > 0) {
      return res.status(200).send(new serviceResponse({
        status: 200,
        data: response,
        message: _response_message.deleted("Bank"),
      }));
    } else {
      return res.status(200).send(new serviceResponse({
        status: 404,
        data: response,
        message: _response_message.notFound("Bank"),
      }));
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
        status: 400
      });
    }

    let farmers = [];
    let headers = [];

    if (isxlsx) {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      farmers = xlsx.utils.sheet_to_json(worksheet);
      headers = Object.keys(farmers[0]);
    } else {
      const csvContent = file.buffer.toString('utf8');
      const lines = csvContent.split('\n');
      headers = lines[0].trim().split(',');
      const dataContent = lines.slice(1).join('\n');

      const parser = csv({ headers });
      const readableStream = Readable.from(dataContent);

      readableStream.pipe(parser);
      parser.on('data', async (data) => {
        if (Object.values(data).some(val => val !== '')) {
          const result = await processFarmerRecord(data);
          if (!result.success) {
            errorArray = errorArray.concat(result.errors);
          }
        }
      });

      parser.on('end', () => {
        console.log("Stream end");
      });
      parser.on('error', (err) => {
        console.log("Stream error", err);
      });
    }

    let errorArray = [];
    const processFarmerRecord = async (rec) => {
      // Utility function to convert to lowercase if value exists
      const toLowerCaseIfExists = (value) => value ? value.toLowerCase() : value;

      const fpo_name = rec["FPO NAME*"];
      const name = rec["NAME*"];
      const father_name = rec["FATHER NAME*"];
      const mother_name = rec["MOTHER NAME"];
      const date_of_birth = rec["DATE OF BIRTH(DD-MM-YYYY)*"];
      const gender = toLowerCaseIfExists(rec["GENDER*"]);
      const marital_status = toLowerCaseIfExists(rec["MARITAL STATUS"]);
      const religion = toLowerCaseIfExists(rec["RELIGION"]);
      const category = toLowerCaseIfExists(rec["CATEGORY"]);
      const highest_edu = toLowerCaseIfExists(rec["EDUCATION LEVEL"]);
      const edu_details = rec["EDU DETAILS"];
      const type = toLowerCaseIfExists(rec["ID PROOF TYPE"]);
      const aadhar_no = rec["AADHAR NUMBER*"];
      const address_line = rec["ADDRESS LINE*"];
      const country = rec["COUNTRY NAME"];
      const state_name = rec["STATE NAME*"];
      const district_name = rec["DISTRICT NAME*"];
      const block = rec["BLOCK NAME"];
      const village = rec["VILLAGE NAME"];
      const pinCode = rec["PINCODE"];
      const mobile_no = rec["MOBILE NO*"];
      const email = rec["EMAIL ID"];
      const total_area = rec["TOTAL AREA"];
      const area_unit = toLowerCaseIfExists(rec["AREA UNIT"]);
      const khasra_no = rec["KHASRA NUMBER"];
      const khatauni = rec["KHATAUNI"];
      const sow_area = rec["SOW AREA"];
      const state = rec["STATE"];
      const district = rec["DISTRICT"];
      const landvillage = rec["ViLLAGE"];
      const expected_production = rec["EXPECTED PRODUCTION"];
      const soil_type = toLowerCaseIfExists(rec["SOIL TYPE"]);
      const soil_tested = toLowerCaseIfExists(rec["SOIL TESTED"]);
      const soil_health_card = toLowerCaseIfExists(rec["SOIL HEALTH CARD"]);
      const soil_testing_lab_name = rec["SOIL TESTING LAB NAME"];
      const lab_distance_unit = toLowerCaseIfExists(rec["LAB DISTANCE UNIT"]);
      const sowingdate = rec["SOWING DATE(MM-YYYY)*"];
      const harvestingdate = rec["HARVESTING DATE(MM-YYYY)*"];
      const crops_name = rec["CROPS NAME*"];
      const production_quantity = rec["PRODUCTION QUANTITY*"];
      const productivity = rec["PRODUCTIVITY"];
      const selling_price = rec["SELLING PRICE"];
      const market_price = rec["MARKETABLE PRICE"];
      const yield = rec["YIELD(KG)"];
      const seed_used = toLowerCaseIfExists(rec["SEED USED"]);
      const fertilizer_used = toLowerCaseIfExists(rec["FERTILIZER USED"])
      const fertilizer_name = rec["FERTILIZER NAME"];
      const fertilizer_dose = rec["FERTILIZER DOSE"];
      const pesticide_used = toLowerCaseIfExists(rec["PESTICIDE USED"]);
      const pesticide_name = rec["PESTICIDE NAME"];
      const pesticide_dose = rec["PESTICIDE DOSE"];
      const insecticide_used = toLowerCaseIfExists(rec["INSECTICIDE USED"]);
      const insecticide_name = rec["INSECTICIDE NAME"];
      const insecticide_dose = rec["INSECTICIDE DOSE"];
      const crop_insurance = toLowerCaseIfExists(rec["CROP INSURANCE"]);
      const insurance_company = rec["INSURANCE COMPANY"];
      const insurance_worth = rec["INSURANCE WORTH"];
      const crop_seasons = toLowerCaseIfExists(rec["CROP SEASONS"]);
      const bank_name = rec["BANK NAME"];
      const account_no = rec["ACCOUNT NUMBER"];
      const branch_name = rec["BRANCH"];
      const ifsc_code = rec["IFSC CODE"];
      const account_holder_name = rec["ACCOUNT HOLDER NAME"];

      let errors = [];
      if (!name || !father_name || !gender || !aadhar_no || !address_line || !state_name || !district_name || !mobile_no) {
        let missingFields = [];
        if (!name) missingFields.push('NAME');
        if (!father_name) missingFields.push('FATHER NAME');
        if (!gender) missingFields.push('GENDER');
        if (!aadhar_no) missingFields.push('AADHAR NUMBER');
        if (!address_line) missingFields.push('ADDRESS LINE');
        if (!state_name) missingFields.push('STATE NAME');
        if (!district_name) missingFields.push('DISTRICT NAME');
        if (!mobile_no) missingFields.push('MOBILE NUMBER');

        errors.push({
          error: `Required fields missing: ${missingFields.join(', ')}`
        });
      }

      if (!/^\d{12}$/.test(aadhar_no)) {
        errors.push({ record: rec, error: "Invalid Aadhar Number" });
      }
      if (!/^\d{10}$/.test(mobile_no)) {
        errors.push({ record: rec, error: "Invalid Mobile Number" });
      }

      if (errors.length > 0) return { success: false, errors };

      try {
        const state_id = await getStateId(state_name);
        const district_id = await getDistrictId(district_name);
        const land_state_id = await getStateId(state);
        const land_district_id = await getDistrictId(district);
        const sowing_date = parseMonthyear(sowingdate);
        const harvesting_date = parseMonthyear(harvestingdate);

        let associateId = user_id;
        if (!user_id) {
          const associate = await User.findOne({ 'basic_details.associate_details.organization_name': fpo_name });
          associateId = associate ? associate._id : null;
        }
        let farmerRecord = await farmer.findOne({ 'proof.aadhar_no': aadhar_no });
        if (farmerRecord) {
          // Update existing farmer record
          farmerRecord = await updateFarmerRecord(farmerRecord, {
            associate_id: associateId, name, father_name, mother_name, dob: date_of_birth, gender, marital_status, religion, category, highest_edu, edu_details, type, aadhar_no, address_line, country, state_id, district_id, block, village, pinCode, mobile_no, email, bank_name, account_no, branch_name, ifsc_code, account_holder_name,
          });
          // Update land and bank details if present
          await updateRelatedRecords(farmerRecord._id, {
            farmer_id: farmerRecord._id, total_area, khasra_no, area_unit, khatauni, sow_area, state_id: land_state_id, district_id: land_district_id, village: landvillage, expected_production, soil_type, soil_tested, soil_health_card, soil_testing_lab_name, lab_distance_unit, sowing_date, harvesting_date, crops_name, production_quantity, productivity, selling_price, market_price, yield, seed_used, fertilizer_name, fertilizer_dose, fertilizer_used, pesticide_name, pesticide_dose, pesticide_used, insecticide_name, insecticide_dose, insecticide_used, crop_insurance, insurance_company, insurance_worth, crop_seasons,
          });
        } else {
          // Insert new farmer record
          farmerRecord = await insertNewFarmerRecord({
            associate_id: associateId, name, father_name, mother_name, dob: date_of_birth, gender, aadhar_no, type, marital_status, religion, category, highest_edu, edu_details, address_line, country, state_id, district_id, block, village, pinCode, mobile_no, email, bank_name, account_no, branch_name, ifsc_code, account_holder_name,
          });
          await insertNewRelatedRecords(farmerRecord._id, {
            total_area, khasra_no, area_unit, khatauni, sow_area, state_id: land_state_id, district_id: land_district_id, village: landvillage, expected_production, soil_type, soil_tested, soil_health_card, soil_testing_lab_name, lab_distance_unit, sowing_date, harvesting_date, crops_name, production_quantity, productivity, selling_price, market_price, yield, seed_used, fertilizer_name, fertilizer_dose, fertilizer_used, pesticide_name, pesticide_dose, pesticide_used, insecticide_name, insecticide_dose, insecticide_used, crop_insurance, insurance_company, insurance_worth, crop_seasons,
          });
        }

      } catch (error) {
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
      return res.status(200).json({
        status: 400,
        data: { records: errorArray },
        errors: [{ message: "Partial upload successful. Please check the error records." }]
      });
    } else {
      return res.status(200).json({
        status: 200,
        data: {},
        message: "Farmers successfully uploaded."
      });
    }

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.exportFarmers = async (req, res) => {
  try {
    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = '-createdAt', search = '', isExport = 0 } = req.query;
    let query = {};
    if (search) {
      query = { name: { $regex: search, $options: 'i' } };
    }
    let aggregationPipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'statedistrictcities',
          localField: 'address.state_id',
          foreignField: '_id',
          as: 'state'
        }
      },
      {
        $unwind: { path: '$state', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'statedistrictcities',
          localField: 'address.district_id',
          foreignField: '_id',
          as: 'district'
        }
      },
      {
        $unwind: { path: '$district', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'lands',
          localField: '_id',
          foreignField: 'farmer_id',
          as: 'land'
        }
      },
      {
        $unwind: { path: '$land', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'crops',
          localField: '_id',
          foreignField: 'farmer_id',
          as: 'crops'
        }
      },
      {
        $unwind: { path: '$crops', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'banks',
          localField: '_id',
          foreignField: 'farmer_id',
          as: 'bank'
        }
      },
      {
        $unwind: { path: '$bank', preserveNullAndEmptyArrays: true }
      },
      { $sort: { createdAt: sortBy === '-createdAt' ? -1 : 1 } },
    ];
    if (isExport == 0) {
      aggregationPipeline.push(
        { $skip: paginate == 1 ? (parseInt(skip)) : 0 },
        { $limit: paginate == 1 ? parseInt(limit) : 10000 }
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
          "Farmer Name": item?.name || 'NA',
          "Farmer Contact": item?.mobile_no || 'NA',
          "Father Name": item?.parents?.father_name || 'NA',
          "Mother Name": item?.parents?.mother_name || 'NA',
          "Date of Birth": item?.dob || 'NA',
          "Gender": item?.gender || 'NA',
          "Marital Status": item?.marital_status || 'NA',
          "Religion": item?.religion || 'NA',
          "Category": item?.category || 'NA',
          "Highest Education": item?.education?.highest_edu || 'NA',
          "Education Details": item?.education?.edu_details || 'NA',
          "Proof Type": item?.proof?.type || 'NA',
          "Aadhar Number": item?.proof?.aadhar_no || 'NA',
          "Address Line": item?.address?.address_line || 'NA',
          "Country": item?.address?.country || 'NA',
          "State": item?.state?.state_title || 'NA',
          "District": item?.district?.district_title || 'NA',
          "Block": item?.address?.block || 'NA',
          "Village": item?.address?.village || 'NA',
          "PinCode": item?.address?.pinCode || 'NA',
          "Total Area": item?.land?.total_area || 'NA',
          "Area Unit": item?.land?.area_unit || 'NA',
          "Khasra No": item?.land?.khasra_no || 'NA',
          "Khatauni": item?.land?.khatauni || 'NA',
          "Sow Area": item?.land?.sow_area || 'NA',
          "Land Address": item?.land?.land_address?.country || 'NA',
          "Soil Type": item?.land?.soil_type || 'NA',
          "Soil Tested": item?.land?.soil_tested || 'NA',
          "Soil Health Card": item?.land?.soil_health_card || 'NA',
          "Soil Health Card Document": item?.land?.soil_health_card_doc || 'NA',
          "Soil Testing Lab Name": item?.land?.soil_testing_lab_name || 'NA',
          "Lab Distance Unit": item?.land?.lab_distance_unit || 'NA',
          "Expected Production": item?.land?.expected_production || 'NA',
          "Crop Name": item?.crops?.crops_name || 'NA',
          "Sowing Date": item?.crops?.sowing_date ? item?.crops?.sowing_date.toISOString().split('T')[0] : 'NA',
          "Harvesting Date": item?.crops?.harvesting_date ? item?.crops?.harvesting_date.toISOString().split('T')[0] : 'NA',
          "Production Quantity": item?.crops?.production_quantity || 'NA',
          "Productivity": item?.crops?.productivity || 'NA',
          "Selling Price": item?.crops?.selling_price || 'NA',
          "Market Price": item?.crops?.market_price || 'NA',
          "YIELD": item?.crops?.yield || 'NA',
          "Seed Used": item?.crops?.seed_used || 'NA',
          "Fertilizer Used": item?.crops?.fertilizer_used || 'NA',
          "Fertilizer Name": item?.crops?.fertilizer_name || 'NA',
          "Fertilizer Dose": item?.crops?.fertilizer_dose || 'NA',
          "Pesticide Used": item?.crops?.pesticide_used || 'NA',
          "Pesticide Name": item?.crops?.pesticide_name || 'NA',
          "Pesticide Dose": item?.crops?.pesticide_dose || 'NA',
          "Insecticide Used": item?.crops?.insecticide_used || 'NA',
          "Insecticide Name": item?.crops?.insecticide_name || 'NA',
          "Insecticide Dose": item?.crops?.insecticide_dose || 'NA',
          "Crop Insurance": item?.crops?.crop_insurance || 'NA',
          "Insurance Company": item?.crops?.insurance_company || 'NA',
          "Insurance Worth": item?.crops?.insurance_worth || 'NA',
          "Crop Seasons": item?.crops?.crop_seasons || 'NA',
          "Bank Name": item?.bank?.bank_name || 'NA',
          "Account Number": item?.bank?.account_no || 'NA',
          "IFSC Code": item?.bank?.ifsc_code || 'NA',
          "Account Holder Name": item?.bank?.account_holder_name || 'NA',
          "Branch Address": `${item?.bank?.branch_address?.city || 'NA'}, ${item?.bank?.branch_address?.bank_block || 'NA'}, ${item?.bank?.branch_address?.bank_pincode || 'NA'}`,
        }
      });
      if (record.length > 0) {
        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Farmer-Data.xlsx`,
          worksheetName: 'Farmer Records'
        });
      } else {
        return res.status(200).send(new serviceResponse({
          status: 400,
          data: records,
          message: _response_message.notFound("Farmer")
        }));
      }
    } else {
      return res.status(200).send(new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("Farmer")
      }));
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};


module.exports.individualfarmerList = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'name', search = '', isExport = 0 } = req.query;
    const skip = (page - 1) * limit;
    const searchFields = ['name', 'farmer_id', 'farmer_code', 'mobile_no']



    const makeSearchQuery = (searchFields) => {
      let query = {}
      query['$or'] = searchFields.map(item => ({ [item]: { $regex: search, $options: 'i' } }))
      return query
    }

    const query = search ? makeSearchQuery(searchFields) : {}
    const records = { count: 0, rows: [] };

    // individual farmer list
    records.rows = await IndividualModel.find(query)
      // .select('associate_id farmer_id name basic_details.father_husband_name mobile_no address')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort(sortBy)

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
        let address = item?.address?.address_line + ", " +
          item?.address?.village + ", " +
          item?.address?.block + ", " +
          item?.address?.district + ", " +
          item?.address?.state + ", " +
          item?.address?.pinCode

        return {
          "Farmer Name": item?.farmer_name || 'NA',
          "Mobile Number": item?.mobile_no || 'NA',
          "Associate ID": item?.associate_id || 'NA',
          "Farmer ID": item?.farmer_id ?? 'NA',
          "Father/Spouse Name": item?.father_spouse_name ?? 'NA',
          "Address": address ?? 'NA',
        }


      })
      if (record.length > 0) {

        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Farmer-List.xlsx`,
          worksheetName: `Farmer-List`
        });
      } else {
        return res.send(new serviceResponse({
          status: 200,
          data: records,
          message: _response_message.found("farmers")
        }))
      }
    }
    else {
      return res.send(new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("farmers")
      }))
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};


const getAddress = async (item) => {
  return {
    address_line: item?.address?.address_line || (`${item?.address?.address_line_1} ${item?.address?.address_line_2}`),
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
    pinCode: item?.address?.pinCode

  }
}

const getDistrict = async (districtId) => {
  const district = await StateDistrictCity.aggregate([
    {
      $match: { _id: new ObjectId(`66d8438dddba819889f4d798`) }
    },
    {
      $unwind: "$states"
    },
    {
      $unwind: "$states.districts"
    },
    {
      $match: { "states.districts._id": districtId }
    },
    {
      $project: {
        _id: 1,
        district: "$states.districts.district_title"
      }
    }


  ])
  return district[0].district

}

const getState = async (stateId) => {
  const state = await StateDistrictCity.aggregate([
    {
      $match: { _id: new ObjectId(`66d8438dddba819889f4d798`) }
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
                    as: 'item',
                    cond: { $eq: ['$$item._id', stateId] }
                  }
                },
                as: "filterState",
                in: "$$filterState.state_title"
              }
            },
            0
          ]

        }
      }
    }
  ])
  return state[0].state
}
module.exports.makeAssociateFarmer = async (req, res) => {
  try {
    const { farmer_id } = req.body;
    const { user_id } = req;

    if (!Array.isArray(farmer_id) || farmer_id.length === 0 || !user_id) {
      return res.status(400).send(new serviceResponse({
        status: 400,
        errors: [{ message: "Farmer IDs array and Associate ID are required." }]
      }));
    }

    let updatedFarmers = [];
    let notFoundFarmers = [];

    for (const id of farmer_id) {
      const localFarmer = await farmer.findOne({ _id: id, associate_id: null });

      if (localFarmer) {
        localFarmer.associate_id = user_id;
        const updatedFarmer = await localFarmer.save();
        updatedFarmers.push(updatedFarmer);
      } else {
        notFoundFarmers.push(id);
      }
    }

    if (updatedFarmers.length === 0) {
      return res.status(404).send(new serviceResponse({
        status: 404,
        errors: [{ message: "No local farmers found or already associated." }]
      }));
    }

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: { updatedFarmers, notFoundFarmers },
      message: `${updatedFarmers.length} farmers successfully made associate farmers.`
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};
module.exports.getAllFarmers = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy, search = '', paginate = 1 } = req.query;

    let associatedQuery = { associate_id: { $ne: null } }; 
    let localQuery = { associate_id: null };

    if (search) {
      const searchCondition = { name: { $regex: search, $options: 'i' } };
      associatedQuery = { ...associatedQuery, ...searchCondition };
      localQuery = { ...localQuery, ...searchCondition };
    }

    const records = {
      associatedFarmers: [],
      localFarmers: [],
      associatedFarmersCount: 0,
      localFarmersCount: 0,
    };

    const skip = (page - 1) * limit;
    const parsedLimit = parseInt(limit);

    if (paginate == 1) {
      records.associatedFarmers = await farmer
        .find(associatedQuery)
        .populate('associate_id', '_id user_code')
        .sort(sortBy ? { [sortBy]: 1 } : {})
        .skip(skip)
        .limit(parsedLimit);

      records.localFarmers = await farmer
        .find(localQuery)
        .sort(sortBy ? { [sortBy]: 1 } : {})
        .skip(skip)
        .limit(parsedLimit);

      records.associatedFarmersCount = await farmer.countDocuments(associatedQuery);
      records.localFarmersCount = await farmer.countDocuments(localQuery);
    } else {
      records.associatedFarmers = await farmer
        .find(associatedQuery)
        .populate('associate_id', '_id user_code')
        .sort(sortBy ? { [sortBy]: 1 } : {});

      records.localFarmers = await farmer
        .find(localQuery)
        .sort(sortBy ? { [sortBy]: 1 } : {});

      // Count total associated and local farmers
      records.associatedFarmersCount = await farmer.countDocuments(associatedQuery);
      records.localFarmersCount = await farmer.countDocuments(localQuery);
    }

    // Prepare response data
    const responseData = {
      associatedFarmersCount: records.associatedFarmersCount,
      localFarmersCount: records.localFarmersCount,
      associatedFarmers: records.associatedFarmers,
      localFarmers: records.localFarmers,
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
