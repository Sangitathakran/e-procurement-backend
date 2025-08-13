const { _handleCatchErrors, dumpJSONToCSV, dumpJSONToExcel, handleDecimal, dumpJSONToPdf } = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _query } = require("@src/v1/utils/constants/messages");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _status } = require("@src/v1/utils/constants");
const { Scheme } = require("@src/v1/models/master/Scheme");
const { SchemeAssign } = require("@src/v1/models/master/SchemeAssign");
const { mongoose, isValidObjectId } = require("mongoose");
const { convertToObjecId } = require("@src/v1/utils/helpers/api.helper");

module.exports.getScheme = asyncErrorHandler(async (req, res) => {
  const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', schemeName, status, isExport = 0 } = req.query;
  const { user_id, portalId } = req;

  const Ids = (await SchemeAssign.find({ ho_id: new mongoose.Types.ObjectId(portalId) })).map(i => i.scheme_id);
  // Initialize matchQuery
  let matchQuery = {
    // _id: { $in: Ids },
    ho_id: new mongoose.Types.ObjectId(portalId),
    deletedAt: null,
  };


  if(schemeName && !isValidObjectId(schemeName)){
    return sendResponse( { res, status: 400, message: _query.invalid(schemeName) } );
  }


  let aggregationPipeline = [
    { $match: matchQuery },
    {
      $lookup: {
        from: "schemes",
        localField: "scheme_id",
        foreignField: "_id",
        as: "schemeDetails",
      },
    },
    { $unwind: { path: "$schemeDetails", preserveNullAndEmptyArrays: true } },
    ...( status ? [ { $match:  { "schemeDetails.status": status}  } ] : []),
    {
      $lookup: {
        from: 'commodities',
        localField: 'schemeDetails.commodity_id',
        foreignField: '_id',
        as: 'commodityDetails',
      },
    },
    { $unwind: { path: '$commodityDetails', preserveNullAndEmptyArrays: true } },
    

     // 💥 Unique filtering based on scheme_id
     {
      $group: {
        _id: "$scheme_id",
        doc: { $first: "$$ROOT" }
      }
    },
    {
      $replaceRoot: { newRoot: "$doc" }
    },

    {
      $addFields: {
        schemeName: {
          $concat: [
            "$schemeDetails.schemeName",
            " ",
            { $ifNull: ["$commodityDetails.name", ""] },
            " ",
            { $ifNull: ["$schemeDetails.season", ""] },
            " ",
            { $ifNull: ["$schemeDetails.period", ""] },
          ],
        },
        schemeId: '$schemeDetails.schemeId'
      },
    },

   
  ];

  if (search.trim()) {
    aggregationPipeline.push({
      $match: {
        $or: [{ schemeName: { $regex: search, $options: 'i' } }, { schemeId: { $regex: search, $options: 'i' } }]
      }
    });
  }

  if (schemeName) {
    aggregationPipeline.push({
      $match: {
        scheme_id: convertToObjecId(schemeName)
      }
    });
  }
  
  aggregationPipeline.push(
    {
      $project: {
        _id: 1,
        scheme_id: 1,
        schemeName: 1,
        createdAt: 1,
        schemeId: '$schemeDetails.schemeId',
        Schemecommodity: '$schemeDetails.Schemecommodity',
        season: '$schemeDetails.season',
        period: '$schemeDetails.period',
        procurement: '$assignQty',
        status: '$schemeDetails.status',
      },
    }
  );

 

  if (paginate == 1 && isExport != 1 ) {
    aggregationPipeline.push(
      { $sort: { [sortBy || "createdAt"]: -1, _id: -1 } }, // Secondary sort by _id for stability
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) }
    );
  } else {
    aggregationPipeline.push({
      $sort: { [sortBy || "createdAt"]: -1, _id: -1 },
    });
  }

  // const rows = await Scheme.aggregate(aggregationPipeline);
  const rows = await SchemeAssign.aggregate(aggregationPipeline);
  const countPipeline = [
    { $match: matchQuery },
    {
      $group: {
        _id: "$scheme_id"
      }
    },
    {
      $count: "total"
    }
  ];
  const countResult = await SchemeAssign.aggregate(countPipeline);

  const count = countResult[0]?.total || 0;
  const records = { rows, count };
  if (paginate == 1 && isExport != 1) {
    records.page = parseInt(page);
    records.limit = parseInt(limit);
    records.pages = limit != 0 ? Math.ceil(count / limit) : 0;
  }
  if (isExport == 1) {
    const record = rows.map((item) => {
      console.log(item);
      return {
        "SCHEME ID": item?.schemeId || "NA",
        "SCHEME": item?.schemeName || "NA",
        "ASSIGNED QUANTITY (IN MT)": item?.procurement || "NA",
         "SCHEME CREATED ON": item?.createdAt || "NA",
        "STATUS" : item?.status|| "NA",
        // season: item?.season || "NA",
        // period: item?.period || "NA",
      };
    });
    if (record.length > 0) {
      dumpJSONToExcel(req, res, {
        data: record,
        fileName: `HO-Scheme-record.xlsx`,
        worksheetName: `HO-Scheme-record`,
      });
    } else {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: records,
          message: _response_message.notFound("Scheme"),
        })
      );
    }
  } else {
    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("Scheme"),
      })
    );
  }
});

