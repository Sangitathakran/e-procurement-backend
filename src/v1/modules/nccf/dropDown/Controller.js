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
