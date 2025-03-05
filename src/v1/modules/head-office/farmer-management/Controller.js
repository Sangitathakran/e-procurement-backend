const {
  _handleCatchErrors,
  dumpJSONToExcel,
} = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const IndividualModel = require("@src/v1/models/app/farmerDetails/IndividualFarmer");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const {
  StateDistrictCity,
} = require("@src/v1/models/master/StateDistrictCity");
const { Bank } = require("@src/v1/models/app/farmerDetails/Bank");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");

module.exports.farmerList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "name",
      search = "",
      isExport = 0,
      state = null,
      district = null,
    } = req.query;
    const skip = (page - 1) * limit;
    const searchFields = ["name", "farmer_id", "farmer_code", "mobile_no"];
    if (/[.*+?^${}()|[\]\\]/.test(search)) {
      return sendResponse({ res, status: 400, errorCode: 400, errors: [{ message: "Do not use any special character" }], message: "Do not use any special character" })
    }
    const makeSearchQuery = (searchFields) => {
      let query = {};
      query["$or"] = searchFields.map((item) => ({
        [item]: { $regex: search, $options: "i" },
      }));
      return query;
    };

    const query = search ? makeSearchQuery(searchFields) : {};

    if (state) {
      query["address.state_id"] = state;
    }

    if (district) {
      query["address.district_id"] = district;
    }

    const records = { count: 0, rows: [] };

    // Get all farmers in one query
    if (isExport == 1) {
      const stateDistrictData = await StateDistrictCity.find(
        {},
        { states: 1 }
      ).lean();
  
      // **Step 2: Create lookup maps**
      const stateMap = {};
      const districtMap = {};
  
      stateDistrictData.forEach(({ states }) => {
        states.forEach(({ _id, state_title, districts }) => {
          stateMap[_id.toString()] = state_title;
          districts.forEach(({ _id, district_title }) => {
            districtMap[_id.toString()] = district_title;
          });
        });
      });
      records.rows = await farmer
        .find()
        .select(
          "farmer_code farmer_id name parents mobile_no address basic_details associate_id"
        )
        .populate({ path: "associate_id", select: "user_code" })
        .sort(sortBy)
        .lean();
      const data = records.rows.map((item) => {
        let address = {
          country: item.address?.country || "",
          state: stateMap[item.address?.state_id] || "",
          district: districtMap[item.address?.district_id] || "",
          block: item.address?.block || "",
          village: item.address?.village || "",
          pin_code: item.address?.pin_code || "",
        };
        let basicDetails = item?.basic_details || {};

        return {
          _id: item?._id,
          farmer_name: item?.name,
          address: address,
          basic_details: basicDetails,
          mobile_no: item?.mobile_no,
          associate_id: item?.associate_id?.user_code || null,
          farmer_id: item?.farmer_id,
          father_spouse_name:
            item?.parents?.father_name || item?.parents?.mother_name || null,
        };
      });
      records.rows = data;
      const record = records.rows.map((item, index) => {
        let address = `${item?.address?.village}, ${item?.address?.block}, ${item?.address?.district}, ${item?.address?.state}, ${item?.address?.country}, ${item?.address?.pin_code}`;

        return {
          "Farmer Name": item?.farmer_name || "NA",
          "Mobile Number": item?.mobile_no || "NA",
          "Associate ID": item?.associate_id || "NA",
          "Farmer ID": item?.farmer_id || "NA",
          "Father/Spouse Name": item?.father_spouse_name || "NA",
          Address:
            address
              ?.replace(/,\s*(?:,\s*)+/g, ", ")
              .replace(/^,\s*/, "")
              .replace(/\s*,\s*$/, "") || "NA",
        };
      });

      return dumpJSONToExcel(req, res, {
        data: record,
        fileName: `Farmer-List.xlsx`,
        worksheetName: `Farmer-List`,
      });
    }
    records.rows = await farmer
      .find(query)
      .select(
        "farmer_code farmer_id name parents mobile_no address basic_details associate_id"
      )
      .populate({ path: "associate_id", select: "user_code" })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort(sortBy)
      .lean();

    const data = await Promise.all(records.rows.map(async (item) => {
      let address = await getAddress(item);
      let basicDetails = item?.basic_details || {};

      return {
        _id: item?._id,
        farmer_name: item?.name,
        address: address,
        basic_details: basicDetails,
        mobile_no: item?.mobile_no,
        associate_id: item?.associate_id?.user_code || null,
        farmer_id: item?.farmer_id,
        father_spouse_name:
          item?.parents?.father_name || item?.parents?.mother_name || null,
      };
    }));
    records.rows = data;
    records.count = await farmer.countDocuments(query);
    records.page = page;
    records.limit = limit;
    records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    return sendResponse({
      res,
      status: 200,
      data: records,
      message: _response_message.found("farmers"),
    });
  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
};

