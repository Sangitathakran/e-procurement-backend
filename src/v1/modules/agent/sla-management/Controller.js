const SLAManagement = require("@src/v1/models/app/auth/SLAManagement");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const { Scheme } = require("@src/v1/models/master/Scheme");
const { SchemeAssign } = require("@src/v1/models/master/SchemeAssign");
const { mongoose } = require("mongoose");
const { ObjectId } = require("mongoose").Types;

module.exports.createSLA = asyncErrorHandler(async (req, res) => {
  try {
    const data = req.body;

    // Required fields validation

    const requiredFields = [
      "basic_details.name",
      "basic_details.email",
      "basic_details.mobile",
      "company_owner_information.owner_name",
      "company_owner_information.mobile",
      "company_owner_information.email",
      "company_owner_information.aadhar_number",
      "company_owner_information.pan_card",
      "point_of_contact.name",
      "point_of_contact.designation",
      "point_of_contact.mobile",
      "point_of_contact.email",
      "point_of_contact.aadhar_number",
      "address.line1",
      "address.pinCode",
      "address.state",
      "address.district",
      "address.city",
      // "address.country",
      "operational_address.line1",
      "operational_address.pinCode",
      "operational_address.state",
      "operational_address.district",
      "operational_address.city",
      // "operational_address.country",
      "company_details.registration_number",
      "company_details.cin_image",
      "company_details.pan_card",
      "company_details.pan_image",
      "authorised.name",
      "authorised.phone",
      "authorised.designation",
      "authorised.email",
      "authorised.aadhar_number",
      "authorised.aadhar_certificate.front",
      "authorised.aadhar_certificate.back",
      "bank_details.bank_name",
      "bank_details.branch_name",
      "bank_details.ifsc_code",
      "bank_details.account_number",
      "bank_details.proof",
      // "slaId",
      // "schemes.scheme",
      // "schemes.cna",
      // "schemes.branch"
    ];

    const missingFields = requiredFields.filter((field) => {
      const keys = field.split(".");
      let value = data;
      for (let key of keys) {
        if (
          value[key] === undefined ||
          value[key] === null ||
          value[key] === ""
        ) {
          return true;
        }
        value = value[key];
      }
      return false;
    });

    if (missingFields.length > 0) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          message: `Missing required fields: ${missingFields.join(", ")}`,
          data: null,
        })
      );
    }

    // Create SLA document
    const sla = await SLAManagement.create(data);

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: sla,
        message: _response_message.created("SLA"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});
// module.exports.getSLAList = asyncErrorHandler(async (req, res) => {
//   const {
//     page = 1,
//     limit = 10,
//     skip = 0,
//     paginate = 1,
//     sortBy,
//     search = "",
//     isExport = 0,
//   } = req.query;

//   // Initialize matchQuery
//   let matchQuery = search
//     ? {
//         $or: [
//           { "basic_details.name": { $regex: search, $options: "i" } },
//           { "basic_details.email": { $regex: search, $options: "i" } },
//           { "basic_details.mobile": { $regex: search, $options: "i" } },
//         ],
//         deletedAt: null,
//       }
//     : { deletedAt: null };

