
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");
const { _generateFarmerCode,_handleCatchErrors, generateFarmerId, getState, getDistrict } = require("@src/v1/utils/helpers");
const { Bank } = require("@src/v1/models/app/farmerDetails/Bank");
const { findOne } = require("@src/v1/models/master/UserRole");
const { object } = require("joi");
const {  _center_type } = require('@src/v1/utils/constants');



exports.insertNewFarmerRecord = async (data, stateList) => {
    try {
      const newFarmer = new farmer({
        user_type: _center_type.associate,
        associate_id: data.associate_id,
        basic_details: {
          dob: data.dob,
          gender: data.gender,
          mobile_no: data.mobile_no,
          email: data.email,
          category: data.category,
        },
        name: data.name,
        parents: { father_name: data.father_name, mother_name: data.mother_name },
        proof: { type: data.type, aadhar_no: data.aadhar_no },
        marital_status: data.marital_status,
        religion: data.religion,
        education: {
          highest_edu: data.highest_edu,
          edu_details: data.edu_details,
        },
        address: {
          address_line: data.address_line,
          country: data.country,
          state_id: data.state_id,
          district_id: data.district_id,
          block: data.block,
          village: data.village,
          pin_code: data.pinCode,
        },
        bank_details: {
          bank_name: data.bank_name,
          account_no: data.account_no,
          branch_name: data.branch_name,
          ifsc_code: data.ifsc_code,
          account_holder_name: data.account_holder_name,
        },
      });
  
      const savedFarmer = await newFarmer.save();
      const state= await getState(savedFarmer.address.state_id);
      const district = await getDistrict(savedFarmer.address.district_id);
      let obj = {
        _id: savedFarmer._id,
        address: {
          state: state.state_title,
          district: district.district_title,
        }
      };
      let farmerId;
      let uniqueId = true;
     const uniquefarmerid = async () => {
        farmerId = generateFarmerId(obj);
        const exitingFarmer_id = await farmer.findOne({farmer_id: farmerId});
        if(!exitingFarmer_id){
            uniqueId = false;
        }
     }
      while(uniqueId){
        await uniquefarmerid()
      }
      savedFarmer.farmer_id = farmerId;
      await savedFarmer.save();
  
      return savedFarmer;
    } catch (error) {
      console.error("Error inserting farmer record:", error);
      return null;
    }
  };
  

exports.updateFarmerRecord = async (farmerRecord, data) => {
    try{
    farmerRecord.user_type = _center_type.associate,
    farmerRecord.associate_id = data.associate_id;
    farmerRecord.name = data.name;
    farmerRecord.parents.father_name = data.father_name;
    farmerRecord.parents.mother_name = data.mother_name;
    farmerRecord.basic_details.dob = data.dob;
    farmerRecord.basic_details.gender = data.gender;
    farmerRecord.marital_status = data.marital_status;
    farmerRecord.religion = data.religion;
    farmerRecord.category = data.category;
    farmerRecord.education.highest_edu = data.highest_edu;
    farmerRecord.education.edu_details = data.edu_details;
    farmerRecord.proof.type = data.type;
    farmerRecord.proof.aadhar_no = data.aadhar_no;
    farmerRecord.address.address_line = data.address_line;
    farmerRecord.address.country = data.country;
    farmerRecord.address.state_id = data.state_id;
    farmerRecord.address.district_id = data.district_id;
    farmerRecord.address.block = data.block;
    farmerRecord.address.village = data.village;
    farmerRecord.address.pinCode = data.pinCode;
    farmerRecord.bank_details.bank_name = data.bank_name;
    farmerRecord.bank_details.account_no = data.account_no;
    farmerRecord.bank_details.branch_name = data.branch_name;
    farmerRecord.bank_details.ifsc_code = data.ifsc_code;
    farmerRecord.bank_details.account_holder_name = data.account_holder_name;
    farmerRecord.basic_details.mobile_no = data.mobile_no;
    farmerRecord.basic_details.email_id = data.email;
    await farmerRecord.save();
    return farmerRecord;
} catch (error) {
    return null;
}
};

