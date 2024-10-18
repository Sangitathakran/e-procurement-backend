
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");
const { _generateFarmerCode,_handleCatchErrors } = require("@src/v1/utils/helpers");
const { Bank } = require("@src/v1/models/app/farmerDetails/Bank");

exports.insertNewFarmerRecord = async (data) => {
    try {
    const farmerCode = await _generateFarmerCode();
    const newFarmer = new farmer({
        farmer_type:"Associate",
        associate_id: data.associate_id,
        farmer_code: farmerCode,
        basic_details: { dob: data.dob, gender: data.gender, mobile_no: data.mobile_no, email: data.email,},
        name: data.name,
        parents: { father_name: data.father_name, mother_name: data.mother_name,},
        proof: { type: data.type, aadhar_no: data.aadhar_no },
        marital_status: data.marital_status,
        religion: data.religion,
        category: data.category,
        education: { highest_edu:data.highest_edu, edu_details: data.edu_details },
        address: {
            address_line: data.address_line,
            country:data.country,
            state_id: data.state_id,
            district_id: data.district_id,
            block: data.block,
            village: data.village,
            pinCode: data.pinCode,
        },
        bank_details: {
            bank_name: data.bank_name, 
            account_no: data.account_no, 
            branch_name: data.branch_name, 
            ifsc_code: data.ifsc_code, 
            account_holder_name: data.account_holder_name,
        },
    });
    await newFarmer.save();
    return newFarmer;
} catch (error) {
    return null;
}
};

exports.updateFarmerRecord = async (farmerRecord, data) => {
    try{
    farmerRecord.farmer_type = "Associate",
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
            khasra_no: data.khasra_no,
            area_unit: data.area_unit,
            khatauni: data.khatauni,
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
            crops_name: data.crops_name,
            production_quantity: data.production_quantity,
            selling_price: data.selling_price,
            yield: data.yield,
            crop_seasons: data.crop_seasons,
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
        khasra_no: data.khasra_no,
        area_unit: data.area_unit,
        khatauni: data.khatauni,
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
        crops_name: data.crops_name,
        production_quantity: data.production_quantity,
        selling_price: data.selling_price,
        yield: data.yield,
        crop_seasons: data.crop_seasons,
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

