const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _status } = require("@src/v1/utils/constants");
const { Scheme } = require("@src/v1/models/master/Scheme");
const { SchemeAssign } = require("@src/v1/models/master/SchemeAssign");
const { mongoose } = require("mongoose");
const { convertToObjecId } = require("@src/v1/utils/helpers/api.helper");

module.exports.getAssignedScheme = asyncErrorHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      paginate = 1,
      sortBy,
      search = '',
      schemeName,
      status,
      commodity,
      season,
      sla,
      isExport = 0,
    } = req.query;

    const { portalId } = req;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let matchQuery = {
      bo_id: new mongoose.Types.ObjectId(portalId),
      deletedAt: null,
    };

    const aggregationPipeline = [
      { $match: matchQuery },

      // Join with Scheme
      {
        $lookup: {
          from: "schemes",
          localField: "scheme_id",
          foreignField: "_id",
          as: "schemeDetails",
        },
      },
      { $unwind: { path: "$schemeDetails", preserveNullAndEmptyArrays: true } },

      // Join with Commodity
      {
        $lookup: {
          from: "commodities",
          localField: "schemeDetails.commodity_id",
          foreignField: "_id",
          as: "commodityDetails",
        },
      },
      { $unwind: { path: "$commodityDetails", preserveNullAndEmptyArrays: true } },

      // Join with SLA
      {
        $lookup: {
          from: "slas",
          localField: "sla_id",
          foreignField: "_id",
          as: "slaDetails",
        },
      },
      { $unwind: { path: "$slaDetails", preserveNullAndEmptyArrays: true } },
    ];

    // Apply filters for schemeName, commodity, season, status, sla
    const filterConditions = {};
    if (schemeName) {
      filterConditions["schemeDetails._id"] = convertToObjecId(schemeName);
    }
    if (commodity) {
      filterConditions["commodityDetails._id"] = convertToObjecId(commodity);
    }
    if (season) {
      filterConditions["schemeDetails.season"] = season;
    }
    if (status) {
      filterConditions["schemeDetails.status"] = status;
    }

    if (sla) {
      filterConditions["slaDetails._id"] = convertToObjecId(sla);
    }

    if (Object.keys(filterConditions).length > 0) {
      aggregationPipeline.push({ $match: filterConditions });
    }

    // Add fields to simplify output
    aggregationPipeline.push({
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
        schemeSeason: "$schemeDetails.season",
        schemeStatus: "$schemeDetails.status",
        commodityName: "$commodityDetails.name",
        commodity_id: "$schemeDetails.commodity_id",
        scheme_id: 1,
        status: 1,
        createdAt: 1,
      },
    });

    // Search by schemeId or schemeName
    if (search?.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      aggregationPipeline.push({
        $match: {
          $or: [
            { "schemeDetails.schemeId": { $regex: searchRegex } },
            { "schemeDetails.schemeName": { $regex: searchRegex } },
            { schemeName: { $regex: searchRegex } },
          ],
        },
      });
    }

    // Final projection
    aggregationPipeline.push({
      $project: {
        _id: 1,
        procurementTarget: "$assignQty",
        schemeId: "$schemeDetails.schemeId",
        schemeName: 1,
        schemeSeason: 1,
        scheme_id: "$schemeDetails._id",
        commodity: "$commodityDetails.name",
        commodity_id: "$commodityDetails._id",
        sla_name: "$slaDetails.basic_details.name",
        sla_id: "$slaDetails._id",
        status: "$schemeDetails.status",
        createdAt: "$schemeDetails.createdAt",
      },
    });

    // Count for pagination
    const countPipeline = [...aggregationPipeline, { $count: "total" }];
    const countResult = await SchemeAssign.aggregate(countPipeline);
    const count = countResult[0]?.total || 0;

    // Pagination or Sorting
    if (paginate == 1 && isExport != 1) {
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

    // Excel export
    if (isExport == 1) {
      const record = rows.map((item) => ({
        "Scheme Id": item?.schemeId || "NA",
        "Scheme": item?.schemeName || "NA",
        "Procurement Target (in MT)": item?.procurementTarget || 0,
        "Scheme Created On": item?.createdAt || "NA",
        "Status": item?.status || "NA",
      }));

      if (record.length > 0) {
        return dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Scheme-record.xlsx`,
          worksheetName: `Scheme-record`,
        });
      } else {
        return res.status(200).send(
          new serviceResponse({
            status: 200,
            data: { rows, count },
            message: _response_message.notFound("Scheme"),
          })
        );
      }
    } else {
      const records = {
        rows,
        count,
        ...(paginate == 1 && {
          page: parseInt(page),
          limit: parseInt(limit),
          pages: limit != 0 ? Math.ceil(count / limit) : 0,
        }),
      };

      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: records,
          message: _response_message.found("Scheme"),
        })
      );
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.getslaByBo = asyncErrorHandler(async (req, res) => {
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

    const { user_id } = req;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(scheme_id)) {
      return res.status(400).json({ message: "Invalid scheme ID" });
    }

    // Initialize matchQuery
    let matchQuery = {
      scheme_id: new mongoose.Types.ObjectId(scheme_id),
      bo_id: new mongoose.Types.ObjectId(user_id),
      sla_id: { $exists: true, $ne: null },
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
          from: "schemes",
          localField: "scheme_id",
          foreignField: "_id",
          as: "schemeDetails",
        },
      },
      { $unwind: { path: "$schemeDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "slas", // Adjust this to your actual collection name for branches
          localField: "sla_id",
          foreignField: "_id",
          as: "slaDetails",
        },
      },
      { $unwind: { path: "$slaDetails", preserveNullAndEmptyArrays: true } },

      // Add schemeName field before filtering
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
        },
      },
    ];

    if (search?.trim()) {
      aggregationPipeline.push({
        $match: {
          $or: [
            { "schemeDetails.schemeId": { $regex: search, $options: "i" } },
            { schemeName: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    aggregationPipeline.push({
      $project: {
        _id: 1,
        slaName: "$slaDetails.basic_details.name",
        slaId: "$slaDetails.slaId",
        targetAssigned: "$assignQty",
        targetAchieved: "$schemeDetails.procurement",
        schemeId: "$schemeDetails.schemeId",
        // schemeName: {
        //   $concat: [
        //     "$schemeDetails.schemeName",
        //     "",
        //     { $ifNull: ["$schemeDetails.commodityDetails.name", ""] },
        //     "",
        //     { $ifNull: ["$schemeDetails.season", ""] },
        //     "",
        //     { $ifNull: ["$schemeDetails.period", ""] },
        //   ],
        // },
        schemeName: 1,
        status: 1,
      },
    });

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

    const countPipeline = [...aggregationPipeline.slice(0, -1), { $count: "total" }]; //[{ $match: matchQuery }, { $count: "total" }];
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
        procurementTarget: firstRow.targetAchieved,
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
      // schemeDetails,
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
