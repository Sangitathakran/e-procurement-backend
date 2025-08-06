const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");
const { User } = require("@src/v1/models/app/auth/User");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { Commodity } = require("@src/v1/models/master/Commodity");
const { Associate } = require("@src/v1/models/app/auth/Associate");
const {commodityStandard,} = require("@src/v1/models/master/commodityStandard");
const { Scheme } = require("@src/v1/models/master/Scheme");
const {
  StateDistrictCity,
} = require("@src/v1/models/master/StateDistrictCity");
const { State } = require("@src/v1/models/master/states");
const UserRole = require("@src/v1/models/master/UserRole");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { default: mongoose } = require("mongoose");
const SLAManagement = require("@src/v1/models/app/auth/SLAManagement");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response")

module.exports.scheme = async (req, res) => {
  const query = { deletedAt: null, status: "active" };
  try {
    const scheme_list = await Scheme.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "commodities",
          localField: "commodity_id",
          foreignField: "_id",
          as: "commodityDetails",
        },
      },

      {
        $project: {
          schemeName: 1,
          originalSchemeName: "$schemeName",
          schemeName: {
            $concat: [
              "$schemeName",
              " ",
              {
                $ifNull: [{ $arrayElemAt: ["$commodityDetails.name", 0] }, ""],
              },
              " ",
              { $ifNull: ["$season", ""] },
              " ",
              { $ifNull: ["$period", ""] },
            ],
          },
          procurement: 1,
        },
      },
    ]);

    return sendResponse({ res, message: "", data: scheme_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};

module.exports.commodity = async (req, res) => {
  const query = { deletedAt: null, status: "active" };
  try {
    const commodity_list = await Commodity.find(query).select("name");

    return sendResponse({ res, message: "", data: commodity_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};

module.exports.commodityRequest = async (req, res) => {
  try {
    const result = await RequestModel.find({ "product.name": { $exists: true } })
      .select("product.name -_id"); // only fetch product.name

    const nameList = result.map(item => item.product.name);

    return sendResponse({
      res,
      message: "Product names fetched successfully.",
      data: nameList,
    });
  } catch (err) {
    console.error("ERROR:", err);
    return sendResponse({
      res,
      status: 500,
      message: err.message,
    });
  }
};
module.exports.commodity_standard = async (req, res) => {
  const query = { deletedAt: null, status: "active" };
  try {
    const standard_list = await commodityStandard.find(query).select("name");

    return sendResponse({ res, message: "", data: standard_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};

module.exports.bo_list = async (req, res) => {
  const { ho_id } = req.query;

  if (!ho_id) {
    return sendResponse({ res, status: 400, message: "ho_id is required" });
  }

  const query = {
    $or: [
      { "deletedAt": { $eq: null } }, // "deletedAt" is null
      { "deletedAt": { $exists: false } } // "deletedAt" does not exist
    ],
    headOfficeId: new mongoose.Types.ObjectId(ho_id),
    status: "active",
  };

  try {
    const branch_list = await Branches.find(query).select("branchName");

    return sendResponse({ res, message: "", data: branch_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};

module.exports.cna_list = async (req, res) => {
  const query = { deletedAt: null };
  try {
    const cna_list = await HeadOffice.aggregate([
      { $match: query },
      { $project: { name: "$company_details.name" } },
    ]);

    return sendResponse({ res, message: "", data: cna_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};

module.exports.sla_list = async (req, res) => {
  const query = { deletedAt: null, status: "active" };
  try {
    const sla_lists = await SLAManagement.aggregate([
      { $match: query },
      { $project: { name: "$basic_details.name" } },
    ]);

    return sendResponse({ res, message: "", data: sla_lists });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ res,status: 500, message: err.message });
  }
};

module.exports.getStates = async (req, res) => {
  try {
    const state_list = await StateDistrictCity.aggregate([
      { $unwind: "$states" }, // Unwind the states array to extract individual state objects
      {
        $match: {
          "states.deletedAt": null,
          "states.status": "active"
        }
      },
      {
        $project: {
          _id: 1,
          state_title: "$states.state_title",
          state_code: "$states.state_code"
        }
      }
    ]);

    return sendResponse({ res, message: "", data: state_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ res, status: 500, message: err.message });
  }
};

module.exports.getCitiesByState = async (req, res) => {
  try {
    const { state_code } = req.query;

    if (!state_code) {
      return sendResponse({ res, status: 400, message: "State code is required" });
    }

    const city_list = await StateDistrictCity.aggregate([
      { $unwind: "$states" }, // Flatten states array
      { $match: { "states.state_code": state_code, "states.status": "active" } }, // Match state by code
      { $unwind: "$states.districts" }, // Flatten districts array
      { $unwind: "$states.districts.cities" }, // Flatten cities array
      {
        $match: { "states.districts.cities.status": "active" } // Filter only active cities
      },
      {
        $project: {
          _id: 0,
          city_title: "$states.districts.cities.city_title"
        }
      }
    ]);

    return sendResponse({ res, message: "", data: city_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ res, status: 500, message: err.message });
  }
};

module.exports.getCitiesByDistrict = async (req, res) => {
  try {
    const { state_code, district_title } = req.query;

    if (!state_code || !district_title) {
      return sendResponse({
        res,
        status: 400,
        message: "Both state_code and district_title are required",
      });
    }

    const city_list = await StateDistrictCity.aggregate([
      { $unwind: "$states" },
      {
        $match: {
          "states.state_code": state_code,
          "states.status": "active",
        },
      },
      { $unwind: "$states.districts" },
      {
        $match: {
          "states.districts.district_title": district_title,
          "states.districts.status": "active",
        },
      },
      { $unwind: "$states.districts.cities" },
      {
        $match: {
          "states.districts.cities.status": "active",
        },
      },
      {
        $project: {
          _id: 0,
          city_title: "$states.districts.cities.city_title",
        },
      },
    ]);

    return sendResponse({
      res,
      message: "",
      data: city_list,
    });
  } catch (err) {
    console.error("ERROR: ", err);
    return sendResponse({
      res,
      status: 500,
      message: err.message,
    });
  }
};

module.exports.getDistrictsByState = async (req, res) => {
  try {
    const { state_code } = req.query;

    if (!state_code) {
      return sendResponse({
        res,
        status: 400,
        message: "State code is required",
      });
    }

    const district_list = await StateDistrictCity.aggregate([
      { $unwind: "$states" },
      {
        $match: {
          "states.state_code": state_code,
          "states.status": "active",
        },
      },
      { $unwind: "$states.districts" },
      {
        $match: {
          "states.districts.status": "active",
        },
      },
      {
        $project: {
          _id: 0,
          district_title: "$states.districts.district_title",
        },
      },
    ]);

    return sendResponse({
      res,
      message: "",
      data: district_list,
    });
  } catch (err) {
    console.error("ERROR: ", err);
    return sendResponse({
      res,
      status: 500,
      message: err.message,
    });
  }
};


module.exports.getRoles = async (req, res) => {
  const query = { deletedAt: null };
  try {
    const role_list = await UserRole.find({ ...query }, { userRoleName: 1, userRoleType: 1, createdBy: 1, updatedBy: 1 });
    return sendResponse({ res, message: "", data: role_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};

module.exports.getAssociates = async (req, res) => {
  const query = { active: true, deletedAt: null };

  try {
    const associate_list = await User.aggregate([
      { $match: query },
      {
        $project: {
          name: "$basic_details.associate_details.associate_name",
          organization_name: "$basic_details.associate_details.organization_name",
        },
      },
    ]);

    return sendResponse({ res, message: "", data: associate_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};

module.exports.getWarehouses = async (req, res) => {
  const query = { active: true };

  try {
    const warehouse_list = await wareHouseDetails.aggregate([
      { $match: query },
      {
        $project: {
          name: "$basicDetails.warehouseName",
        },
      },
    ]);

    return sendResponse({ res, message: "", data: warehouse_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};
module.exports.districtWisecenter = async (req, res) => {
   try {
    const { district } = req.query;

    if (!district) {
      return res.status(400).json({ success: false, message: 'District is required in query params' });
    }

    const centers = await ProcurementCenter.find({
      'address.district': { $regex: `^${district}$`, $options: 'i' },
      active: true
    }).select('center_name -_id');

    const centerNames = centers.map(center => center.center_name);

    return res.status(200).json({ status: 200, data: centerNames });
  } catch (error) {
    console.error('Error in districtWisecenter:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports.updateProcurementCenters = async (req, res) => {
  try {
    const centers = await ProcurementCenter.find({
      $or: [
        { 'address.state_id': { $exists: false } },
        { 'address.district_id': { $exists: false } },
      ],
    }).lean();
    const updatedCenters = [];

    const cityData = await StateDistrictCity.findOne().lean();
    if (!cityData) throw new Error('No StateDistrictCity document found');
    for (const center of centers) {
      const { state: stateTitle, district: districtTitle } = center.address;

      const stateObj = cityData.states.find(
        st => st.state_title.toLowerCase() === stateTitle.toLowerCase()
      );
      if (!stateObj) {
        console.warn(`State not found for: ${stateTitle}`);
        continue;
      }

      const districtObj = stateObj.districts.find(
        dt => dt.district_title.toLowerCase() === districtTitle.toLowerCase()
      );
      if (!districtObj) {
        console.warn(
          `District not found for: ${districtTitle} in state: ${stateTitle}`
        );
        continue;
      }

      await ProcurementCenter.updateOne(
        { _id: center._id },
        {
          $set: {
            'address.state_id': stateObj._id,
            'address.district_id': districtObj._id,
          },
        }
      );

      console.log(`Updated center ${center._id}: set state_id and district_id`);
      updatedCenters.push(center._id);
    }

    console.log('✅ All done!');
    return res.send({
      message: '✅ All done!',
      data: {
        centers: updatedCenters,
        total: updatedCenters.length
      },
    });
  } catch (err) {
    throw new Error(err.message);
  }
};
module.exports.getStatesByPincode = async (req, res) => {
  try {
    const { pincode } = req.query;
    if (!pincode) {
      return res.send(
        new serviceResponse({
          status: 400,
          message: _middleware.require("pincode"),
        })
      );
    }

    if (pincode.length !== 6) {
      return res.send(
        new serviceResponse({
          status: 400,
          message: "pincode should be of 6 digits",
        })
      );
    }

    const pincode_data = await getAddressByPincode({ pincode });

    if (pincode_data?.Status !== "Success") {
      return res.send(
        new serviceResponse({ status: 400, message: _query.invalid("pincode") })
      );
    }

    const states = await getAllStates();
    const filteredState = states.find(
      (obj) =>
        obj.state_title.toLowerCase() ===
        pincode_data?.PostOffice[0]?.State?.toLowerCase()
    );
    //console.log(">>>>>>>>>>>>>>>>>>>>>>>>", pincode_data, states);
    return res.send(
      new serviceResponse({
        message: "OK",
        data: { states: [filteredState] || states },
      })
    );
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};

module.exports.getDistrictsByState = async (req, res) => {
  try {
    const { stateId, pincode } = req.query;
    if (!stateId) {
      return res.send(
        new serviceResponse({
          status: 400,
          message: _middleware.require("stateId"),
        })
      );
    }

    if (!pincode) {
      return res.send(
        new serviceResponse({
          status: 400,
          message: _middleware.require("pincode"),
        })
      );
    }

    if (pincode.length !== 6) {
      return res.send(
        new serviceResponse({
          status: 400,
          message: "pincode should be of 6 digits",
        })
      );
    }

    const pincode_data = await getAddressByPincode({ pincode });

    if (pincode_data?.Status !== "Success") {
      return res.send(
        new serviceResponse({ status: 400, message: _query.invalid("pincode") })
      );
    }

    let villages = pincode_data.PostOffice.map((obj) => obj.Name);
    let districts = await getDistrictsByStateId(stateId);
    let filteredDistricts = districts.find(
      (obj) =>
        obj.district_title.toLowerCase() ===
        pincode_data.PostOffice[0].District.toLowerCase()
    );
    return res.send(
      new serviceResponse({
        message: _query.get("districts"),
        data: { villages, districts: [filteredDistricts] || districts },
      })
    );
  } catch (err) {
    console.log(err);
    throw new Error(err.message);
  }
};





