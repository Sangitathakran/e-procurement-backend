
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");
const { _generateFarmerCode, } = require("@src/v1/utils/helpers");
const { Bank } = require("@src/v1/models/app/farmerDetails/Bank");

exports.insertNewFarmerRecord = async (data) => {
    const farmerCode = await _generateFarmerCode();
    const newFarmer = new farmer({
        associate_id: data.associate_id,
        farmer_code: farmerCode,
        title: data.title,
        name: data.name,
        parents: { father_name: data.father_name, mother_name: data.mother_name },
        dob: data.dob,
        gender: data.gender,
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
        mobile_no: data.mobile_no,
        email: data.email,
    });
    await newFarmer.save();
    return newFarmer;
};

exports.updateFarmerRecord = async (farmerRecord, data) => {
    farmerRecord.associate_id = data.associate_id;
    farmerRecord.title = data.title;
    farmerRecord.name = data.name;
    farmerRecord.parents.father_name = data.father_name;
    farmerRecord.parents.mother_name = data.mother_name;
    farmerRecord.dob = data.dob;
    farmerRecord.gender = data.gender;
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
    farmerRecord.mobile_no = data.mobile_no;
    farmerRecord.email_id = data.email;
    await farmerRecord.save();
    return farmerRecord;
};

exports.updateRelatedRecords = async (farmer_id, data) => {
    await Land.updateOne(
        { farmer_id },
        {
            farmer_id: data.farmer_id,
            total_area: data.total_area,
            khasra_no: data.khasra_no,
            area_unit: data.area_unit,
            khatauni: data.khatauni,
            sow_area: data.sow_area,
            land_address: {
                state_id: data.state_id,
                district_id: data.district_id,
                sub_district: data.sub_district,
            },
            expected_production: data.expected_production,
            soil_type: data.soil_type,
            soil_tested: data.soil_tested,
            soil_health_card: data.soil_health_card,
            soil_testing_lab_name: data.soil_testing_lab_name,
            lab_distance_unit: data.lab_distance_unit,
        }
        
    );
    await Crop.updateOne(
        { farmer_id },
        {
            farmer_id: data.farmer_id,
            sowing_date: data.sowing_date,
            harvesting_date: data.harvesting_date,
            crops_name: data.crops_name,
            production_quantity: data.production_quantity,
            productivity: data.productivity,
            selling_price: data.selling_price,
            market_price: data.market_price,
            yield: data.yield,
            seed_used: data.seed_used,
            fertilizer_name: data.fertilizer_name,
            fertilizer_dose: data.fertilizer_dose,
            fertilizer_used: data.fertilizer_used,
            pesticide_name: data.pesticide_name,
            pesticide_dose: data.pesticide_dose,
            pesticide_used: data.pesticide_used,
            insecticide_name: data.insecticide_name,
            insecticide_dose: data.insecticide_dose,
            insecticide_used: data.insecticide_used,
            crop_insurance: data.crop_insurance,
            insurance_company: data.insurance_company,
            insurance_worth: data.insurance_worth,
            crop_seasons: data.crop_seasons,
        }
    );
    await Bank.updateOne(
        { farmer_id },
        {
            farmer_id: data.farmer_id,
            account_no:data.account_no,
            bank_name:data.bank_name,
            branch: data.branch,
            ifsc_code: data.ifsc_code,
            account_holder_name: data.account_holder_name,
            branch_address:{
                bank_state_id: data.bank_state_id,
                bank_district_id:data.bank_district_id,
                bank_block:data.bank_block,
                city:data.city,
                bank_pincode:data.bank_pincode,
            },
        }
    );
};

exports.insertNewRelatedRecords = async (farmer_id, data) => {
    const newLand = new Land({
        farmer_id,
        total_area: data.total_area,
        khasra_no: data.khasra_no,
        area_unit: data.area_unit,
        khatauni: data.khatauni,
        sow_area: data.sow_area,
        land_address: {
            state_id: data.state_id,
            district_id: data.district_id,
            sub_district: data.sub_district,
        },
        expected_production: data.expected_production,
        soil_type: data.soil_type,
        soil_tested: data.soil_tested,
        soil_health_card: data.soil_health_card,
        soil_testing_lab_name: data.soil_testing_lab_name,
        lab_distance_unit: data.lab_distance_unit,
    });
    await newLand.save();

    const newCrop = new Crop({
        farmer_id,
        sowing_date: data.sowing_date,
        harvesting_date: data.harvesting_date,
        crops_name: data.crops_name,
        production_quantity: data.production_quantity,
        crops_name: data.crops_name,
        production_quantity: data.production_quantity,
        productivity: data.productivity,
        selling_price: data.selling_price,
        market_price: data.market_price,
        yield: data.yield,
        seed_used: data.seed_used,
        fertilizer_name: data.fertilizer_name,
        fertilizer_dose: data.fertilizer_dose,
        fertilizer_used: data.fertilizer_used,
        pesticide_name: data.pesticide_name,
        pesticide_dose: data.pesticide_dose,
        pesticide_used: data.pesticide_used,
        insecticide_name: data.insecticide_name,
        insecticide_dose: data.insecticide_dose,
        insecticide_used: data.insecticide_used,
        crop_insurance: data.crop_insurance,
        insurance_company: data.insurance_company,
        insurance_worth: data.insurance_worth,
        crop_seasons: data.crop_seasons,
    });
    await newCrop.save();
    const newBank = new Bank({
        farmer_id,
        account_no:data.account_no,
        bank_name:data.bank_name,
        branch: data.branch,
        ifsc_code: data.ifsc_code,
        account_holder_name: data.account_holder_name,
        branch_address:{
                bank_state_id: data.bank_state_id,
                bank_district_id:data.bank_district_id,
                bank_block:data.bank_block,
                city:data.city,
                bank_pincode:data.bank_pincode,
            },
    });
    await newBank.save();
};