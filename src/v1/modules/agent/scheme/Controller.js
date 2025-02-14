const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { Commodity } = require("@src/v1/models/master/Commodity");
const { Scheme } = require("@src/v1/models/master/Scheme");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const mongoose = require("mongoose");

module.exports.createScheme = asyncErrorHandler(async (req, res) => {
  try {
    const {
      schemeName,
      season,
      period,
      centralNodalAgency,
      procurement,
      commodity_id,
      procurementDuration,
      schemeApprovalLetter
    } = req.body;
    // CREATE NEW SCHEME RECORD

    let randomVal;
    // Generate a sequential order number
    const lastOrder = await Scheme.findOne().sort({ createdAt: -1 }).select("schemeId").lean();
    if (lastOrder && lastOrder.schemeId) {
      // Extract the numeric part from the last order's poNo and increment it
      const lastNumber = parseInt(lastOrder.schemeId.replace(/\D/g, ""), 10); // Remove non-numeric characters
      randomVal = `SC${lastNumber + 1}`;
    } else {
      // Default starting point if no orders exist
      randomVal = "SC1001";
    }

    const record = await Scheme.create({
      schemeId: randomVal,
      schemeName,
      season,
      period,
      centralNodalAgency,
      procurement,
      commodity_id,
      procurementDuration,
      schemeApprovalLetter
    });

    return res
      .status(200)
      .send(
        new serviceResponse({
          status: 200,
          data: record,
          message: _response_message.created("Scheme"),
        })
      );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.getScheme = asyncErrorHandler(async (req, res) => {
  const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;

  // Initialize matchQuery
  let matchQuery = {
    deletedAt: null
  };
  if (search) {
    matchQuery.schemeId = { $regex: search, $options: "i" };
  }

  let aggregationPipeline = [
    { $match: matchQuery },
    {
      $lookup: {
        from: 'commodities',
        localField: 'commodity_id',
        foreignField: '_id',
        as: 'commodityDetails',
      },
    },
    { $unwind: { path: '$commodityDetails', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        schemeId: 1,
        // schemeName: 1,
        schemeName: {
          $concat: [
            "$schemeName", "",
            { $ifNull: ["$commodityDetails.name", ""] }, "",
            { $ifNull: ["$season", ""] }, "",
            { $ifNull: ["$period", ""] }
          ]
        },
        commodity_id: 1,
        season: 1,
        period: 1,
        procurement: 1,
        status: 1,
        commodityName: '$commodityDetails.name',
        procurementDuration: 1,
        schemeApprovalLetter: 1
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
  const rows = await Scheme.aggregate(aggregationPipeline);
  const countPipeline = [
    { $match: matchQuery },
    { $count: "total" }
  ];
  const countResult = await Scheme.aggregate(countPipeline);
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
        "Scheme Id": item?.schemeId || "NA",
        "scheme Name": item?.schemeName || "NA",
        "SchemeCommodity": item?.commodity || "NA",
        "season": item?.season || "NA",
        "period": item?.period || "NA",
        "procurement": item?.procurement || "NA"
      };
    });
    if (record.length > 0) {
      dumpJSONToExcel(req, res, {
        data: record,
        fileName: `Scheme-record.xlsx`,
        worksheetName: `Scheme-record`
      });
    } else {
      return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("Scheme") }));
    }
  } else {
    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Scheme") }));
  }
});

module.exports.getSchemeById = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid item ID" });
  }
  // const record = await Scheme.findOne({ _id: id }); 
  let matchQuery = {
    _id: new mongoose.Types.ObjectId(id)
  };
  let aggregationPipeline = [
    { $match: matchQuery },
    {
      $lookup: {
        from: 'commodities',
        localField: 'commodity_id',
        foreignField: '_id',
        as: 'commodityDetails',
      },
    },
    { $unwind: { path: '$commodityDetails', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        schemeId: 1,
        // schemeName: 1,
        schemeName: {
          $concat: [
            "$schemeName", "",
            { $ifNull: ["$commodityDetails.name", ""] }, "",
            { $ifNull: ["$season", ""] }, "",
            { $ifNull: ["$period", ""] }
          ]
        },
        commodity_id: 1,
        season: 1,
        period: 1,
        procurement: 1,
        status: 1,
        commodityName: '$commodityDetails.name',
        procurementDuration: 1,
        schemeApprovalLetter: 1
      }
    }
  ];

  const record = await Scheme.aggregate(aggregationPipeline);

  if (!record) {
    return res
      .status(400)
      .send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("Scheme") }],
        })
      );
  }
  return res
    .status(200)
    .send(
      new serviceResponse({
        status: 200,
        data: record,
        message: _response_message.found("Scheme"),
      })
    );
});

module.exports.updateScheme = asyncErrorHandler(async (req, res) => {
  try {
    const { id, schemeName, commodity_id, season, period, centralNodalAgency, procurement, procurementDuration, schemeApprovalLetter } = req.body;
    const record = await Scheme.findOne({ _id: id, deletedAt: null })

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

    record.schemeName = schemeName || record.schemeName;
    record.commodity_id = commodity_id || record.commodity_id;
    record.season = season || record.season;
    record.period = period || record.period;
    record.centralNodalAgency = centralNodalAgency || record.centralNodalAgency;
    record.procurement = procurement || record.procurement;
    record.procurementDuration = procurementDuration || record.procurementDuration;
    record.schemeApprovalLetter = schemeApprovalLetter || record.schemeApprovalLetter;

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

module.exports.deleteScheme = asyncErrorHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const existingRecord = await Scheme.findOne({ _id: id, deletedAt: null }); // Ensure it's not already deleted
    if (!existingRecord) {
      return sendResponse({ res, status: 400, errors: [{ message: _response_message.notFound("Scheme") }] });
    }

    const record = await Scheme.findOneAndUpdate(
      { _id: id },
      { deletedAt: new Date() }, // Soft delete by setting deletedAt timestamp
      { new: true }
    );

    return sendResponse({ res, status: 200, data: record, message: _response_message.deleted("Scheme") });
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.statusUpdateScheme = asyncErrorHandler(async (req, res) => {
  try {
    const { id, status } = req.body;
    const record = await Scheme.findOne({ _id: id, deletedAt: null })
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
    record.status = status || record.status;
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
