const { _handleCatchErrors, _generateFarmerCode, getStateId, getDistrictId, parseDate, parseMonthyear, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse,sendResponse } = require("@src/v1/utils/helpers/api_response");
const { insertNewFarmerRecord, updateFarmerRecord, updateRelatedRecords, insertNewRelatedRecords } = require("@src/v1/utils/helpers/farmer_module");
const  {farmer} = require("@src/v1/models/app/farmerDetails/Farmer");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const { Bank } = require("@src/v1/models/app/farmerDetails/Bank");
const { User } = require("@src/v1/models/app/auth/User");
const { _response_message } = require("@src/v1/utils/constants/messages");
const xlsx = require('xlsx');
const csv = require("csv-parser");
const Readable = require('stream').Readable;
const {smsService}=require('../../utils/third_party/SMSservices');
const OTPModel=require("../../models/app/auth/OTP")
const {generateJwtToken}=require('../../utils/helpers/jwt')
const _individual_farmer_onboarding_steps=require('@src/v1/utils/constants')
module.exports.sendOTP = async (req, res) => {
  try {
    const { mobileNumber, acceptTermCondition } = req.body;
    // Validate the mobile number
    const isValidMobile = await validateMobileNumber(mobileNumber);
    if (!isValidMobile) {
      return  sendResponse({res,
        status: 400,
        message: _response_message.invalid("mobile number"),
      })
    }

    if (!acceptTermCondition) {
      return   sendResponse({res,
        status: 400,
        message: _response_message.Accept_term_condition(),
      })
    }

    await smsService.sendOTPSMS(mobileNumber);

    return sendResponse({res,
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
      return  sendResponse({res,
        status: 400,
        message: _response_message.invalid("mobile number"),
      })
    }

    // Find the OTP for the provided mobile number
    const userOTP = await OTPModel.findOne({ phone: mobileNumber });
    // Verify the OTP
    if (inputOTP !== userOTP?.otp) {
      return sendResponse({res,
        status: 400,
        message: _response_message.otp_not_verified("OTP"),
      })
    }

    // Find the farmer data and verify OTP
    let individualFormerData = await farmer.findOne({ 
      mobile_no: mobileNumber,
      is_verify_otp:true
    });

    // If farmer data does not exist, create a new one
    if (!individualFormerData) {
      individualFormerData = await new farmer({
        mobile_no: mobileNumber,
        is_verify_otp:true,
        steps: _individual_farmer_onboarding_steps, // Ensure that this field is set as required
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
    if(!registerName)
        return sendResponse({res, status: 400, data:null, message: _response_message.notProvided('Name')})

    // Check if the user already exists and is verified
    const farmerData = await farmer.findOneAndUpdate(
      { mobile_no: req.mobile_no },
      { $set: { name: registerName, 
                user_type: "5" ,
                basic_details : {name: registerName, mobile_no: req.mobile_no} 
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
      farmerDetails.steps = req.body?.steps;
      await farmerDetails.save();


      const farmerData = await farmer.findById(farmer_id)

      return sendResponse({res,
        status:200,
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
      ? `${screenName} allStepsCompletedStatus steps`
      : null;

    if (selectFields) {
      farmerDetails = await farmer.findOne({ _id: id }).select(
        selectFields
      );
    } else {
      farmerDetails = await farmer.findOne({ _id: id });
    }

    if (farmerDetails) {
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
        return  sendResponse({
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
   
    if (farmerDetails && farmer_id) {
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
        //console.log("isMszSent==>",isMszSent)
        if (isMszSent && isMszSent.response && isMszSent.response.status === 'success') {
          // Message was sent successfully
          farmerDetails.is_welcome_msg_send = true;
        }  
        
        const farmerUpdatedDetails = await farmerDetails.save();
        return sendResponse({res,status:200, data: farmerUpdatedDetails })
      }

      return sendResponse({
        res,
        status:200,
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
    const { associate_id, title, name, parents, dob, gender, marital_status, religion, category, education, proof, address, mobile_no, email, status } = req.body;
    const { father_name, mother_name } = parents || {};
    const existingFarmer = await farmer.findOne({ 'proof.aadhar_no': proof.aadhar_no });

    if (existingFarmer) {
      return res.status(200).send(new serviceResponse({
        status: 400,
        errors: [{ message: _response_message.allReadyExist("farmer") }]
      }));
    }
    const farmerCode = await _generateFarmerCode();

    const newFarmer = new farmer({ associate_id, farmer_code: farmerCode, title, name, parents: { father_name: father_name || '', mother_name: mother_name || '' }, dob, gender, marital_status, religion, category, education, proof, address, mobile_no, email, status });
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
    const { page = 1, limit = 10, sortBy, search = '', skip, paginate = 1, is_associated = 1 } = req.query;
    const { user_id } = req

    let query = {};
    const records = { count: 0 };
    if (is_associated == 1) {
      query.associate_id = user_id;
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    records.rows = paginate == 1
      ? await farmer.find(query).limit(parseInt(limit)).skip(parseInt(skip)).sort(sortBy).populate('associate_id', '_id user_code')
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
      farmer_id, area, land_name, cultivation_area, area_unit, state, district,
      village, block, khtauni_number, khasra_number, khata_number,
      soil_type, soil_tested, uploadSoil_health_card,opt_for_soil_testing,soil_testing_agencies,upload_geotag
    } = req.body;

    const existingLand = await Land.findOne({ 'khasra_number': khasra_number });

    if (existingLand) {
      return res.status(200).send(new serviceResponse({
        status: 400,
        errors: [{ message: _response_message.allReadyExist("Land") }]
      }));
    }
    const state_id = await getStateId(state);
    const district_id = await getDistrictId(district);
    const newLand = new Land({
      area, land_name, cultivation_area, area_unit, state:state_id, district:district_id,
      village, block, khtauni_number, khasra_number, khata_number,
      soil_type, soil_tested, uploadSoil_health_card,opt_for_soil_testing,soil_testing_agencies,upload_geotag
    });
    const savedLand = await newLand.save();

    return res.status(200).send(new serviceResponse({
      status: 201,
      data: savedLand,
      message: _response_message.created("Land")
    }));

  } catch (error) {
     console.log('error',error)
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

    records.rows = paginate == 1
      ? await Land.find(query).limit(parseInt(limit)).skip(parseInt(skip)).sort(sortBy).populate('farmer_id', 'id name')
      : await Land.find(query).sort(sortBy).populate('farmer_id', 'id name').populate('farmer_id', 'id name')

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
      area, land_name, cultivation_area, area_unit, state, district,
      village, block, khtauni_number, khasra_number, khata_number,
      soil_type, soil_tested, uploadSoil_health_card,opt_for_soil_testing,soil_testing_agencies,upload_geotag
    } = req.body;

    const state_id = await getStateId(state_name);
    const district_id = await getDistrictId(district_name);

    const updatedLand = await Land.findByIdAndUpdate(
      land_id,
      {
        area, land_name, cultivation_area, area_unit, state:state_id, district:district_id,
      village, block, khtauni_number, khasra_number, khata_number,
      soil_type, soil_tested, uploadSoil_health_card,opt_for_soil_testing,soil_testing_agencies,upload_geotag
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
      farmer_id, crop_season, crop_name, crops_name, crop_variety,
      sowing_date, harvesting_date, production_quantity, selling_price,yield,land_name
      ,crop_growth_stage,crop_disease,crop_rotation,previous_crop_details,marketing_and_output,input_details,seeds
    } = req.body;

    const sowingdate = parseMonthyear(sowing_date);
    const harvestingdate = parseMonthyear(harvesting_date);
    const newCrop = new Crop({
      farmer_id, crop_season, crop_name, crops_name, crop_variety,
      sowing_date:sowingdate, harvesting_date:harvestingdate, production_quantity, selling_price,yield,land_name
      ,crop_growth_stage,crop_disease,crop_rotation,previous_crop_details,marketing_and_output,input_details,seeds
    });

    const savedCrop = await newCrop.save();

    return res.status(200).send(new serviceResponse({
      status: 201,
      data: savedCrop,
      message: _response_message.created("Crop")
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


module.exports.updateCrop = async (req, res) => {
  try {
    const { crop_id } = req.params;
    const {
      farmer_id, crop_season, crop_name, crops_name, crop_variety,
      sowing_date, harvesting_date, production_quantity, selling_price,yield,land_name
      ,crop_growth_stage,crop_disease,crop_rotation,previous_crop_details,marketing_and_output,input_details,seeds
    } = req.body;

    const sowingdate = parseMonthyear(sowing_date);
    const harvestingdate = parseMonthyear(harvesting_date);
    const updatedCrop = await Crop.findByIdAndUpdate(
      crop_id,
      {
        farmer_id, crop_season, crop_name, crops_name, crop_variety,
      sowing_date:sowingdate, harvesting_date:harvestingdate, production_quantity, selling_price,yield,land_name
      ,crop_growth_stage,crop_disease,crop_rotation,previous_crop_details,marketing_and_output,input_details,seeds
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
      const title = toLowerCaseIfExists(rec["TITLE"]);
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
      const sub_district = rec["SUB DISTRICT"];
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
      const branch = rec["BRANCH"];
      const ifsc_code = rec["IFSC CODE"];
      const account_holder_name = rec["ACCOUNT HOLDER NAME"];
      const bank_state_name = rec["BANK STATE NAME"];
      const bank_district_name = rec["BANK DISTRICT NAME"];
      const bank_block = rec["BANK BLOCK NAME"];
      const city = rec["CITY"];
      const bank_pincode = rec["BANK PINCODE"];

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
        const bank_state_id = await getStateId(bank_state_name);
        const bank_district_id = await getDistrictId(bank_district_name);
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
            associate_id: associateId, title, name, father_name, mother_name, dob: date_of_birth, gender, marital_status, religion, category, highest_edu, edu_details, type, aadhar_no, address_line, country, state_id, district_id, block, village, pinCode, mobile_no, email
          });

          // Update land and bank details if present
          await updateRelatedRecords(farmerRecord._id, {
            farmer_id: farmerRecord._id,  total_area, khasra_no, area_unit, khatauni, sow_area, state_id: land_state_id, district_id: land_district_id, sub_district, expected_production, soil_type, soil_tested, soil_health_card, soil_testing_lab_name, lab_distance_unit, sowing_date, harvesting_date, crops_name, production_quantity, productivity, selling_price, market_price, yield, seed_used, fertilizer_name, fertilizer_dose, fertilizer_used, pesticide_name, pesticide_dose, pesticide_used, insecticide_name, insecticide_dose, insecticide_used, crop_insurance, insurance_company, insurance_worth, crop_seasons,
            bank_name, account_no, branch, ifsc_code, account_holder_name, bank_state_id, bank_district_id, bank_block, city, bank_pincode,
          });
        } else {
          // Insert new farmer record
          farmerRecord = await insertNewFarmerRecord({
            associate_id: associateId, title, name, father_name, mother_name, dob: date_of_birth, gender, aadhar_no, type, marital_status, religion, category, highest_edu, edu_details, address_line, country, state_id, district_id, block, village, pinCode, mobile_no, email,
          });
          await insertNewRelatedRecords(farmerRecord._id, {
            total_area, khasra_no, area_unit, khatauni, sow_area, state_id: land_state_id, district_id: land_district_id, sub_district, expected_production, soil_type, soil_tested, soil_health_card, soil_testing_lab_name, lab_distance_unit, sowing_date, harvesting_date, crops_name, production_quantity, productivity, selling_price, market_price, yield, seed_used, fertilizer_name, fertilizer_dose, fertilizer_used, pesticide_name, pesticide_dose, pesticide_used, insecticide_name, insecticide_dose, insecticide_used, crop_insurance, insurance_company, insurance_worth, crop_seasons, bank_name, account_no, branch, ifsc_code, account_holder_name, bank_state_id, bank_district_id, bank_block, city, bank_pincode,
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