//   let aggregationPipeline = [
//     { $match: matchQuery },
//     {
//       $project: {
//         _id: 1,
//         slaId: 1,
//         email: "$basic_details.email",
//         sla_name: "$basic_details.name",
//         associate_count: { $size: "$associatOrder_id" }, // Count of associated orders
//         address: {
//           $concat: [
//             "$address.line1",
//             ", ",
//             { $ifNull: ["$address.line2", ""] },
//             ", ",
//             "$address.city",
//             ", ",
//             "$address.district",
//             ", ",
//             "$address.state",
//             ", ",
//             "$address.pinCode",
//             ", ",
//             { $ifNull: ["$address.country", ""] },
//             ", ",
//           ],
//         },
//         status: 1,
//         poc: "$point_of_contact.name",
//         branch: "$schemes.branch",
//       },
//     },
//   ];
//   if (paginate == 1) {
//     aggregationPipeline.push(
//       { $sort: { [sortBy || "createdAt"]: -1, _id: -1 } }, // Secondary sort by _id for stability
//       { $skip: parseInt(skip) },
//       { $limit: parseInt(limit) }
//     );
//   } else {
//     aggregationPipeline.push({
//       $sort: { [sortBy || "createdAt"]: -1, _id: -1 },
//     });
//   }
//   const rows = await SLAManagement.aggregate(aggregationPipeline);
//   const countPipeline = [{ $match: matchQuery }, { $count: "total" }];
//   const countResult = await SLAManagement.aggregate(countPipeline);
//   const count = countResult[0]?.total || 0;
//   const records = { rows, count };
//   if (paginate == 1) {
//     records.page = parseInt(page);
//     records.limit = parseInt(limit);
//     records.pages = limit != 0 ? Math.ceil(count / limit) : 0;
//   }
//   if (isExport == 1) {
//     const record = rows.map((item) => {
//       return {
//         "Scheme Id": item?.schemeId || "NA",
//         "scheme Name": item?.schemeName || "NA",
//         "Scheme Commodity": item?.Schemecommodity || "NA",
//         season: item?.season || "NA",
//         period: item?.period || "NA",
//         procurement: item?.procurement || "NA",
//       };
//     });
//     if (record.length > 0) {
//       dumpJSONToExcel(req, res, {
//         data: record,
//         fileName: `Scheme-record.xlsx`,
//         worksheetName: `Scheme-record`,
//       });
//     } else {
//       return res
//         .status(200)
//         .send(
//           new serviceResponse({
//             status: 200,
//             data: records,
//             message: _response_message.notFound("Scheme"),
//           })
//         );
//     }
//   } else {
//     return res
//       .status(200)
//       .send(
//         new serviceResponse({
//           status: 200,
//           data: records,
//           message: _response_message.found("Scheme"),
//         })
//       );
//   }
// });

module.exports.getSLAList = asyncErrorHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    skip = 0,
    paginate = 1,
    sortBy,
    search = "",
    isExport = 0,
    bo_id,
    ho_id,
    scheme_id,
    state,
  } = req.query;

  if (bo_id || ho_id || scheme_id) {
    let matchQuery = { sla_id: { $exists: true }, deletedAt: null };

    if (bo_id) matchQuery.bo_id = new ObjectId(bo_id);
    if (ho_id) matchQuery.ho_id = new ObjectId(ho_id);
    if (scheme_id) matchQuery.scheme_id = new ObjectId(scheme_id);
    let aggregationPipeline = [
      { $match: matchQuery }, // Match `bo_id`, `ho_id`, `scheme_id`
      { $addFields: { sla_id: { $toObjectId: "$sla_id" } } },
      {
        $lookup: {
          from: "slas",
          localField: "sla_id",
          foreignField: "_id",
          as: "sla_details",
        },
      },
      { $unwind: { path: "$sla_details", preserveNullAndEmptyArrays: true } },
    ];
    if (state) {
      aggregationPipeline.push({
        $match: {
          "sla_details.address.state": { $regex: state, $options: "i" },
        },
      });
    }

    aggregationPipeline.push({
      $group: {
        _id: "$sla_id",
        bo_id: { $first: "$bo_id" },
        ho_id: { $first: "$ho_id" },
        scheme_id: { $first: "$scheme_id" },
        assignQty: { $first: "$assignQty" },
        status: { $first: "$status" },
        slaId: { $first: "$sla_details.slaId" },
        associate_count: { $first: { $size: "$sla_details.associatOrder_id" } },
        sla_name: { $first: "$sla_details.basic_details.name" },
        sla_email: { $first: "$sla_details.basic_details.email" },
        sla_mobile: { $first: "$sla_details.basic_details.mobile" },
        address: {
          $first: {
            $concat: [
              "$sla_details.address.line1",
              ", ",
              { $ifNull: ["$sla_details.address.line2", ""] },
              ", ",
              "$sla_details.address.city",
              ", ",
              "$sla_details.address.district",
              ", ",
              "$sla_details.address.state",
              ", ",
              "$sla_details.address.pinCode",
              ", ",
              { $ifNull: ["$sla_details.address.country", ""] },
            ],
          },
        },
        poc: { $first: "$sla_details.point_of_contact.name" },
        branch: { $first: "$sla_details.schemes.branch" },
      },
    });

    aggregationPipeline.push({
      $sort: { [sortBy || "createdAt"]: -1, _id: -1 },
    });

    if (paginate == 1)
      aggregationPipeline.push(
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) }
      );

    const rows = await SchemeAssign.aggregate(aggregationPipeline);
    const countResult = await SchemeAssign.aggregate([
      { $match: matchQuery },
      { $count: "total" },
    ]);
    const count = countResult[0]?.total || 0;

    const records = { rows, count };
    if (paginate == 1) {
      records.page = parseInt(page);
      records.limit = parseInt(limit);
      records.pages = limit != 0 ? Math.ceil(count / limit) : 0;
    }

    if (isExport == 1) {
      return dumpJSONToExcel(req, res, {
        data: rows.map((item) => ({
          "Scheme Id": item?.schemeId || "NA",
          "Scheme Name": item?.schemeName || "NA",
          "Scheme Commodity": item?.Schemecommodity || "NA",
          season: item?.season || "NA",
          period: item?.period || "NA",
          procurement: item?.procurement || "NA",
        })),
        fileName: "Scheme-Assignments.xlsx",
        worksheetName: "Scheme Assignments",
      });
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("Scheme Assignments"),
      })
    );
  }

  let matchQuery = search
    ? {
        $or: [
          { "basic_details.name": { $regex: search, $options: "i" } },
          { "basic_details.email": { $regex: search, $options: "i" } },
          { "basic_details.mobile": { $regex: search, $options: "i" } },
        ],
        deletedAt: null,
      }
    : { deletedAt: null };

  if (state) matchQuery["address.state"] = { $regex: state, $options: "i" };

  let aggregationPipeline = [
    { $match: matchQuery },
    {
      $project: {
        _id: 1,
        slaId: 1,
        email: "$basic_details.email",
        sla_name: "$basic_details.name",
        associate_count: { $size: "$associatOrder_id" },
        address: {
          $concat: [
            "$address.line1",
            ", ",
            { $ifNull: ["$address.line2", ""] },
            ", ",
            "$address.city",
            ", ",
            "$address.district",
            ", ",
            "$address.state",
            ", ",
            "$address.pinCode",
            ", ",
            { $ifNull: ["$address.country", ""] },
          ],
        },
        status: 1,
        poc: "$point_of_contact.name",
        branch: "$schemes.branch",
      },
    },
  ];

  if (paginate == 1)
    aggregationPipeline.push(
      { $sort: { [sortBy || "createdAt"]: -1, _id: -1 } },
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) }
    );

  const rows = await SLAManagement.aggregate(aggregationPipeline);
  const countResult = await SLAManagement.aggregate([
    { $match: matchQuery },
    { $count: "total" },
  ]);
  const count = countResult[0]?.total || 0;

  return res.status(200).send(
    new serviceResponse({
      status: 200,
      data: {
        rows,
        count,
        page,
        limit,
        pages: limit != 0 ? Math.ceil(count / limit) : 0,
      },
      message: _response_message.found("Scheme"),
    })
  );
});

