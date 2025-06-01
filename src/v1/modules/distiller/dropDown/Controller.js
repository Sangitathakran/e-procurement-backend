const { Associate } = require("@src/v1/models/app/auth/Associate");
const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");
// const SLAManagement = require("@src/v1/models/app/auth/SLAManagement");
const { User } = require("@src/v1/models/app/auth/User");
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
          _id: 0,
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

