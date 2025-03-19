const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { Commodity } = require("@src/v1/models/master/Commodity");
const { commodityStandard } = require("@src/v1/models/master/commodityStandard");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _status } = require("@src/v1/utils/constants");
const { NULL } = require("xlsx-populate/lib/FormulaError");
const mongoose = require("mongoose");

module.exports.createStandard = asyncErrorHandler(async (req, res) => {
  try {
    const { name, subName } = req.body;

    // Validation
    if (!name || !Array.isArray(subName) || subName.length === 0) {
      return res.status(400).json({
        status: 400,
        message: "Invalid request. 'name' and 'subName' must be provided.",
      });
    }

    // Create new entry
    const newScheme = await commodityStandard.create({ name, subName });

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: newScheme,
        message: _response_message.created("Standard"),
      })
    );
  } catch (error) {
    console.error("Error creating standard:", error); // Log error for debugging
    _handleCatchErrors(error, res);
  }
});

module.exports.getStandard = asyncErrorHandler(async (req, res) => {
  const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;

  // Initialize matchQuery
  let matchQuery = {
    deletedAt: null
  };
  if (search) {
    matchQuery.standardId = { $regex: search, $options: "i" };
  }

  let aggregationPipeline = [
    { $match: matchQuery },
    {
      $project: {
        _id: 1,
        schemeId: 1,
        name: 1,
        subName: 1,
        status: 1
      }
    }
  ];
  if (paginate == 1) {
    aggregationPipeline.push(
      { $sort: { [sortBy || 'createdAt']: -1, _id: -1 } }, // Secondary sort by _id for stability
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) }
    );
  } else {
    aggregationPipeline.push({ $sort: { [sortBy || 'createdAt']: -1, _id: -1 } },);
  }
  const rows = await commodityStandard.aggregate(aggregationPipeline);
  const countPipeline = [
    { $match: matchQuery },
    { $count: "total" }
  ];
  const countResult = await commodityStandard.aggregate(countPipeline);
  const count = countResult[0]?.total || 0;
  const records = { rows, count };
  if (paginate == 1) {
    records.page = parseInt(page);
    records.limit = parseInt(limit);
    records.pages = limit != 0 ? Math.ceil(count / limit) : 0;
  }
  if (isExport == 1) {
    const record = rows.map((item) => {
      return {
        "Standard Id": item?.standardId || "NA",
        "name": item?.name || "NA",
        "subName": item?.subName || "NA",

      };
    });
    if (record.length > 0) {
      dumpJSONToExcel(req, res, {
        data: record,
        fileName: `Standard-record.xlsx`,
        worksheetName: `Standard-record`
      });
    } else {
      return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("Standard") }));
    }
  } else {
    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Standard") }));
  }
});

module.exports.getStandardById = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid item ID" });
  }
  const record = await commodityStandard.findOne({ _id: id });
  if (!record) {
    return res
      .status(400)
      .send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("Standard") }],
        })
      );
  }
  return res
    .status(200)
    .send(
      new serviceResponse({
        status: 200,
        data: record,
        message: _response_message.found("Standard"),
      })
    );
});

module.exports.updateStandard = asyncErrorHandler(async (req, res) => {
  try {
    const { id,name, subName } = req.body;

    // Validation
    if (!name || !Array.isArray(subName) || subName.length === 0) {
      return res.status(400).json({
        status: 400,
        message: "Invalid request. 'name' and 'subName' must be provided.",
      });
    }

    // Find and update document
    const record = await commodityStandard.findByIdAndUpdate(
      id,
      { name, subName },
      { new: true, runValidators: true } // Returns updated doc & validates input
    );

    await record.save();
    return res
      .status(200)
      .send(
        new serviceResponse({
          status: 200,
          data: record,
          message: _response_message.updated("Commodity Standard"),
        })
      );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.deleteStandard = asyncErrorHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const existingRecord = await commodityStandard.findOne({ _id: id });
    if (!existingRecord) {
      return sendResponse({ res, status: 400, errors: [{ message: _response_message.notFound("Standard") }] })
    }
    const record = await commodityStandard.findOneAndUpdate({ _id: id }, { deletedAt: new Date() }, { new: true });
    return sendResponse({ res, status: 200, data: record, message: _response_message.deleted("Standard") })
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.statusUpdateStandard = asyncErrorHandler(async (req, res) => {
  try {
    const { id, status } = req.body;
    const record = await commodityStandard.findOne({ _id: id, deletedAt: null })
    if (!record) {
      return res
        .status(400)
        .send(
          new serviceResponse({
            status: 400,
            message: _response_message.notFound("Standard"),
          })
        );
    }
    record.status = status || record.status;
    await record.save();
    return res
      .status(200)
      .send(
        new serviceResponse({
          status: 200,
          data: record,
          message: _response_message.updated("Standard"),
        })
      );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.standardListByName = asyncErrorHandler(async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return sendResponse({ res, status: 400, errors: [{ message: _response_message.notFound("Name") }] })
  }

  let query = {
    name: name,
    status: _status.active,
    deletedAt: null
  };

  const records = await commodityStandard.find(query);

  if (!records) {
    return res
      .status(400)
      .send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("Standard") }],
        })
      );
  }
  return res
    .status(200)
    .send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("Standard"),
      })
    );
});