module.exports.deleteSLA = asyncErrorHandler(async (req, res) => {
  try {
    const { slaId } = req.params; // Get SLA ID from URL params

    if (!slaId) {
      return res.status(400).json(
        new serviceResponse({
          status: 400,
          message: "SLA ID is required",
        })
      );
    }

    // Find and delete SLA by slaId or _id
    const deletedSLA = await SLAManagement.findOneAndDelete({
      $or: [{ slaId }, { _id: slaId }],
    });

    if (!deletedSLA) {
      return res.status(404).json(
        new serviceResponse({
          status: 404,
          message: "SLA record not found",
        })
      );
    }

    return res.status(200).json(
      new serviceResponse({
        status: 200,
        message: "SLA record deleted successfully",
      })
    );
  } catch (error) {
    console.error("Error deleting SLA:", error);
    return res.status(500).json(
      new serviceResponse({
        status: 500,
        error: "Internal Server Error",
      })
    );
  }
});

module.exports.updateSLA = asyncErrorHandler(async (req, res) => {
  try {
    const { slaId } = req.params;
    const updateData = req.body;

    if (!slaId) {
      return res.status(400).json(
        new serviceResponse({
          status: 400,
          message: "SLA ID is required",
        })
      );
    }

    // Find and update SLA
    const updatedSLA = await SLAManagement.findOneAndUpdate(
      { $or: [{ slaId }, { _id: slaId }] },
      { $set: updateData },
      { new: true, runValidators: true } // Return updated doc
    );

    if (!updatedSLA) {
      return res.status(404).json(
        new serviceResponse({
          status: 404,
          message: "SLA record not found",
        })
      );
    }

    return res.status(200).json(
      new serviceResponse({
        status: 200,
        message: "SLA record updated successfully",
        data: updatedSLA,
      })
    );
  } catch (error) {
    console.error("Error updating SLA:", error);
    return res.status(500).json(
      new serviceResponse({
        status: 500,
        error: "Internal Server Error",
      })
    );
  }
});

