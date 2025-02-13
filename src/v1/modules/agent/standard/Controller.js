const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { Commodity } = require("@src/v1/models/master/Commodity");
const { Standard } = require("@src/v1/models/master/Standard");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");


module.exports.createStandard = asyncErrorHandler(async (req, res) => {
  try {
    const {
      name,
      subname,
    } = req.body;
    // CREATE NEW SCHEME RECORD

    let randomVal;
    // Generate a sequential order number
    const lastOrder = await Standard.findOne().sort({ createdAt: -1 }).select("standardId").lean();
    if (lastOrder && lastOrder.standardId) {
      // Extract the numeric part from the last order's poNo and increment it
      const lastNumber = parseInt(lastOrder.standardId.replace(/\D/g, ""), 10); // Remove non-numeric characters
      randomVal = `ST${lastNumber + 1}`;
    } else {
      // Default starting point if no orders exist
      randomVal = "ST1001";
    }

    const record = await Standard.create({
      standardId: randomVal,
      name,
      subName,
    });

    return res
      .status(200)
      .send(
        new serviceResponse({
          status: 200,
          data: record,
          message: _response_message.created("Standard"),
        })
      );
  } catch (error) {
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
        subName: 1
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
  const rows = await Standard.aggregate(aggregationPipeline);
  const countPipeline = [
    { $match: matchQuery },
    { $count: "total" }
  ];
  const countResult = await Standard.aggregate(countPipeline);
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
  const record = await Standard.findOne({ _id: id });
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
    const { id, name, subname } = req.body;
    const record = await Standard.findOne({ _id: id, deletedAt: null })

    if (!record) {
      return res
        .status(400)
        .send(
          new serviceResponse({
            status: 400,
            message: _response_message.notFound("Scheme"),
          })
        );
    }

    record.name = name || record.name;
    record.subname = subname || record.subname;

    await record.save();
    return res
      .status(200)
      .send(
        new serviceResponse({
          status: 200,
          data: record,
          message: _response_message.updated("Scheme"),
        })
      );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.deleteStandard = asyncErrorHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const existingRecord = await Standard.findOne({ _id: id });
    if (!existingRecord) {
      return sendResponse({ res, status: 400, errors: [{ message: _response_message.notFound("Standard") }] })
    }
    const record = await Standard.findOneAndUpdate({ _id: id }, { deletedAt: new Date() }, { new: true });
    return sendResponse({ res, status: 200, data: record, message: _response_message.deleted("Standard") })
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.statusUpdateStandard = asyncErrorHandler(async (req, res) => {
  try {
    const { id, status } = req.body;
    const record = await Standard.findOne({ _id: id, deletedAt: null })
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
