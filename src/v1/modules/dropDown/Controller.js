const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");
const SLAManagement = require("@src/v1/models/app/auth/SLAManagement");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { Commodity } = require("@src/v1/models/master/Commodity");
const {
  commodityStandard,
} = require("@src/v1/models/master/commodityStandard");
const { Scheme } = require("@src/v1/models/master/Scheme");
const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
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
    deletedAt: null,
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
  const query = { deletedAt: null };
  try {
    const state_list = await StateDistrictCity.find( { ...query } );
console.log(state_list);
    return sendResponse({ res, message: "", data: state_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};

