const { localFarmersLogger } = require("@config/logger");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");
const districtsMapping = require("@src/v1/utils/constants/haryanaFarmerDist");
const {
  getState,
  getDistrict,
  getStateId,
  getDistrictId,
  generateFarmerId,
} = require("@src/v1/utils/helpers");
const axios = require("axios");

module.exports.saveExternalFarmerData = async (req, res) => {
  const dates = req?.body?.dates;
  if (!dates || dates.length === 0) {
    localFarmersLogger.warn("dates field is required");
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
      // console.log(
      //   `${farmersTableData?.length || 0} records found for ${api_endpoint[i]}`
      // );
      localFarmersLogger.info(
        `${farmersTableData?.length || 0} records found for ${api_endpoint[i]}`
      );

      if (farmersTableData && farmersTableData.length > 0) {
        farmersData.push(...farmersTableData);
      } else {
        continue;
      }
    }
    //  return res.json( {end: api_endpoint, farmersData} );

    if (!farmersData || !Array.isArray(farmersData)) {
      localFarmersLogger.warn('Invalid data format from API');
      return res
        .status(400)
        .json({ success: false, message: "Invalid data format from API" });
    }
  //  farmersData = farmersData.slice(30, 40);
    let total = farmersData.length,
      existing = 0,
      inserted = 0,
      updatedLandInfo = 0,
      insertedFarmers = [];
    const state_id = await getStateId("Haryana");

    for (const data of farmersData) {
      const existingFarmer = await farmer.findOne({
        external_farmer_id: data.farmerid,
      });

      if (existingFarmer) {
        localFarmersLogger.info(
          `document with _id: ${existingFarmer._id} already exists`
        );

        const updatedValues = {
          LandCropID: Number(data?.LandCropID),
          khasra_number: data?.khasra.trim(),
          sownkanal: Number(data?.sownkanal),
          SownMarla: Number(data?.SownMarla),
          SownAreaInAcre: Number(data?.SownAreaInAcre),
          RevenueKanal: Number(data?.RevenueKanal),
          RevenueMarla: Number(data?.RevenueMarla),
          RevenueAreaInAcre: Number(data?.RevenueAreaInAcre),
        };

        const landDetails = await Land.find({
          farmer_id: existingFarmer._id,
        });
        //console.log(updatedValues, landDetails);
        // Check if a record with the same values already exists
        const existingRecord = landDetails.some(
          (land) =>
            land.LandCropID === updatedValues.LandCropID &&
            land.khasra_number === updatedValues.khasra_number &&
            land.sownkanal === updatedValues.sownkanal &&
            land.SownMarla === updatedValues.SownMarla &&
            land.SownAreaInAcre === updatedValues.SownAreaInAcre &&
            land.RevenueKanal === updatedValues.RevenueKanal &&
            land.RevenueMarla === updatedValues.RevenueMarla &&
            land.RevenueAreaInAcre === updatedValues.RevenueAreaInAcre

            
        );

        existingRecord ? existing++ : updatedLandInfo++;
        localFarmersLogger.info(
          `land info with data ${JSON.stringify(updatedValues)} for farmer_id ${
            existingFarmer._id
          } exists: ${existingRecord}`
        );

        if (!existingRecord) {
          let newLandObj = await Land.create({
            farmer_id: existingFarmer._id,
            ...updatedValues,
          });
          localFarmersLogger.info(
            `new Land created for farmer: ${existingFarmer._id} `
          );
          existingFarmer.date = data?.date;
          await existingFarmer.save();
        }
      } else {
        // const state_id = await getStateId("Haryana");
        let district_name = districtsMapping.find(
          (obj) => obj.original === data?.DIS_NAME
        )?.mappedTo;
        localFarmersLogger.info(
          JSON.stringify({ district_name, fdistrict: data?.DIS_NAME }, null, 2)
        );

        let district_id = await getDistrictId(district_name || data?.DIS_NAME);

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
          },
          date: data?.date,
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

        // added inserted farmers ids
        insertedFarmers.push(savedFarmer._id);
        const newFarObj = {
          _id: savedFarmer._id,
          external_farmer_id: savedFarmer.external_farmer_id,
        };

        // Handle Land Data
        const newLand = new Land({
          farmer_id: savedFarmer._id,
          LandCropID: Number(data?.LandCropID),
          Muraba: data?.Muraba,
          khasra_number: data.khasra.trim(),
          khewat: data?.khewat,
          khtauni_number: data?.khatoni,
          sownkanal: Number(data?.sownkanal),
          SownMarla: Number(data?.SownMarla),
          SownAreaInAcre: Number(data?.SownAreaInAcre),
          RevenueKanal: Number(data?.RevenueKanal),
          RevenueMarla: Number(data?.RevenueMarla),
          RevenueAreaInAcre: Number(data?.RevenueAreaInAcre),
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

        localFarmersLogger.info(
          `New farmer created: ${JSON.stringify(
            { ...newFarObj, land_id: newLand._id, newCrop_id: newCrop._id },
            null,
            2
          )}`
        );

        inserted++;
      }
    }
    localFarmersLogger.info(
      JSON.stringify({ total, existing, updatedLandInfo, inserted }, null, 2)
    );
    res.json({
      success: true,
      message: "Farmers, land and crop data synchronized successfully",
      data: { total, existing, inserted, updatedLandInfo, insertedFarmers },
    });
  } catch (error) {
    localFarmersLogger.error("Error syncing farmers:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};



