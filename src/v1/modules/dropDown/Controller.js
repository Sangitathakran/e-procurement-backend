const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");
const SLAManagement = require("@src/v1/models/app/auth/SLAManagement");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { Commodity } = require("@src/v1/models/master/Commodity");
const {
  commodityStandard,
} = require("@src/v1/models/master/commodityStandard");
const { Scheme } = require("@src/v1/models/master/Scheme");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");

module.exports.scheme = async (req, res) => {
  try {
    const scheme_list = await Scheme.find().select("schemeName");

    return sendResponse({ res, message: "", data: scheme_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};

module.exports.commodity = async (req, res) => {
  try {
    const commodity_list = await Commodity.find().select("name");

    return sendResponse({ res, message: "", data: commodity_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};

module.exports.commodity_standard = async (req, res) => {
  try {
    const standard_list = await commodityStandard.find().select("name");

    return sendResponse({ res, message: "", data: standard_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};

module.exports.bo_list = async (req, res) => {
  try {
    const branch_list = await Branches.find().select("branchName");

    return sendResponse({ res, message: "", data: branch_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};

module.exports.cna_list = async (req, res) => {
  try {
    const cna_list = await HeadOffice.aggregate([
      { $project: { name: "$company_details.name" } },
    ]);

    return sendResponse({ res, message: "", data: cna_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};

module.exports.sla_list = async (req, res) => {
  try {
    const sla_list = await SLAManagement.aggregate([
      { $project: { name: "$basic_details.name" } },
    ]);

    return sendResponse({ res, message: "", data: sla_list });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};