module.exports.getSLAById = asyncErrorHandler(async (req, res) => {
  try {
    const { slaId } = req.params; // Get SLA ID from URL params

    if (!slaId) {
      return res.status(400).json(
        new serviceResponse({
          status: 400,
          message: "SLA ID is required",
        })
      );
    }

    // Find SLA with selected fields
    const sla = await SLAManagement.findById(slaId);
    // const sla = await SLAManagement.findOne(
    //   { $or: [{ slaId }, { _id: slaId }] },
    //   {
    //     _id: 1,
    //     slaId: 1,
    //     "basic_details.name": 1,
    //     associatOrder_id: 1,
    //     address: 1,
    //     status: 1,
    //   }
    // );

    if (!sla) {
      return res.status(404).json(
        new serviceResponse({
          status: 404,
          message: "SLA record not found",
        })
      );
    }

    return res.status(200).json(
      new serviceResponse({
        status: 200,
        message: "SLA record retrieved successfully",
        data: sla,
      })
    );
  } catch (error) {
    console.error("Error fetching SLA:", error);
    return res.status(500).json(
      new serviceResponse({
        status: 500,
        error: "Internal Server Error",
      })
    );
  }
});

module.exports.updateSLAStatus = asyncErrorHandler(async (req, res) => {
  try {
    const { slaId } = req.params; // Get SLA ID from URL params
    const { status } = req.body; // New status (true/false)

    if (!slaId) {
      return res.status(400).json(
        new serviceResponse({
          status: 400,
          message: "SLA ID is required",
        })
      );
    }

    if (typeof status !== "boolean") {
      return res.status(400).json(
        new serviceResponse({
          status: 400,
          message: "Status must be true or false",
        })
      );
    }

    // Find and update SLA status
    const updatedSLA = await SLAManagement.findOneAndUpdate(
      { $or: [{ slaId }, { _id: slaId }] },
      { $set: { status: status } },
      { new: true }
    );

    if (!updatedSLA) {
      return res.status(404).json(
        new serviceResponse({
          status: 404,
          message: "SLA record not found",
        })
      );
    }

    return res.status(200).json(
      new serviceResponse({
        status: 200,
        message: `SLA status updated to ${status ? "Active" : "Inactive"}`,
        data: { slaId: updatedSLA.slaId, status: updatedSLA.active },
      })
    );
  } catch (error) {
    console.error("Error updating SLA status:", error);
    return res.status(500).json(
      new serviceResponse({
        status: 500,
        error: "Internal Server Error",
      })
    );
  }
});

module.exports.addSchemeToSLA = asyncErrorHandler(async (req, res) => {
  try {
    const { slaId } = req.params;
    const { scheme, cna, branch } = req.body;

    // Validate input
    if (!scheme || !cna || !branch) {
      return res.status(400).json(
        new serviceResponse({
          status: 400,
          message: "Missing required fields: scheme, cna, branch",
        })
      );
    }

    // Find SLA and update with new scheme
    const updatedSLA = await SLAManagement.findOneAndUpdate(
      { $or: [{ slaId }, { _id: slaId }] },
      { $push: { schemes: { scheme, cna, branch } } },
      { new: true }
    )
      .populate("schemes.scheme", "name")
      .populate("schemes.cna", "name")
      .populate("schemes.branch", "name");

    if (!updatedSLA) {
      return res.status(404).json({
        status: 404,
        message: "SLA not found",
      });
    }

    return res.status(200).json(
      new serviceResponse({
        status: 200,
        message: "Scheme added successfully",
        data: updatedSLA,
      })
    );
  } catch (error) {
    console.error("Error adding scheme to SLA:", error);
    return res.status(500).json(
      new serviceResponse({
        status: 500,
        error: "Internal Server Error",
      })
    );
  }
});