module.exports.getAssignedScheme = asyncErrorHandler(async (req, res) => {
  try {
    const {
      scheme_id,
      page = 1,
      limit = 10,
      skip = 0,
      paginate = 1,
      sortBy,
      search = "",
      isExport = 0,
    } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(scheme_id)) {
      return res.status(400).json({ message: "Invalid scheme ID" });
    }

    let matchQuery = {
      scheme_id: new mongoose.Types.ObjectId(scheme_id),
      bo_id: { $exists: true, $ne: null }
    };

    let aggregationPipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: "branches",
          localField: "bo_id",
          foreignField: "_id",
          as: "branchDetails",
        },
      },
      { $unwind: { path: "$branchDetails", preserveNullAndEmptyArrays: true } },
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
        $lookup: {
          from: "schemes",
          localField: "scheme_id",
          foreignField: "_id",
          as: "schemeDetails",
        },
      },
      { $unwind: { path: "$schemeDetails", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          schemeName: {
            $concat: [
              "$schemeDetails.schemeName",
              " ",
              { $ifNull: ["$schemeDetails.commodityDetails.name", ""] },
              " ",
              { $ifNull: ["$schemeDetails.season", ""] },
              " ",
              { $ifNull: ["$schemeDetails.period", ""] },
            ],
          },
          schemeId: '$schemeDetails.schemeId'
        },
      },

    ];

    if (search.trim()) {
      aggregationPipeline.push({
        $match: {
          $or: [
            { schemeName: { $regex: search, $options: "i" } },
            { schemeId: { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    aggregationPipeline.push(
      {
        $project: {
          _id: 1,
          branchId: "$branchDetails.branchId",
          branchName: "$branchDetails.branchName",
          branchLocation: "$branchDetails.state",
          targetAchieved: '$schemeDetails.procurement',
          bo_id: 1,
          assignQty: 1,
          schemeId: 1,//"$schemeDetails.schemeId",
          schemeName: 1,
          scheme_id: 1,
          procurement: 1,
          status: 1
        },
      }
    );

    if (paginate == 1) {
      aggregationPipeline.push(
        { $sort: { [sortBy || "createdAt"]: -1, _id: -1 } },
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) }
      );
    } else {
      aggregationPipeline.push({
        $sort: { [sortBy || "createdAt"]: -1, _id: -1 },
      });
    }

    const rows = await SchemeAssign.aggregate(aggregationPipeline);

    const countPipeline = [{ $match: matchQuery }, { $count: "total" }];
    const countResult = await SchemeAssign.aggregate(countPipeline);
    const count = countResult[0]?.total || 0;

    // Extract scheme details from the first row
    let schemeDetails = {};
    if (rows.length > 0) {
      const firstRow = rows[0];
      schemeDetails = {
        scheme_id: firstRow.scheme_id,
        status: firstRow.status,
        schemeId: firstRow.schemeId,
        schemeName: firstRow.schemeName,
        procurementTarget: firstRow.procurement,
      };
    }

    // Remove schemeId and schemeName from all rows except the first one
    const modifiedRows = rows.map((item, index) => {
      if (index === 0) return item;
      const { schemeId, schemeName, ...rest } = item;
      return rest;
    });

    const records = {
      rows: modifiedRows,
      schemeDetails,
      count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: limit != 0 ? Math.ceil(count / limit) : 0,
    };

    if (isExport == 1) {
      const record = rows.map((item) => ({
        "Scheme Id": item?.schemeId || "NA",
        "BO ID": item?.bo_id || "NA",
        "assign Qty": item?.assignQty || "NA",
      }));

      if (record.length > 0) {
        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Scheme-record.xlsx`,
          worksheetName: `Scheme-record`,
        });
      } else {
        return res.status(200).send(
          new serviceResponse({
            status: 200,
            data: records,
            message: _response_message.notFound("Scheme Assign"),
          })
        );
      }
    } else {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: records,
          message: _response_message.found("Scheme Assign"),
        })
      );
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.getslaByBo = asyncErrorHandler(async (req, res) => {
  try {
    const { bo_id, page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;

    // Initialize matchQuery

    let matchQuery = {
      bo_id: new mongoose.Types.ObjectId(bo_id),
      sla_id: { $exists: true, $ne: null }
    };

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(bo_id)) {
      return res.status(400).json({ message: "Invalid BO ID" });
    }

    let aggregationPipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: "schemes", // Adjust this to your actual collection name for branches
          localField: "scheme_id",
          foreignField: "_id",
          as: "schemeDetails"
        }
      },
      // { $unwind: { path: "$schemeDetails", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$schemeDetails" } },
      {
        $lookup: {
          from: "slas", // Adjust this to your actual collection name for branches
          localField: "sla_id",
          foreignField: "_id",
          as: "slaDetails"
        }
      },
      { $unwind: { path: "$slaDetails", preserveNullAndEmptyArrays: true } },

    ];

    if (search) {
      aggregationPipeline.push({
        $match: {
          $or: [
            { 'slaDetails.slaId': { $regex: search, $options: 'i' } },
            { 'slaDetails.basic_details.name': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }
    aggregationPipeline.push(
      {
        $project: {
          _id: 1,
          slaName: '$slaDetails.basic_details.name',
          slaId: '$slaDetails.slaId',
          targetAssigned: "$assignQty",
          targetAchieved: '$schemeDetails.procurement'
        }
      }
    );
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
          "schemeName": item?.schemeName || "NA",
          "branchName": item?.branchName || "NA",
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
  } catch (error) {
    _handleCatchErrors(error, res);
  }
})

module.exports.updateScheme = asyncErrorHandler(async (req, res) => {
  try {
    const { id, schemeName, commodity } = req.body;
    const record = await SchemeAssign.findOne({ _id: id, deletedAt: null });

    if (!record) {
      return res.status(400).send(
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
    return res.status(200).send(
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
      return sendResponse({
        res,
        status: 400,
        errors: [{ message: _response_message.notFound("Scheme") }],
      });
    }

    const record = await Scheme.findOneAndUpdate(
      { _id: id },
      { deletedAt: new Date() }, // Soft delete by setting deletedAt timestamp
      { new: true }
    );

    return sendResponse({
      res,
      status: 200,
      data: record,
      message: _response_message.deleted("Scheme"),
    });
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.statusUpdateScheme = asyncErrorHandler(async (req, res) => {
  try {
    const { id, status } = req.body;
    const record = await Scheme.findOne({ _id: id, deletedAt: null });
    if (!record) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          message: _response_message.notFound("Scheme"),
        })
      );
    }
    record.status = status || record.status;
    await record.save();
    return res.status(200).send(
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
