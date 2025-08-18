
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");
const { _generateFarmerCode,_handleCatchErrors, generateFarmerId, getState, getDistrict } = require("@src/v1/utils/helpers");
const { Bank } = require("@src/v1/models/app/farmerDetails/Bank");
const { findOne } = require("@src/v1/models/master/UserRole");
const { object } = require("joi");
const {  _center_type } = require('@src/v1/utils/constants');
const { Commodity } = require("@src/v1/models/master/Commodity");



exports.insertNewFarmerRecord = async (data) => {
    try {
      const newFarmer = new farmer({
        user_type: _center_type.associate,
        associate_id: data.associate_id,
        mobile_no: data.mobile_no,
        farmer_tracent_code: data.farmer_tracent_code,
        basic_details: {
          dob: data.dob,
          age: data.age,
          farmer_type: data.farmer_category,
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
        source_by: data.source_by,
        education: {
          highest_edu: data.highest_edu,
          edu_details: data.edu_details,
        },
        address: {
          address_line_1: data.address_line,
          country: data.country,
          state_id: data.state_id,
          district_id: data.district_id,
          tahshil: data.tahshil,
          block: data.block,
          village: data.village,
          pin_code: data.pinCode,
          lat: data.lat,
          long: data.long,
        },
        bank_details: {
          bank_name: data.bank_name,
          account_no: data.account_no,
          branch_name: data.branch_name,
          ifsc_code: data.ifsc_code,
          account_holder_name: data.account_holder_name,
        },
        // infrastructure_needs: {
        //   warehouse: data.warehouse,
        //   cold_storage: data.cold_storage,
        //   processing_unit: data.processing_unit,
        //   transportation_facilities: data.transportation_facilities,
        // },
        // financial_support: {
        //   credit_facilities: data.credit_facilities, 
        //   source_of_credit:data.source_of_credit, 
        //   financial_challenges:data.financial_challenges, 
        //   support_required: data.support_required,
        // },
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
      
      savedFarmer.farmer_id = await generateFarmerId(obj);
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
    farmerRecord.basic_details.age = data.age;
    farmerRecord.basic_details.gender = data.gender;
    farmerRecord.marital_status = data.marital_status;
    farmerRecord.religion = data.religion;
    farmerRecord.category = data.category;
    farmerRecord.farmer_type = data.farmer_category;
    farmerRecord.education.highest_edu = data.highest_edu;
    farmerRecord.education.edu_details = data.edu_details;
    farmerRecord.proof.type = data.type;
    farmerRecord.proof.aadhar_no = data.aadhar_no;
    farmerRecord.address.address_line_1 = data.address_line;
    farmerRecord.address.country = data.country;
    farmerRecord.address.state_id = data.state_id;
    farmerRecord.address.district_id = data.district_id;
    farmerRecord.address.tahshil = data.tahshil;
    farmerRecord.address.block = data.block;
    farmerRecord.address.village = data.village;
    farmerRecord.address.pinCode = data.pinCode;
    farmerRecord.address.lat = data.lat;
    farmerRecord.address.long = data.long;
    farmerRecord.bank_details.bank_name = data.bank_name;
    farmerRecord.bank_details.account_no = data.account_no;
    farmerRecord.bank_details.branch_name = data.branch_name;
    farmerRecord.bank_details.ifsc_code = data.ifsc_code;
    farmerRecord.bank_details.account_holder_name = data.account_holder_name;
    farmerRecord.basic_details.mobile_no = data.mobile_no;
    farmerRecord.basic_details.email_id = data.email;
    farmerRecord.infrastructure_needs.warehouse = data.warehouse;
    farmerRecord.infrastructure_needs.cold_storage = data.cold_storage;
    farmerRecord.infrastructure_needs.processing_unit = data.processing_unit;
    farmerRecord.infrastructure_needs.transportation_facilities = data.transportation_facilities;
    farmerRecord.financial_support.credit_facilities=  data.credit_facilities, 
    farmerRecord.financial_support.source_of_credit=  data.source_of_credit,
    farmerRecord.financial_support.financial_challenges=  data.financial_challenges,
    farmerRecord.financial_support.support_required=  data.support_required,

    // const state = await getState(data.state_id);
    // const district = await getDistrict(data.district_id);
    // if (!state || !district) {
    //     throw new Error("State or district not found.");
    // }
    // let farmerId;
    // let uniqueId = true;
    // let obj = {
    //     _id: farmerRecord._id,
    //     address: {
    //         state: state.state_title,
    //         district: district.district_title,
    //     }
    // };
    // const uniquefarmerid = async () => {
    //     farmerId = generateFarmerId(obj);
    //     const existingFarmerId = await farmer.findOne({ farmer_id: farmerId });
    //     if (!existingFarmerId) {
    //         uniqueId = false;
    //     }
    // };
    // while (uniqueId) {
    //     await uniquefarmerid();
    // }

    // farmerRecord.farmer_id = farmerId;
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
            land_name: data.land_name,
            cultivation_area: data.cultivation_area,
            total_area: data.total_area,
            khasra_number: data.khasra_number,
            area_unit: data.area_unit,
            khata_number: data.khata_number,
            land_type: data.land_type,
            khtauni_number: data.khtauni_number,
            soil_type: data.soil_type,
            soil_tested: data.soil_tested,
            land_address: {
                state_id: data.state_id,
                district_id: data.district_id,
                block: data.LandBlock,
                village: data.landvillage,
                pin_code: data.landPincode,
            },
            soil_testing_agencies:data.soil_testing_agencies,
            upload_geotag: data.upload_geotag,
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
            crop_variety: data.crop_variety,
            production_quantity: data.production_quantity,
            selling_price: data.selling_price,
            yield: data.yield,
            crop_season: data.crop_season,
            land_name: data.crop_land_name,
            crop_growth_stage: data.crop_growth_stage,
            crop_disease: data.crop_disease,
            crop_rotation: data.crop_rotation,
            previous_crop_details:{
                  crop_season: data.previous_crop_session,
                  crop_name: data.previous_crop_name,
            },
            marketing_and_output:{
              crop_sold: data.crop_sold,
              quantity_sold: data.quantity_sold,
              average_selling_price: data.average_selling_price,
              marketing_channels_used: data.marketing_channels_used,
              challenges_faced: data. challenges_faced,
    
            },
            insurance_details: {
              insurance_company: data.insurance_company,
              insurance_worth: data.insurance_worth,
              insurance_premium: data.insurance_premium,
              insurance_start_date: data.insurance_start_date,
              insurance_end_date: data.insurance_end_date,
            },
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
        land_name: data.land_name,
        cultivation_area: data.cultivation_area,
        total_area: data.total_area,
        khasra_number: data.khasra_number,
        area_unit: data.area_unit,
        khata_number: data.khata_number,
        land_type: data.land_type,
        khtauni_number: data.khtauni_number,
        soil_type: data.soil_type,
        soil_tested: data.soil_tested,
        land_address: {
            state_id: data.state_id,
            district_id: data.district_id,
            block: data.LandBlock,
            village: data.landvillage,
            pin_code: data.landPincode,
        },
        soil_testing_agencies:data.soil_testing_agencies,
        upload_geotag: data.upload_geotag,
    });
     await newLand.save();

    const newCrop = new Crop({
        farmer_id,
        land_id: newLand._id,
        sowing_date: data.sowing_date,
        harvesting_date: data.harvesting_date,
        crop_name: data.crop_name,
        crop_variety: data.crop_variety,
        production_quantity: data.production_quantity,
        selling_price: data.selling_price,
        yield: data.yield,
        crop_season: data.crop_season,
        land_name: data.crop_land_name,
        crop_growth_stage:data.crop_growth_stage,
        crop_disease: data.crop_disease,
        crop_rotation: data.crop_rotation,
        commodity_id: data.commodityId,
        previous_crop_details:{
          crop_season: data.previous_crop_session,
          crop_name: data.previous_crop_name,
        },
        marketing_and_output:{
          crop_sold: data.crop_sold,
          quantity_sold: data.quantity_sold,
          average_selling_price: data.average_selling_price,
          marketing_channels_used: data.marketing_channels_used,
          challenges_faced: data. challenges_faced,
        },
        insurance_details: {
          insurance_company: data.insurance_company,
          insurance_worth: data.insurance_worth,
          insurance_premium: data.insurance_premium,
          insurance_start_date: data.insurance_start_date,
          insurance_end_date: data.insurance_end_date,
        },
    });
    await newCrop.save();
    return { newLand, newCrop };
} catch (error) {
    return null;
  }
};
exports.excelDateToDDMMYYYY = function (serial) {
  const excelEpoch = new Date(1899, 11, 30); // Excel's epoch starts on Dec 30, 1899
  const date = new Date(excelEpoch.getTime() + serial * 86400000);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};
exports.isExponential = (val) => {
  if (typeof val === "number" && val.toString().includes("e")) return true;
  if (typeof val === "string" && val.toLowerCase().includes("e")) return true;
  return false;
};
exports.getCommodityIdByName = async (commodityName) => {
  try {
    const commodity = await Commodity.findOne({
      name: { $regex: `^${commodityName}\\b`, $options: "i" }, // Case-insensitive match starting with word
    });

    if (commodity) {
      return commodity._id;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching commodityId by name:", error.message);
    throw error;
  }
};


exports.insertNewHaryanaFarmerRecord = async (data) => {
  try {
    const newFarmer = new farmer({
      user_type: "1",
      farmer_type: "Individual",
      associate_id: null,
      harynaNewFarmer_code: data.uniqueFarmerCode,
      mobile_no: data.mobile_no,
      is_welcome_msg_send: true,
      is_verify_otp: true,
      basic_details: {
        dob: data.dob,
        age: data.age,
        farmer_type: data.farmer_category,
        gender: data.gender,
        mobile_no: data.mobile_no,
        email: data.email,
        category: data.category,
      },
      name: data.name,
      parents: { father_name: data.father_name },
      proof: { type: data.type, aadhar_no: data.aadhar_no },
      marital_status: data.marital_status,
      religion: data.religion,
      education: {
        highest_edu: data.highest_edu,
        edu_details: data.edu_details,
      },
      address: {
        address_line_1: data.address_line,
        country: data.country,
        state_id: data.state_id,
        district_id: data.district_id,
        tahshil: data.tahshil,
        block: data.block,
        village: data.village,
        pin_code: data.pinCode,
        lat: data.lat,
        long: data.long,
      },
      documents: {
        pan_number: data.pan_number,
      },
      bank_details: {
        bank_name: data.bank_name,
        account_no: data.account_no,
        branch_name: data.branch_name,
        ifsc_code: data.ifsc_code,
        account_holder_name: data.account_holder_name,
      },
      infrastructure_needs: {
        warehouse: data.warehouse,
        cold_storage: data.cold_storage,
        processing_unit: data.processing_unit,
        transportation_facilities: data.transportation_facilities,
      },
      financial_support: {
        credit_facilities: data.credit_facilities, 
        source_of_credit:data.source_of_credit, 
        financial_challenges:data.financial_challenges, 
        support_required: data.support_required,
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
    
    savedFarmer.farmer_id = await generateFarmerId(obj);
    await savedFarmer.save();

    return savedFarmer;
  } catch (error) {
    console.error("Error inserting farmer record:", error);
    return null;
  }
};

exports.insertNewHaryanaRelatedRecords = async (farmer_id, data, res) => {
  try{
    try{
  const newLand = new Land({
      farmer_id,
      land_name: data.land_name,
      cultivation_area: data.cultivation_area,
      total_area: data.total_area,
      khasra_number: data.khasra_number,
      area_unit: data.area_unit,
      khata_number: data.khata_number,
      land_type: 'other',
      khtauni_number: data.khtauni_number,
      soil_type: data.soil_type,
      soil_tested: data.soil_tested,
      ghat_number: data.ghat_number,
      khewat_number: data.khewat_number,
      karnal_number: data.karnal_number,
      murla_number: data.murla_number,
      revenue_area_karnal: data.revenue_area_karnal,
      revenue_area_murla: data.revenue_area_murla,
      sow_area_karnal: data.sow_area_karnal,
      sow_area_murla: data.sow_area_murla,
      land_address: {
          state_id: data.state_id,
          district_id: data.district_id,
          block: data.LandBlock,
          village: data.landvillage,
          pin_code: data.landPincode,
      },
      soil_testing_agencies:data.soil_testing_agencies,
      upload_geotag: data.upload_geotag,
  });
   await newLand.save();
  } catch (error) {
    console.error("Error inserting farmer record:", error);
    return null;
  }

  const newCrop = new Crop({
      farmer_id,
      land_id: newLand._id,
      crop_name: data.crop_name,
      crop_variety: data.crop_variety,
      production_quantity: data.production_quantity,
      selling_price: data.selling_price,
      yield: data.yield,
      crop_season: data.crop_season,
      land_name: data.crop_land_name,
      crop_growth_stage:data.crop_growth_stage,
      crop_disease: data.crop_disease,
      crop_rotation: data.crop_rotation,
      previous_crop_details:{
        crop_season: data.previous_crop_session,
        crop_name: data.previous_crop_name,
      },
      marketing_and_output:{
        crop_sold: data.crop_sold,
        quantity_sold: data.quantity_sold,
        average_selling_price: data.average_selling_price,
        marketing_channels_used: data.marketing_channels_used,
        challenges_faced: data. challenges_faced,
      },
      insurance_details: {
        insurance_company: data.insurance_company,
        insurance_worth: data.insurance_worth,
        insurance_premium: data.insurance_premium,
        insurance_start_date: data.insurance_start_date,
        insurance_end_date: data.insurance_end_date,
      },
  });
  await newCrop.save();
  return { newLand, newCrop };
} catch (error) {
  return null;
}
};
