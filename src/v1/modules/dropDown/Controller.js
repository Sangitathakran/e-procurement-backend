const { Associate } = require("@src/v1/models/app/auth/Associate");
const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");
const SLAManagement = require("@src/v1/models/app/auth/SLAManagement");
const { User } = require("@src/v1/models/app/auth/User");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { Commodity } = require("@src/v1/models/master/Commodity");
const {
  commodityStandard,
} = require("@src/v1/models/master/commodityStandard");
const { Scheme } = require("@src/v1/models/master/Scheme");
const {
  StateDistrictCity,
} = require("@src/v1/models/master/StateDistrictCity");
const { State } = require("@src/v1/models/master/states");
const UserRole = require("@src/v1/models/master/UserRole");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { default: mongoose } = require("mongoose");
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
    const sla_list = await SLAManagement.aggregate([
      { $match: query },
      { $project: { name: "$basic_details.name" } },
    ]);

    return sendResponse({ res, message: "", data: sla_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};

module.exports.getStates = async (req, res) => {
  try {
    // const state_list = await StateDistrictCity.aggregate([
    //   { $unwind: "$states" }, // Unwind the states array to extract individual state objects
    //   {
    //     $match: {
    //       "states.deletedAt": null,
    //       "states.status": "active"
    //     }
    //   },
    //   {
    //     $project: {
    //      // _id: 1,
    //       state_title: "$states.state_title",
    //       state_code: "$states.state_code"
    //     }
    //   }
    // ]);
    const state_list = await State.find({}, {state_title: 1, state_code: 1});

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


