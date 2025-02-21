const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _status } = require("@src/v1/utils/constants");
const { Scheme } = require("@src/v1/models/master/Scheme");
const { SchemeAssign } = require("@src/v1/models/master/SchemeAssign");
const { mongoose } = require("mongoose");

module.exports.getScheme = asyncErrorHandler(async (req, res) => {
  const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;

  // Initialize matchQuery
  let matchQuery = {
    status: _status.active,
    deletedAt: null
  };
  if (search) {
    matchQuery.schemeId = { $regex: search, $options: "i" };
  }

  let aggregationPipeline = [
    { $match: matchQuery },
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
        Schemecommodity: 1,
        season: 1,
        period: 1,
        procurement: 1,
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

module.exports.getAssignedScheme = asyncErrorHandler(async (req, res) => {

  const { scheme_id, page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;

  // Initialize matchQuery
  let matchQuery = { scheme_id: scheme_id };

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid item ID" });
  }

  let aggregationPipeline = [
    { $match: matchQuery },
    {
      $lookup: {
          from: 'branches',
          localField: 'bo_id',
          foreignField: '_id',
          as: 'branchDetails',
      },
  },
  { $unwind: { path: '$branchDetails', preserveNullAndEmptyArrays: true } },
  {
      $lookup: {
          from: "schemes", // Adjust this to your actual collection name for branches
          localField: "scheme_id",
          foreignField: "_id",
          as: "schemeDetails"
      }
  },
  { $unwind: { path: "$schemeDetails", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        schemeId: '$schemeDetails.schemeId',
        // schemeName: '$schemeDetails.schemeName',
        schemeName: {
          $concat: [
            "$schemeName", "",
            { $ifNull: ["$commodityDetails.name", ""] }, "",
            { $ifNull: ["$season", ""] }, "",
            { $ifNull: ["$period", ""] }
          ]
        },
        branchName:'$branchDetails.branchName',
        branchLocation:'$branchDetails.state',
        scheme_id: 1,
        bo_id: 1,
        assignQty: 1,
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
  const rows = await SchemeAssign.aggregate(aggregationPipeline);
  const countPipeline = [
    { $match: matchQuery },
    { $count: "total" }
  ];
  const countResult = await SchemeAssign.aggregate(countPipeline);
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
        "BO ID": item?.schemeName || "NA",
        "assign Qty": item?.assignQty || "NA",
      };
    });
    if (record.length > 0) {
      dumpJSONToExcel(req, res, {
        data: record,
        fileName: `Scheme-record.xlsx`,
        worksheetName: `Scheme-record`
      });
    } else {
      return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("Scheme Assign") }));
    }
  } else {
    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Scheme Assign") }));
  }

});

module.exports.updateScheme = asyncErrorHandler(async (req, res) => {
  try {
    const { id, schemeName, commodity } = req.body;
    const record = await SchemeAssign.findOne({ _id: id, deletedAt: null })

    if (!record) {
      return res
        .status(400)
        .send(
          new serviceResponse({
            status: 400,
            message: _response_message.notFound("Scheme Assigned"),
          })
        );
    }

    record.schemeName = schemeName || record.schemeName;
    record.commodity = commodity || record.commodity;
    record.season = season || record.season;

    await record.save();
    return res
      .status(200)
      .send(
        new serviceResponse({
          status: 200,
          data: record,
          message: _response_message.updated("Scheme Assign"),
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