exports.updateRelatedRecords = async (farmer_id, data) => {
    try{
    const land = await Land.findOneAndUpdate(
        { farmer_id },
        {
            farmer_id: data.farmer_id,
            total_area: data.total_area,
            khasra_number: data.khasra_number,
            area_unit: data.area_unit,
            khtauni_number: data.khtauni_number,
            soil_type: data.soil_type,
            soil_tested: data.soil_tested,
            land_address: {
                state_id: data.state_id,
                district_id: data.district_id,
                village: data.village,
            },
            // sow_area: data.sow_area,
            // expected_production: data.expected_production,
            // soil_health_card: data.soil_health_card,
            // soil_testing_lab_name: data.soil_testing_lab_name,
            // lab_distance_unit: data.lab_distance_unit,
        }
    );
    await Crop.updateOne(
        { farmer_id },
        {
            farmer_id: data.farmer_id,
            land_id: land._id,
            sowing_date: data.sowing_date,
            harvesting_date: data.harvesting_date,
            crop_name: data.crop_name,
            production_quantity: data.production_quantity,
            selling_price: data.selling_price,
            yield: data.yield,
            crop_season: data.crop_season,
            // productivity: data.productivity,
            // market_price: data.market_price,
            // seed_used: data.seed_used,
            // fertilizer_name: data.fertilizer_name,
            // fertilizer_dose: data.fertilizer_dose,
            // fertilizer_used: data.fertilizer_used,
            // pesticide_name: data.pesticide_name,
            // pesticide_dose: data.pesticide_dose,
            // pesticide_used: data.pesticide_used,
            // insecticide_name: data.insecticide_name,
            // insecticide_dose: data.insecticide_dose,
            // insecticide_used: data.insecticide_used,
            // crop_insurance: data.crop_insurance,
            // insurance_company: data.insurance_company,
            // insurance_worth: data.insurance_worth,
        }
    );
} catch (error) {
    return null;
  }
};

exports.insertNewRelatedRecords = async (farmer_id, data, res) => {
    try{
    const newLand = new Land({
        farmer_id,
        total_area: data.total_area,
        khasra_number: data.khasra_number,
        area_unit: data.area_unit,
        khtauni_number: data.khtauni_number,
        soil_type: data.soil_type,
        soil_tested: data.soil_tested,
        land_address: {
            state_id: data.state_id,
            district_id: data.district_id,
            village: data.village,
        },
        // sow_area: data.sow_area,
        // expected_production: data.expected_production,
        // soil_health_card: data.soil_health_card,
        // soil_testing_lab_name: data.soil_testing_lab_name,
        // lab_distance_unit: data.lab_distance_unit,
    });
     await newLand.save();

    const newCrop = new Crop({
        farmer_id,
        land_id: newLand._id,
        sowing_date: data.sowing_date,
        harvesting_date: data.harvesting_date,
        crop_name: data.crop_name,
        production_quantity: data.production_quantity,
        selling_price: data.selling_price,
        yield: data.yield,
        crop_season: data.crop_season,
        // productivity: data.productivity,
        // market_price: data.market_price,
        // seed_used: data.seed_used,
        // fertilizer_name: data.fertilizer_name,
        // fertilizer_dose: data.fertilizer_dose,
        // fertilizer_used: data.fertilizer_used,
        // pesticide_name: data.pesticide_name,
        // pesticide_dose: data.pesticide_dose,
        // pesticide_used: data.pesticide_used,
        // insecticide_name: data.insecticide_name,
        // insecticide_dose: data.insecticide_dose,
        // insecticide_used: data.insecticide_used,
        // crop_insurance: data.crop_insurance,
        // insurance_company: data.insurance_company,
        // insurance_worth: data.insurance_worth,
    });
    await newCrop.save();
    return { newLand, newCrop };
} catch (error) {
    return null;
  }
};

