const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");
const {
  StateDistrictCity,
} = require("@src/v1/models/master/StateDistrictCity");
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
  const { date } = req.query;
  const api_endpoint = `${process.env.HARYANA_F_API_ENDPOINT}?date=${date}`;
  try {
    const response = await axios.post(api_endpoint, {
      apikey: process.env.HARYANA_F_API_KEY,
      apisecret: process.env.HARYANA_F_SECRET_KEY,
    });

    const farmersData = response?.data?.Payload?.Table;

    if (!farmersData || !Array.isArray(farmersData)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid data format from API" });
    }

    for (const data of farmersData) {
      const existingFarmer = await farmer.findOne({
        external_farmer_id: data.farmerid,
      });

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

        const landDetails = await Land.find({
          farmer_id: existingFarmer._id,
        });

        // Check if a record with the same values already exists
        const existingRecord = landDetails.some(
          (land) =>
            land.LandCropID === updatedValues.LandCropID &&
            land.khasra_number === updatedValues.khasra &&
            land.sownkanal === updatedValues.sownkanal &&
            land.SownMarla === updatedValues.SownMarla &&
            land.SownAreaInAcre === updatedValues.SownAreaInAcre &&
            land.RevenueKanal === updatedValues.RevenueKanal &&
            land.RevenueMarla === updatedValues.RevenueMarla &&
            land.RevenueAreaInAcre === updatedValues.RevenueAreaInAcre
        );

        if (!existingRecord) {
          let newLandObj = await Land.create({
            farmer_id: existingFarmer._id,
            ...updatedValues,
          });
        }
      } else {
        const state_id = await getStateId("Haryana");

        let district_id = await getDistrictId(data?.DIS_NAME);

        // Create new farmer
        const newFarmer = new farmer({
          external_farmer_id: data.farmerid,
          name: data?.farmername,
          parents: {
            father_name: data?.farhername,
          },
          basic_details: {
            name: data.farmername,
            gender: data.gender === "F" ? "female" : "male",
          },
          mobile_no: data.mobile,
          bank_details: {
            account_no: data.Account,
            ifsc_code: data.IFSC,
            accountstatus: data?.accountstatus,
            account_holder_name: data?.farmername,
          },

          address: {
            tahshil: data.TEH_NAME,
            village: data.VIL_NAME,
            district_id: district_id,
            state_id: state_id,
          },

          hr_p_code: {
            p_DCodeLGD: data?.p_DCodeLGD,
            p_BtCodeLGD: data?.p_BtCodeLGD,
            p_WvCodeLGD: data?.p_WvCodeLGD,
            p_address: data?.p_address,
            Dis_code: data?.Dis_code,
            Teh_code: data?.Teh_code,
            Vil_code: data?.Vil_code,
            statecode: data?.statecode,
          }, // na
        });

        const savedFarmer = await newFarmer.save();

        const state = await getState(savedFarmer.address.state_id);
        const district = await getDistrict(savedFarmer.address.district_id);

        let obj = {
          _id: savedFarmer._id,
          address: {
            state: state.state_title,
            district: district.district_title,
          },
        };

        savedFarmer.farmer_id = await generateFarmerId(obj);
        await savedFarmer.save();

        // Handle Land Data
        const newLand = new Land({
          farmer_id: savedFarmer._id,
          LandCropID: data?.LandCropID,
          Muraba: data?.Muraba,
          khasra_number: data.khasra,
          khewat: data?.khewat,
          khtauni_number: data?.khatoni,
          sownkanal: data?.sownkanal,
          SownMarla: data?.SownMarla,
          SownAreaInAcre: data?.SownAreaInAcre,
          RevenueKanal: data?.RevenueKanal,
          RevenueMarla: data?.RevenueMarla,
          RevenueAreaInAcre: data?.RevenueAreaInAcre,
        });
        await newLand.save();

        // handle crop data
        const newCrop = new Crop({
          farmer_id: savedFarmer._id,
          seasonname: data?.seasonname,
          seasonid: data?.seasonid,
          L_LGD_DIS_CODE: data?.L_LGD_DIS_CODE,
          L_LGD_TEH_CODE: data?.L_LGD_TEH_CODE,
          L_LGD_VIL_CODE: data?.L_LGD_VIL_CODE,
          SownCommodityID: data?.SownCommodityID,
          SownCommodityName: data?.SownCommodityName,
          CommodityVariety: data?.CommodityVariety,
        });
        await newCrop.save();
      }
    }

    res.json({
      success: true,
      message: "Farmers and land data synchronized successfully",
      data: farmersData,
    });
  } catch (error) {
    console.error("Error syncing farmers:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