module.exports.schemeAssign = asyncErrorHandler(async (req, res) => {
  try {
    const { schemeData, cna_id, bo_id, slaId, sla_id } = req.body;

    // Validate input
    if (!bo_id || !Array.isArray(schemeData) || schemeData.length === 0) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          message:
            "Invalid request. 'bo_id' and 'schemeData' must be provided.",
        })
      );
    }

    // Prepare data for bulk insert
    const recordsToInsert = schemeData.map(({ _id, qty }) => ({
      bo_id,
      ho_id: cna_id,
      sla_id: sla_id,
      scheme_id: _id, // Assuming _id refers to scheme_id
      assignQty: qty,
    }));

    // Use Mongoose's insertMany to insert multiple documents
    const records = await SchemeAssign.insertMany(recordsToInsert);

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.created("Scheme Assign"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.getAssignedScheme = async (req, res) => {
  const {
    slaId,
    page = 1,
    limit = 10,
    skip = 0,
    paginate = 1,
    sortBy,
    search = "",
    isExport = 0,
  } = req.query;

  // Initialize matchQuery
  let matchQuery = { sla_id: new mongoose.Types.ObjectId(slaId) };

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(slaId)) {
    return res.status(400).json({ message: "Invalid SLA ID" });
  }

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
        from: "schemes", // Adjust this to your actual collection name for branches
        localField: "scheme_id",
        foreignField: "_id",
        as: "schemeDetails",
      },
    },
    { $unwind: { path: "$schemeDetails", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "headoffices", // Adjust this to your actual collection name for branches
        localField: "ho_id",
        foreignField: "_id",
        as: "headOfficeDetails",
      },
    },
    {
      $unwind: { path: "$headOfficeDetails", preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        _id: 1,
        schemeId: "$schemeDetails.schemeId",
        // schemeName: '$schemeDetails.schemeName',
        schemeName: {
          $concat: [
            "$schemeDetails.schemeName",
            "",
            { $ifNull: ["$schemeDetails.commodityDetails.name", ""] },
            "",
            { $ifNull: ["$schemeDetails.season", ""] },
            "",
            { $ifNull: ["$schemeDetails.period", ""] },
          ],
        },
        branchName: "$branchDetails.branchName",
        headOfficeName: "$headOfficeDetails.company_details.name",
        createdOn: "$createdAt",
      },
    },
  ];
  if (paginate == 1) {
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

  const rows = await SchemeAssign.aggregate(aggregationPipeline);
  const countPipeline = [{ $match: matchQuery }, { $count: "total" }];
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
        schemeName: item?.schemeName || "NA",
        branchName: item?.branchName || "NA",
      };
    });
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
};
module.exports.getUniqueStates = async (req, res) => {
  try {
    const states = await SLAManagement.aggregate([
      { $group: { _id: "$address.state" } }, // Group by state
      { $project: { _id: 0, name: "$_id" } }, // Format output
      { $sort: { name: 1 } }, // Sort alphabetically
    ]);

    return res.status(200).json({
      status: 200,
      states,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: 500, message: "Internal Server Error" });
  }
};

module.exports.getUniqueHOBOScheme = async (req, res) => {
  try {
    const data = await SchemeAssign.aggregate([
      {
        $match: {
          sla_id: { $exists: true, $ne: null }, // Ensure sla_id exists
          deletedAt: null, // Ensure deletedAt is null
        },
      },
      {
        $lookup: {
          from: "branches", // Reference Branch collection
          localField: "bo_id",
          foreignField: "_id",
          as: "boDetails",
        },
      },
      {
        $lookup: {
          from: "headoffices", // Reference HeadOffice collection
          localField: "ho_id",
          foreignField: "_id",
          as: "hoDetails",
        },
      },
      {
        $lookup: {
          from: "schemes", // Reference Scheme collection
          localField: "scheme_id",
          foreignField: "_id",
          as: "schemeDetails",
        },
      },
      {
        $group: {
          _id: null,
          ho: {
            $addToSet: {
              id: "$ho_id",
              name: { $arrayElemAt: ["$hoDetails.point_of_contact.name", 0] },
            },
          },
          bo: {
            $addToSet: {
              name: { $arrayElemAt: ["$boDetails.branchName", 0] },
              id: "$bo_id",
            },
          },
          scheme: {
            $addToSet: {
              id: "$scheme_id",
              name: {
                $concat: [
                  {
                    $ifNull: [
                      { $arrayElemAt: ["$schemeDetails.schemeName", 0] },
                      "",
                    ],
                  },
                  "  ",

                  {
                    $ifNull: [
                      { $arrayElemAt: ["$schemeDetails.season", 0] },
                      "",
                    ],
                  },
                  "  ",
                  {
                    $ifNull: [
                      { $arrayElemAt: ["$schemeDetails.period", 0] },
                      "",
                    ],
                  },
                ],
              },
            },
          },

          //  name: {
          //  $arrayElemAt: ["$schemeDetails.schemeName", 0] } }
          //  },
        },
      },
      {
        $project: { _id: 0, ho: 1, bo: 1, scheme: 1 },
      },
    ]);

    return res.status(200).json({
      status: 200,
      data: data.length > 0 ? data[0] : { ho: [], bo: [], scheme: [] },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: 500, message: "Internal Server Error" });
  }
};
