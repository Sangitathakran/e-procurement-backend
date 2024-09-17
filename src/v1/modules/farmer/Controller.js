const { _handleCatchErrors, _generateFarmerCode, getStateId, getDistrictId, parseDate, parseMonthyear, } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { insertNewFarmerRecord, updateFarmerRecord, updateRelatedRecords, insertNewRelatedRecords } = require("@src/v1/utils/helpers/farmer_module");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const { Bank } = require("@src/v1/models/app/farmerDetails/Bank");
const { User } = require("@src/v1/models/app/auth/User");
const { _response_message } = require("@src/v1/utils/constants/messages");
const xlsx = require('xlsx');
const csv = require("csv-parser");
const Readable = require('stream').Readable;

module.exports.createFarmer = async (req, res) => {
    try {
        const {associate_id,title,name,parents,dob,gender,marital_status,religion,category,education,proof,address,mobile_no,email,status } = req.body;
        const { father_name, mother_name } = parents || {};
        const existingFarmer = await farmer.findOne({ 'mobile_no': mobile_no });

        if (existingFarmer) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                errors: [{ message: _response_message.allReadyExist("farmer") }]
            }));
        }
        const farmerCode = await _generateFarmerCode();

        const newFarmer = new farmer({associate_id,farmer_code: farmerCode,title,name,parents: {    father_name: father_name || '',    mother_name: mother_name || ''},dob,gender,marital_status,religion,category,education,proof,address,mobile_no,email,status });
        const savedFarmer = await newFarmer.save();

        return res.status(201).send(new serviceResponse({
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
        const { page = 1, limit = 10, sortBy = 'name', search = '', paginate = 1 } = req.query;
        const skip = (page - 1) * limit;

        const query = search ? { name: { $regex: search, $options: 'i' } } : {};

        const records = { count: 0 };
        records.rows = paginate == 1
            ? await farmer.find(query).limit(parseInt(limit)).skip(parseInt(skip)).sort(sortBy)
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
        associate_id, title, name, parents, dob, gender,
        marital_status, religion, category, education,
        proof, address, mobile_no, email, status
      } = req.body;
  
      const { father_name, mother_name } = parents || {};
  
      const existingFarmer = await farmer.findById(id);
      if (!existingFarmer) {
        return res.status(404).send(new serviceResponse({
          status: 404,
          errors: [{ message: _response_message.notFound("farmer") }]
        }));
      }
  
      existingFarmer.associate_id = associate_id || existingFarmer.associate_id;
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
        return res.status(404).send(new serviceResponse({
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
        farmer_id, associate_id, total_area, khasra_no, area_unit, khatauni, sow_area, state_name,
        district_name, sub_district, expected_production, soil_type, soil_tested,
        soil_health_card, soil_testing_lab_name, lab_distance_unit
      } = req.body;
  
      const existingLand = await Land.findOne({ 'khasra_no': khasra_no });
  
      if (existingLand) {
        return res.status(400).send(new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.allReadyExist("Land") }]
        }));
      }
      const state_id = await getStateId(state_name);
      const district_id = await getDistrictId(district_name);
      const newLand = new Land({
        farmer_id, associate_id, total_area, khasra_no, area_unit, khatauni, sow_area,
        land_address:{
            state_id, 
            district_id, 
            sub_district
          },
        expected_production, soil_type, soil_tested,
        soil_health_card, soil_testing_lab_name, lab_distance_unit
      });
      const savedLand = await newLand.save();
  
      return res.status(201).send(new serviceResponse({
        status: 201,
        data: savedLand,
        message: _response_message.created("Land")
      }));
  
    } catch (error) {
      _handleCatchErrors(error, res);
    }
  };

  module.exports.updateLand = async (req, res) => {
    try {
      const { land_id } = req.params;
      const {
        total_area, khasra_no, area_unit, khatauni, sow_area, state_name,
        district_name, sub_district, expected_production, soil_type, soil_tested,
        soil_health_card, soil_testing_lab_name, lab_distance_unit
      } = req.body;
  
      const state_id = await getStateId(state_name);
      const district_id = await getDistrictId(district_name);
  
      const updatedLand = await Land.findByIdAndUpdate(
        land_id,
        {
          total_area, khasra_no, area_unit, khatauni, sow_area, state_id,
          district_id, sub_district, expected_production, soil_type, soil_tested,
          soil_health_card, soil_testing_lab_name, lab_distance_unit
        },
        { new: true }
      );
  
      if (!updatedLand) {
        return res.status(404).send(new serviceResponse({
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
  
  module.exports.updateLand = async (req, res) => {
    try {
        
      const { land_id } = req.params;
      
      const {
        total_area, khasra_no, area_unit, khatauni, sow_area, state_name,
        district_name, sub_district, expected_production, soil_type, soil_tested,
        soil_health_card, soil_testing_lab_name, lab_distance_unit
      } = req.body;
  
      const state_id = await getStateId(state_name);
      const district_id = await getDistrictId(district_name);
  
      const updatedLand = await Land.findByIdAndUpdate(
        land_id,
        {
          total_area,
          khasra_no,
          area_unit,
          khatauni,
          sow_area,
          land_address: {
            state_id,
            district_id,
            sub_district
          },
          expected_production,
          soil_type,
          soil_tested,
          soil_health_card,
          soil_testing_lab_name,
          lab_distance_unit
        },
        { new: true }
      );
  
      if (!updatedLand) {
        return res.status(404).send(new serviceResponse({
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
          return res.status(404).send(new serviceResponse({
            status: 404,
            data: response,
            message: _response_message.notFound("Land"),
          }));
        }
      } catch (error) {
        _handleCatchErrors(error, res);
      }
  };

  module.exports.createCrop = async (req, res) =>{
    try {
        const {
          associate_id, farmer_id, sowing_date, harvesting_date, crops_name, production_quantity,
          area_unit, total_area, productivity, selling_price, market_price, yield, seed_used,
          fertilizer_used, fertilizer_name, fertilizer_dose, pesticide_used, pesticide_name,
          pesticide_dose, insecticide_used, insecticide_name, insecticide_dose, crop_insurance,
          insurance_company, insurance_worth, crop_seasons
        } = req.body;
    
        const sowingdate = parseMonthyear(sowing_date);
        const harvestingdate = parseMonthyear(harvesting_date);
        const newCrop = new Crop({
          associate_id, farmer_id, sowing_date:sowingdate, harvesting_date:harvestingdate, crops_name, production_quantity,
          area_unit, total_area, productivity, selling_price, market_price, yield, seed_used,
          fertilizer_used, fertilizer_name, fertilizer_dose, pesticide_used, pesticide_name,
          pesticide_dose, insecticide_used, insecticide_name, insecticide_dose, crop_insurance,
          insurance_company, insurance_worth, crop_seasons
        });
    
        const savedCrop = await newCrop.save();
    
        return res.status(201).send(new serviceResponse({
            status: 201,
            data: savedCrop,
            message: _response_message.created("Crop")
          }));
    
        } catch (error) {
            _handleCatchErrors(error, res);
          }
  };
  module.exports.updateCrop = async (req, res) => {
    try {
        const { crop_id } = req.params;
        const {
            associate_id, farmer_id, sowing_date, harvesting_date, crops_name,
            production_quantity, area_unit, total_area, productivity, selling_price,
            market_price, yield, seed_used, fertilizer_used, fertilizer_name, fertilizer_dose,
            pesticide_used, pesticide_name, pesticide_dose, insecticide_used, insecticide_name,
            insecticide_dose, crop_insurance, insurance_company, insurance_worth, crop_seasons
        } = req.body;

        const sowingdate = parseMonthyear(sowing_date);
        const harvestingdate = parseMonthyear(harvesting_date);
        const updatedCrop = await Crop.findByIdAndUpdate(
            crop_id,
            {
                associate_id, farmer_id, sowing_date:sowingdate, harvesting_date:harvestingdate, crops_name,
                production_quantity, area_unit, total_area, productivity, selling_price,
                market_price, yield, seed_used, fertilizer_used, fertilizer_name, fertilizer_dose,
                pesticide_used, pesticide_name, pesticide_dose, insecticide_used, insecticide_name,
                insecticide_dose, crop_insurance, insurance_company, insurance_worth, crop_seasons
            },
            { new: true }
        );

        if (!updatedCrop) {
            return res.status(404).send(new serviceResponse({
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
          return res.status(404).send(new serviceResponse({
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
    console.log(req.body);
    try {
        const {
            farmer_id, 
            associate_id, 
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
            return res.status(400).send(new serviceResponse({
                status: 400,
                message: "Invalid state or district provided"
            }));
        }

        const newBank = new Bank({
            farmer_id, 
            associate_id, 
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
        
        return res.status(201).send(new serviceResponse({
            status: 201,
            data: savedBank,
            message: _response_message.created("Bank")
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
            associate_id, 
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
            return res.status(400).send(new serviceResponse({
                status: 400,
                message: "Invalid state or district provided"
            }));
        }

        const updatedBank = await Bank.findByIdAndUpdate(
            bank_id,
            {
                farmer_id, 
                associate_id, 
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
            return res.status(404).send(new serviceResponse({
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
          return res.status(404).send(new serviceResponse({
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

            parser.on('end', (err, data) => {
                console.log("Streem end")
            });
            parser.on('error', (err, data) => {
                console.log("Streem error")
            });
        }

        let errorArray = [];
        const processFarmerRecord = async (rec) => {
            const fpo_name = rec["FPO NAME*"];
            const title = rec["TITLE"];
            const name = rec["NAME*"];
            const father_name = rec["FATHER NAME*"];
            const mother_name = rec["MOTHER NAME"];
            const date_of_birth = rec["DATE OF BIRTH(DD-MM-YYYY)*"];
            const gender = rec["GENDER*"];
            const marital_status = rec["MARITAL STATUS"];
            const religion = rec["RELIGION"];
            const category = rec["CATEGORY"];
            const highest_edu = rec["EDUCATION LEVEL"];
            const edu_details = rec["EDU DETAILS"];
            const type = rec["ID PROOF TYPE"];
            const aadhar_no = rec["AADHAR NUMBER*"];
            const address_line = rec["ADDRESS LINE*"];
            const state_name = rec["STATE NAME*"];
            const district_name = rec["DISTRICT NAME*"];
            const block = rec["BLOCK NAME"];
            const village = rec["VILLAGE NAME"];
            const pinCode = rec["PINCODE"];
            const mobile_no = rec["MOBILE NO*"];
            const email = rec["EMAIL ID"];
            const total_area = rec["TOTAL AREA"];
            const area_unit = rec["AREA UNIT"];
            const khasra_no = rec["KHASRA NUMBER"];
            const khatauni = rec["KHATAUNI"];
            const sow_area = rec["SOW AREA"];
            const state = rec["STATE"];
            const district = rec["DISTRICT"];
            const sub_district = rec["SUB DISTRICT"];
            const expected_production = rec["EXPECTED PRODUCTION"];
            const soil_type = rec["SOIL TYPE"];
            const soil_tested = rec["SOIL TESTED"];
            const soil_health_card = rec["SOIL HEALTH CARD"];
            const soil_testing_lab_name = rec["SOIL TESTING LAB NAME"];
            const lab_distance_unit = rec["LAB DISTANCE UNIT"];
            const sowingdate = rec["SOWING DATE(MM-YYYY)*"];
            const harvestingdate = rec["HARVESTING DATE(MM-YYYY)*"];
            const crops_name = rec["CROPS NAME*"];
            const production_quantity = rec["PRODUCTION QUANTITY*"];
            const productivity = rec["PRODUCTIVITY"];
            const selling_price = rec["SELLING PRICE"];
            const market_price = rec["MARKETABLE PRICE"];
            const yield = rec["YIELD(KG)"];
            const seed_used = rec["SEED USED"];
            const fertilizer_used = rec["FERTILIZER USED"];
            const fertilizer_name = rec["FERTILIZER NAME"];
            const fertilizer_dose = rec["FERTILIZER DOSE"];
            const pesticide_used = rec["PESTICIDE USED"];
            const pesticide_name = rec["PESTICIDE NAME"];
            const pesticide_dose = rec["PESTICIDE DOSE"];
            const insecticide_used = rec["INSECTICIDE USED"];
            const insecticide_name = rec["INSECTICIDE NAME"];
            const insecticide_dose = rec["INSECTICIDE DOSE"];
            const crop_insurance = rec["CROP INSURANCE"];
            const insurance_company = rec["INSURANCE COMPANY"];
            const insurance_worth = rec["INSURANCE WORTH"];
            const crop_seasons = rec["CROP SEASONS*"];
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

            if (!fpo_name || !name || !father_name || !date_of_birth || !gender || !aadhar_no || !address_line || !state_name || !district_name || !mobile_no || account_no) {
                errors.push({ record: rec, error: "Required fields missing" });
            }
            if (!/^\d{12}$/.test(aadhar_no)) {
                errors.push({ record: rec, error: "Invalid Aadhar Number" });
            }
            if (!/^\d{10}$/.test(mobile_no)) {
                errors.push({ record: rec, error: "Invalid Mobile Number" });
            }

            if (errors.length > 0) return { success: false, errors };

            try {
                state_id = await getStateId(state_name);
                const district_id = await getDistrictId(district_name);
                const land_state_id = await getStateId(state);
                const land_district_id = await getDistrictId(district);
                const bank_state_id = await getStateId(bank_state_name);
                const bank_district_id = await getDistrictId(bank_district_name);
                const dob = await parseDate(date_of_birth);
                const sowing_date = parseMonthyear(sowingdate);
                const harvesting_date = parseMonthyear(harvestingdate);

                const associate = await User.findOne({ 'basic_details.associate_details.organization_name': fpo_name });
                const associateId = associate ? associate._id : null;


                let farmerRecord = await farmer.findOne({ 'proof.aadhar_no': aadhar_no });

                if (farmerRecord) {
                    farmerRecord = await updateFarmerRecord(farmerRecord, {
                        associate_id: associateId, title, name, father_name, mother_name, dob, gender, marital_status, religion, category, highest_edu, edu_details, type, aadhar_no, address_line, state_id, district_id, block, village, pinCode, mobile_no, email
                    });

                    updateRelatedRecords(farmerRecord._id, {
                        farmer_id: farmerRecord._id, associate_id: associateId, total_area, khasra_no, area_unit, khatauni, sow_area, state_id: land_state_id, district_id: land_district_id, sub_district, expected_production, soil_type, soil_tested, soil_health_card, soil_testing_lab_name, lab_distance_unit, sowing_date, harvesting_date, crops_name, production_quantity, productivity, selling_price, market_price, yield, seed_used, fertilizer_name, fertilizer_dose, fertilizer_used, pesticide_name, pesticide_dose, pesticide_used, insecticide_name, insecticide_dose, insecticide_used, crop_insurance, insurance_company, insurance_worth, crop_seasons,
                        bank_name, account_no, branch, ifsc_code, account_holder_name, bank_state_id, bank_district_id, bank_block, city, bank_pincode,
                    });
                } else {
                    farmerRecord = await insertNewFarmerRecord({
                        associate_id: associateId, title, name, father_name, mother_name, dob, gender, aadhar_no, type, marital_status, religion, category, highest_edu, edu_details, address_line, state_id, district_id, block, village, pinCode, mobile_no, email,
                    });

                    insertNewRelatedRecords(farmerRecord._id, {
                        associate_id: associateId, total_area, khasra_no, area_unit, khatauni, sow_area, state_id: land_state_id, district_id: land_district_id, sub_district, expected_production, soil_type, soil_tested, soil_health_card, soil_testing_lab_name, lab_distance_unit, sowing_date, harvesting_date, crops_name, production_quantity, productivity, selling_price, market_price, yield, seed_used, fertilizer_name, fertilizer_dose, fertilizer_used, pesticide_name, pesticide_dose, pesticide_used, insecticide_name, insecticide_dose, insecticide_used, crop_insurance, insurance_company, insurance_worth, crop_seasons, bank_name, account_no, branch, ifsc_code, account_holder_name, bank_state_id, bank_district_id, bank_block, city, bank_pincode,
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