module.exports.getSingleFarmer = async (req, res) => {
  try {
    const farmerId = req.params.id;
    if (!farmerId)
      return sendResponse({
        res,
        status: 400,
        data: null,
        message: _response_message.notProvided("Farmer Id"),
      });

    const farmerData = await farmer
      .findById(farmerId)
      .populate("land_details.land_id crop_details.crop_id");

    console.log(farmerData);

    const state = await getState(farmerData.address?.state_id);
    const district = await getDistrict(
      farmerData.address?.district_id,
      farmerData.address?.state_id
    );

    const response = {
      ...JSON.parse(JSON.stringify(farmerData)),
      address: {
        ...JSON.parse(JSON.stringify(farmerData.address)),
        state,
        district,
      },
    };

    if (!farmerData) {
      return sendResponse({
        res,
        status: 200,
        data: response,
        message: _response_message.notFound("farmer"),
      });
    }

    return sendResponse({
      res,
      status: 200,
      data: response,
      message: _response_message.found("farmer"),
    });
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.getAllStateAndDistricts = async (req, res) => {
  try {
    const farmerStates = await farmer.distinct("address.state_id");
    const farmerDistricts = await farmer.distinct("address.district_id");

    const stateEntries = await StateDistrictCity.aggregate([
      { $unwind: "$states" },
      { $match: { "states._id": { $in: farmerStates } } },
      { $unwind: "$states.districts" },
      { $match: { "states.districts._id": { $in: farmerDistricts } } },
      {
        $group: {
          _id: "$states._id",
          state_title: { $first: "$states.state_title" },
          districts: {
            $push: {
              label: "$states.districts.district_title",
              value: "$states.districts._id",
            },
          },
        },
      },
      {
        $project: {
          label: "$state_title",
          value: "$_id",
          districts: 1,
        },
      },
      { $sort: { label: 1 } }, // Sort states alphabetically
    ]);

    return sendResponse({
      res,
      status: 200,
      data: stateEntries,
      message: _response_message.found("All farmer State and districts"),
    });
  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
};

module.exports.getStatewiseFarmersCount = async (req, res) => {
  try {
    const farmerStates = await farmer.distinct("address.state_id", {
      "address.state_id": { $ne: null },
    });
    // Aggregate over the StateDistrictCity collection
    const stateEntries = await StateDistrictCity.aggregate([
      {
        $unwind: "$states",
      },
      {
        $match: {
          "states._id": { $in: farmerStates.filter((id) => id) },
        },
      },
      {
        // Optimized $lookup with $group to directly get counts
        $lookup: {
          from: "farmers",
          let: { stateId: "$states._id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$address.state_id", "$$stateId"] },
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ],
          as: "farmers_count",
        },
      },
      {
        // Restructure the output with count from lookup
        $project: {
          state: "$states.state_title",
          count: {
            $ifNull: [{ $arrayElemAt: ["$farmers_count.count", 0] }, 0],
          }, // Get count from lookup, default to 0
          _id: 0, // Exclude _id field
        },
      },
    ]);

    const totalFarmers = stateEntries.reduce(
      (sum, state) => sum + state.count,
      0
    );

    return sendResponse({
      res,
      status: 200,
      data: { stateWiseCount: stateEntries, totalCount: totalFarmers },
      message: _response_message.found("All farmers count fetch successfully"),
    });
  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
};

const getState = async (stateId) => {
  try {
    if (!stateId) return "";

    const state = await StateDistrictCity.findOne(
      { states: { $elemMatch: { _id: stateId.toString() } } },
      { "states.$": 1 }
    );

    return state?.states[0]?.state_title || "";
  } catch (error) {
    console.error("Error in getState:", error);
    return "";
  }
};

const getDistrict = async (districtId, stateId) => {
  try {
    if (!districtId || !stateId) return "";

    const state = await StateDistrictCity.findOne(
      { states: { $elemMatch: { _id: stateId.toString() } } },
      { "states.$": 1 }
    );

    const district = state?.states[0]?.districts?.find(
      (item) => item?._id.toString() === districtId.toString()
    );

    return district?.district_title || "";
  } catch (error) {
    console.error("Error in getDistrict:", error);
    return "";
  }
};

const getAddress = async (item) => {
  try {
    if (!item?.address) {
      return {
        country: "",
        state: "",
        district: "",
        block: "",
        village: "",
        pin_code: "",
      };
    }

    const state = await getState(item.address.state_id);
    const district = await getDistrict(
      item.address.district_id,
      item.address.state_id
    );

    return {
      country: item.address.country || "",
      state: state,
      district: district,
      block: item.address.block || "",
      village: item.address.village || "",
      pin_code: item.address.pin_code || "",
    };
  } catch (error) {
    console.error("Error in getAddress:", error);
    return {
      country: "",
      state: "",
      district: "",
      block: "",
      village: "",
      pin_code: "",
    };
  }
};

const singlefarmerDetails = async (res, farmerId, farmerType = 1) => {
  try {
    const SINGLE_FARMER_INITIALS = {
      basic_details: {},
      address: {},
      land_details: {},
      bank_details: {},
      crop_details: {
        upcoming_harvest: [],
        past_harvest: [],
      },
    };
    //this is associate farmer
    if (farmerType == 1) {
      const basicDetails = await farmer.findById(farmerId);
      const address = await farmer.findById(farmerId);
      const landDetails = await Land.findOne({ farmer_id: farmerId });
      const cropDetails = await Crop.find({ farmer_id: farmerId });
      const bankDetails = await Bank.findOne({ farmer_id: farmerId });

      SINGLE_FARMER_INITIALS.basic_details = {
        name: basicDetails?.name || null,
        father_spouse_name:
          basicDetails?.parents?.father_name ||
          basicDetails.parents?.mother_name ||
          null,
        email: bankDetails?.email || null,
        mobile_no: basicDetails?.mobile_no || null,
        category: basicDetails?.category || null,
        farmer_type: basicDetails?.farmer_type || null,
        gender: basicDetails?.gender || null,
      };
      SINGLE_FARMER_INITIALS.address = {
        address_line_1: address?.address.address_line || null,
        address_line_2: address?.address.address_line || null,
        pincode: address?.address.pinCode || null,
        state: await getState(address?.address?.state_id),
        district: await getDistrict(address?.address?.district_id),
        village_town_city: address?.address.village || null,
        taluka: address?.address.block || null,
        country: address?.address.country || null,
      };
      SINGLE_FARMER_INITIALS.land_details = {
        total_area: landDetails?.total_area || null,
        pincode: null,
        khasra_no: landDetails?.khasra_no || null,
        ghat_no: null,
        soil_type: landDetails?.soil_type || null,
        soil_tested: landDetails?.soil_tested || null,
      };

      SINGLE_FARMER_INITIALS.bank_details = {
        bank_name: bankDetails?.bank_name || null,
        branch_name: bankDetails?.bank_name || null,
        account_holder_name: bankDetails?.account_holder_name || null,
        ifsc_code: bankDetails?.ifsc_code || null,
        account_no: bankDetails?.account_no || null,
        confirm_account_no: bankDetails?.account_no || null,
        upload_proof: bankDetails?.document || null,
      };

      cropDetails.map((item) => {
        let crop = {
          crop_name: item?.crops_name || null,
          sowing_date: item?.sowing_date || null,
          harvest_date: item?.harvesting_date || null,
          season: item?.crop_seasons || null,
        };
        let cropHarvestDate = new Date(crop.harvest_date);
        let currentDate = new Date();

        if (cropHarvestDate < currentDate) {
          SINGLE_FARMER_INITIALS.crop_details.past_harvest.push(crop);
        } else {
          SINGLE_FARMER_INITIALS.crop_details.upcoming_harvest.push(crop);
        }
      });

      return SINGLE_FARMER_INITIALS;
    }
    //this is individual farmer
    if (farmerType == 2) {
      const individualfarmerDetails = await IndividualModel.findOne({
        _id: farmerId,
      });
      //temperary logic as indivdiual farmer don't have crop data
      const upcomping_crop =
        individualfarmerDetails.land_details.kharif_crops.map((item) => {
          let crop = {
            crop_name: item || null,
            sowing_date: item?.sowing_date || null,
            harvest_date: item?.harvesting_date || null,
            season: item?.crop_seasons || null,
          };

          return crop;
        });
      //temperary logic as indivdiual farmer don't have crop data
      const past_crop = individualfarmerDetails.land_details.rabi_crops.map(
        (item) => {
          let crop = {
            crop_name: item || null,
            sowing_date: item?.sowing_date || null,
            harvest_date: item?.harvesting_date || null,
            season: item?.crop_seasons || null,
          };

          return crop;
        }
      );

      SINGLE_FARMER_INITIALS.basic_details = {
        name: individualfarmerDetails?.basic_details.name || null,
        father_spouse_name:
          individualfarmerDetails?.basic_details.father_husband_name || null,
        email: individualfarmerDetails?.basic_details.email || null,
        mobile_no: individualfarmerDetails?.basic_details.mobile_no || null,
        category: individualfarmerDetails?.basic_details.category || null,
        dob: individualfarmerDetails?.basic_details.dob || null,
        farmer_type: individualfarmerDetails?.basic_details.farmer_type || null,
        gender: individualfarmerDetails?.basic_details.gender || null,
      };
      SINGLE_FARMER_INITIALS.address = {
        address_line_1: individualfarmerDetails?.address.address_line_1 || null,
        address_line_2: individualfarmerDetails?.address.address_line_2 || null,
        pincode: individualfarmerDetails?.address.pinCode || null,
        state: individualfarmerDetails?.state || null,
        district: individualfarmerDetails?.address.district || null,
        village_town_city: individualfarmerDetails?.address.village || null,
        taluka: individualfarmerDetails?.address.block || null,
        country: individualfarmerDetails?.address.country || null,
      };
      SINGLE_FARMER_INITIALS.land_details = {
        total_area: individualfarmerDetails?.land_details.total_area || null,
        pincode: individualfarmerDetails?.land_details.pinCode || null,
        khasra_no: individualfarmerDetails?.land_details.khasra_no || null,
        ghat_no: individualfarmerDetails?.land_details.ghat_number || null,
        soil_type: individualfarmerDetails?.land_details.soil_type || null,
        soil_tested: individualfarmerDetails?.land_details.soil_tested || null,
      };
      SINGLE_FARMER_INITIALS.crop_details = {
        upcoming_harvest: upcomping_crop,

        past_harvest: past_crop,
      };
      SINGLE_FARMER_INITIALS.bank_details = {
        bank_name: individualfarmerDetails?.bank_details.bank_name || null,
        branch_name: individualfarmerDetails?.bank_details.branch_name || null,
        account_holder_name:
          individualfarmerDetails?.bank_details.account_holder_name || null,
        ifsc_code: individualfarmerDetails?.bank_details.ifsc_code || null,
        account_no: individualfarmerDetails?.bank_details.account_no || null,
        confirm_account_no:
          individualfarmerDetails?.bank_details.account_no || null,
        upload_proof:
          individualfarmerDetails?.bank_details.proof_doc_key || null,
      };

            return SINGLE_FARMER_INITIALS;
        }


    } catch (error) {
        //  _handleCatchErrors(error, res);
        return

    }

}

// module.exports.getStatewiseFarmersCount = async (req, res) => {
//     try {
    
//         const farmerStates = await farmer.distinct('address.state_id', { "address.state_id": { $ne: null } });

// // Aggregate over the StateDistrictCity collection
// const stateEntries = await StateDistrictCity.aggregate([
//     { 
//         $unwind: "$states" 
//     },
//     { 
//         $match: { 
//             "states._id": { $in: farmerStates.filter(id => id) } 
//         }
//     },
//     {
//         // Optimized $lookup with $group to directly get counts
//         $lookup: {
//             from: "farmers",
//             let: { stateId: "$states._id" },
//             pipeline: [
//                 { 
//                     $match: { 
//                         $expr: { $eq: ["$address.state_id", "$$stateId"] }
//                     } 
//                 },
//                 { 
//                     $group: { 
//                         _id: null, 
//                         count: { $sum: 1 } 
//                     } 
//                 }
//             ],
//             as: "farmers_count"
//         }
//     },
//     {
//         // Restructure the output with count from lookup
//         $project: {
//             state: "$states.state_title", 
//             count: { 
//                 $ifNull: [{ $arrayElemAt: ["$farmers_count.count", 0] }, 0] 
//             }, // Get count from lookup, default to 0
//             _id: 0 // Exclude _id field
//         }
//     }
// ]);

//         return sendResponse({
//             res,
//             status: 200,
//             data: stateEntries,
//             message: _response_message.found("All farmers count fetch successfully")
//         });
//     } catch (error) {
//         console.log('error', error);
//         _handleCatchErrors(error, res);
//     }
// }




