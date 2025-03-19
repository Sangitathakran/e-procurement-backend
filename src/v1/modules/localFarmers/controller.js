const { localFarmersLogger } = require("@config/logger");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");
const {
  StateDistrictCity,
} = require("@src/v1/models/master/StateDistrictCity");
const districtsMapping = require("@src/v1/utils/constants/haryanaFarmerDist");
const {
  getState,
  getDistrict,
  getStateId,
  getDistrictId,
  generateFarmerId,
} = require("@src/v1/utils/helpers");
const axios = require("axios");
const mongoose = require("mongoose");

module.exports.saveExternalFarmerData = async (req, res) => {
  const dates = req?.body?.dates;
  if (!dates || dates.length === 0) {
    localFarmersLogger.warn("Request missing required 'dates' field");
    return res.json({ success: false, message: "dates field is required " });
  }

  let farmersData = [];
  const api_endpoint = dates.map(
    (date) => `${process.env.HARYANA_F_API_ENDPOINT}?date=${date}`
  );

  try {
    for (let i = 0; i < api_endpoint.length; i++) {
      const response = await axios.post(api_endpoint[i], {
        apikey: process.env.HARYANA_F_API_KEY,
        apisecret: process.env.HARYANA_F_SECRET_KEY,
      });
      
      const farmersTableData = response?.data?.Payload?.Table?.map((obj) => ({
        ...obj,
        date: api_endpoint[i].split("=").at(-1),
      }));
      
      localFarmersLogger.info(`${farmersTableData?.length || 0} records found for ${api_endpoint[i]}`);
      
      if (farmersTableData && farmersTableData.length > 0) {
        farmersData.push(...farmersTableData);
      }
    }

    if (!farmersData || !Array.isArray(farmersData)) {
      localFarmersLogger.error("Invalid data format received from API");
      return res.status(400).json({ success: false, message: "Invalid data format from API" });
    }

    let total = farmersData.length,
      existing = 0,
      inserted = 0,
      updatedLandInfo = 0,
      insertedFarmers = [];

    for (const data of farmersData) {
      const existingFarmer = await farmer.findOne({ external_farmer_id: data.farmerid });
      
      if (existingFarmer) {
        const updatedValues = {
          LandCropID: data?.LandCropID,
          khasra: data?.khasra,
          sownkanal: data?.sownkanal,
          SownMarla: data?.SownMarla,
          SownAreaInAcre: data?.SownAreaInAcre,
          RevenueKanal: data?.RevenueKanal,
          RevenueMarla: data?.RevenueMarla,
          RevenueAreaInAcre: data?.RevenueAreaInAcre,
        };
        
        const landDetails = await Land.find({ farmer_id: existingFarmer._id });
        const existingRecord = landDetails.some(
          (land) =>
            land.LandCropID === updatedValues.LandCropID &&
            land.khasra_number === updatedValues.khasra
        );
        
        if (!existingRecord) {
          await Land.create({ farmer_id: existingFarmer._id, ...updatedValues });
          existingFarmer.date = data?.date;
          await existingFarmer.save();
          localFarmersLogger.info(`New land record created for farmer ID ${existingFarmer._id}`);
        }
        existingRecord ? existing++ : updatedLandInfo++;
      } else {
        const state_id = await getStateId("Haryana");
        let district_name = data?.DIS_NAME;
        let district_id = await getDistrictId(district_name);
        
        const newFarmer = new farmer({
          external_farmer_id: data.farmerid,
          name: data?.farmername,
          parents: { father_name: data?.farhername },
          basic_details: {
            name: data.farmername,
            gender: data.gender === "F" ? "female" : "male",
          },
          mobile_no: data.mobile,
          address: { tahshil: data.TEH_NAME, village: data.VIL_NAME, district_id, state_id },
          date: data?.date,
        });
        
        const savedFarmer = await newFarmer.save();
        insertedFarmers.push(savedFarmer._id);
        localFarmersLogger.info(`New farmer created with ID ${savedFarmer._id}`);

        await Land.create({ farmer_id: savedFarmer._id, LandCropID: data?.LandCropID, khasra_number: data.khasra });
        await Crop.create({ farmer_id: savedFarmer._id, seasonname: data?.seasonname });
        inserted++;
      }
    }

    localFarmersLogger.info(`Sync summary: Total: ${total}, Existing: ${existing}, Updated: ${updatedLandInfo}, Inserted: ${inserted}`);
    res.json({
      success: true,
      message: "Farmers, land and crop data synchronized successfully",
      data: { total, existing, inserted, updatedLandInfo, insertedFarmers },
    });
  } catch (error) {
    localFarmersLogger.error(`Error syncing farmers: ${error.message}`);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
