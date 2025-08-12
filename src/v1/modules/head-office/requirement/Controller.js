const { _handleCatchErrors, dumpJSONToCSV, dumpJSONToExcel, handleDecimal } = require("@src/v1/utils/helpers");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const { sendResponse, serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {
  _response_message,
  _middleware,
  _auth_module,
} = require("@src/v1/utils/constants/messages");
const {
  RequestModel,
} = require("@src/v1/models/app/procurement/Request");
const {
  Batch,
} = require("@src/v1/models/app/procurement/Batch");
const Branches = require("@src/v1/models/app/branchManagement/Branches");
const { getFilter } = require("@src/v1/utils/helpers/customFilter");
const { received_qc_status } = require("@src/v1/utils/constants");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const {wareHouseDetails} = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const {ProcurementCenter} = require("@src/v1/models/app/procurement/ProcurementCenter");
const {User} = require("@src/v1/models/app/auth/User");
const { default: mongoose } = require("mongoose");
const { convertToObjecId } = require("@src/v1/utils/helpers/api.helper");

//widget list
/*
module.exports.requireMentList = asyncErrorHandler(async (req, res) => {
  try {

    const { page, limit, skip = 0, paginate, sortBy, search = "", isExport = 0 } = req.query;

    const filter = await getFilter(req, ["status", "reqNo", "branchName"]);
    let query = filter;
    const records = { count: 0 };

    if (req.user.user_type === 2 || req.user.user_type === '2') {
      query = { ...query, head_office_id: req?.user?.portalId?._id }
    }

    records.rows =
      (
        await RequestModel.find(query)
          .populate({ path: 'branch_id', select: 'branchName'})
          .skip(skip)
          .limit(parseInt(limit))
          .sort(sortBy)) ?? [];
    if (req.query.search) {

      const pattern = new RegExp(req.query.search, 'i');
      records.rows = records.rows.filter(item => {
        if (item.branch_id) {
          return true;
        } else if (pattern.test(item.reqNo) || pattern.test(item.status)) {
          return true;
        } else {
          return false;
        }

      });
      records.count = records.rows.length;
    } else {
      records.count = await RequestModel.countDocuments(query);
    }

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / 10) : 0;
    }

    if (isExport == 1) {

      const record = records.rows.map((item) => {
        return {
          "Order ID": item?.reqNo || 'NA',
          "Branch Office": item?.branch_id || 'NA',
          "Commodity": item?.product.name || 'NA',
          "MSP": item?.quotedPrice || 'NA',
          "EST Delivery": item?.qtyPurchased || 'NA',
          "Completion": item?.deliveryDate || 'NA',
          "Created Date": item?.createdAt || 'NA'
        }
      })

      if (record.length > 0) {

        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Requirement-record.xlsx`,
          worksheetName: `Requirement-record`
        });
      } else {
        return sendResponse({
          res,
          status: 400,
          data: records,
          message: _response_message.notFound("Requirement"),
        })

      }
    } else {
      return sendResponse({
        res,
        status: 200,
        data: records,
        message: _response_message.found("Requirement"),
      })

    }

  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
});
*/

/*
module.exports.requireMentList = asyncErrorHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      skip = 0,
      paginate = 1,
      sortBy = { createdAt: -1 },
      search = "",
      state = "",
      commodity = "",
      isExport = 0,
    } = req.query;

    // Base filter
    // const filter = await getFilter(req, ["status", "reqNo"]);
    let query = {};
    if (req.user.user_type === 2 || req.user.user_type === "2") {
      query = { ...query, head_office_id: req?.user?.portalId?._id };
    }
    query = {
      ...query, ...(state || search || commodity ? {
        $and: [
          ...(state
            ? [
              {
                "sellers.address.registered.state": {
                  $regex: state,
                  $options: "i",
                },
              },
            ]
            : []),
          ...(search
            ? [{
              $or: [
                {
                  "branchDetails.branchName": {
                    $regex: search,
                    $options: "i",
                  },
                },
                {
                  "reqNo": {
                    $regex: search,
                    $options: "i",
                  },
                },
              ]

            },
            ]
            : []),
          ...(commodity
            ? [{
              "product.name": {
                $regex: commodity,
                $options: "i",
              },
            },
            ]
            : []),
        ],
      } : {})
    }

    // Aggregate query to filter by state and populate branch details
    const aggregateQuery = [
      {
        $lookup: {
          from: "associateoffers",
          localField: "associatOrder_id",
          foreignField: "_id",
          as: "associateOrders",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "associateOrders.seller_id",
          foreignField: "_id",
          as: "sellers",
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "branch_id",
          foreignField: "_id",
          as: "branchDetails",
        },
      },
      {
        $match: query,

      },
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) },
      { $sort: sortBy },
      {
        $project: {
          reqNo: 1,
          branch_id: 1,
          branchName: { $arrayElemAt: ["$branchDetails.branchName", 0] },
          "product.name": 1,
          quotedPrice: 1,
          quoteExpiry: 1,
          fulfilledQty: 1,
          deliveryDate: 1,
          createdAt: 1,
          sellers: 1,
        },
      },
    ];

    const records = await RequestModel.aggregate(aggregateQuery);

    // Count query with state and search filters
    const countQuery = [
      {
        $lookup: {
          from: "associateoffers",
          localField: "associatOrder_id",
          foreignField: "_id",
          as: "associateOrders",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "associateOrders.seller_id",
          foreignField: "_id",
          as: "sellers",
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "branch_id",
          foreignField: "_id",
          as: "branchDetails",
        },
      },
      {
        $match: query,
      },
      { $count: "totalCount" },
    ];

    const countResult = await RequestModel.aggregate(countQuery);
    const totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;

    // Handle export request
    if (isExport == 1) {
      const record = records.map((item) => ({
        "Order ID": item?.reqNo || "NA",
        "Branch Office": item?.branchName || "NA",
        "Commodity": item?.product?.name || "NA",
        "MSP": item?.quotedPrice || "NA",
        "EST Delivery": item?.fulfilledQty || "NA",
        "Completion": item?.deliveryDate || "NA",
        "Created Date": item?.createdAt || "NA",
      }));

      if (record.length > 0) {
        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Requirement-record.xlsx`,
          worksheetName: `Requirement-record`,
        });
      } else {
        return sendResponse({
          res,
          status: 400,
          data: records,
          message: _response_message.notFound("Requirement"),
        });
      }
    } else {
      // Send paginated data
      return sendResponse({
        res,
        status: 200,
        data: {
          rows: records,
          count: totalCount,
          page: paginate == 1 ? parseInt(page) : undefined,
          limit: paginate == 1 ? parseInt(limit) : undefined,
          pages: paginate == 1 ? Math.ceil(totalCount / limit) : undefined,
        },
        message: _response_message.found("Requirement"),
      });
    }
  } catch (error) {
    console.error("Error:", error);
    _handleCatchErrors(error, res);
  }
});
*/

module.exports.requireMentList = asyncErrorHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      skip = 0,
      paginate = 1,
      sortBy = { createdAt: -1 },
      search = "",
      state = "",
      district = "",
      commodity = "",
      schemeName = "",
      schemeYear = "",
      isExport = 0,
    } = req.query;

    const parsedSkip = parseInt(skip) || 0;
    const parsedLimit = parseInt(limit) || 10;
    const parsedPage = parseInt(page) || 1;

    // Base query
    let query = {};
    // if (req.user.user_type === 2 || req.user.user_type === "2") {
    //   query.head_office_id = req?.user?.portalId?._id;
    // }
    if (req.user.user_type === 2 || req.user.user_type === "2") {
      const portalId = req.user.portalId;

      if (portalId && typeof portalId === "object" && portalId._id) {
        query.head_office_id = portalId._id;
      } else if (typeof portalId === "string" && portalId.length > 0) {
        query.head_office_id = portalId;
      } else {
        console.warn("portalId is missing or invalid — head_office_id will not be added to query");
        
      }
    }

    if (state || district || search || commodity || schemeName || schemeYear) {
      query.$and = [
        ...(state ? [{ "sellers.address.registered.state_id": convertToObjecId(state) }] : []),
        ...(district ? [{ "sellers.address.registered.district_id": convertToObjecId(district) }] : []),
        ...(search
          ? [{
              $or: [
                { "branchDetails.branchName": { $regex: search, $options: "i" } },
                { reqNo: { $regex: search, $options: "i" } },
              ],
            }]
          : []),
        ...(commodity ? [{ "product.name": { $regex: commodity, $options: "i" } }] : []),
        ...(schemeName ? [{ "schemeDetails.schemeName": { $regex: schemeName, $options: "i" } }] : []),
        ...(schemeYear ? [{ "schemeDetails.period": { $regex: schemeYear, $options: "i" } }] : []),
      ];
    }

   // console.log("Filter Query:", JSON.stringify(query, null, 2));

    // Aggregate query to filter and populate details
    const aggregateQuery = [
      {
        $lookup: {
          from: "associateoffers",
          localField: "associatOrder_id",
          foreignField: "_id",
          as: "associateOrders",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "associateOrders.seller_id",
          foreignField: "_id",
          as: "sellers",
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "branch_id",
          foreignField: "_id",
          as: "branchDetails",
        },
      },
      {
        $lookup: {
          from: "slas",
          localField: "sla_id",
          foreignField: "_id",
          as: "slaDetails",
        },
      },
      { $unwind: { path: "$slaDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "schemes",
          localField: "product.schemeId",
          foreignField: "_id",
          as: "schemeDetails",
        },
      },
      { $unwind: { path: "$schemeDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'commodities',
          localField: 'schemeDetails.commodity_id',
          foreignField: '_id',
          as: 'commodityDetails',
        },
      },
      { $unwind: { path: '$commodityDetails', preserveNullAndEmptyArrays: true } },
      { $match: query }, // Now filtering happens after lookups
      { $sort: sortBy },
      // { $skip: parsedSkip },
      // { $limit: parsedLimit },
      ...(isExport == 0 || isExport == "0"
        ? [{ $skip: parsedSkip }, { $limit: parsedLimit }]
        : []),
      {
        $project: {
          reqNo: 1,
          branch_id: 1,
          branchName: { $arrayElemAt: ["$branchDetails.branchName", 0] },
          "product.name": 1,
          quotedPrice: 1,
          quoteExpiry: 1,
          fulfilledQty: 1,
          deliveryDate: 1,
          createdAt: 1,
          sellers: 1,
          slaName: "$slaDetails.basic_details.name",
          schemeSeason:"$schemeDetails.season",
          schemeYear:"$schemeDetails.period",
          commodityName: "$commodityDetails.name",
          schemeName: {
            $concat: [
              "$schemeDetails.schemeName", " ",
              { $ifNull: ["$commodityDetails.name", ""] }, " ",
              { $ifNull: ["$schemeDetails.season", ""] }, " ",
              { $ifNull: ["$schemeDetails.period", ""] },
            ],
          },
        },
      },
    ];
    // console.log("aggregateQuery",aggregateQuery);
    const records = await RequestModel.aggregate(aggregateQuery);
   // console.log("Records fetched:", records.length);

    // Count query with state and search filters
    const countQuery = [
      {
        $lookup: {
          from: "associateoffers",
          localField: "associatOrder_id",
          foreignField: "_id",
          as: "associateOrders",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "associateOrders.seller_id",
          foreignField: "_id",
          as: "sellers",
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "branch_id",
          foreignField: "_id",
          as: "branchDetails",
        },
      },
      {
        $lookup: {
          from: "slas",
          localField: "sla_id",
          foreignField: "_id",
          as: "slaDetails",
        },
      },
      { $unwind: { path: "$slaDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "schemes",
          localField: "product.schemeId",
          foreignField: "_id",
          as: "schemeDetails",
        },
      },
      { $unwind: { path: "$schemeDetails", preserveNullAndEmptyArrays: true } },
      { $match: query },
      { $count: "totalCount" },
    ];

    const countResult = await RequestModel.aggregate(countQuery);
    const totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;

   // console.log("Total Count:", totalCount);

    // Handle export request
    if (isExport == 1) {
      const record = records.map((item) => ({
        "ORDER ID": item?.reqNo || "NA",
        "BRANCH OFFFICE NAME": item?.branchName || "NA",
        "SLA": item?.slaName || "NA",
        "SCHEME": item?.schemeName || "NA",
        "Commodity": item?.product?.name || "NA",
        "QUANTITY PURCHASED": item?.fulfilledQty ,
        "MSP": item?.quotedPrice ,
        "EST Delivery": item?.deliveryDate || "NA",
        "Completion": item?.quoteExpiry || "NA",
        "Created Date": item?.createdAt || "NA",
      }));

      if (record.length > 0) {
        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Requirement-record.xlsx`,
          worksheetName: `Requirement-record`,
        });
      } else {
        return sendResponse({
          res,
          status: 400,
          data: [],
          message: _response_message.notFound("Requirement"),
        });
      }
    } else {
      // Send paginated data
      return sendResponse({
        res,
        status: 200,
        data: {
          rows: records,
          count: totalCount,
          page: paginate == 1 ? parsedPage : undefined,
          limit: paginate == 1 ? parsedLimit : undefined,
          pages: paginate == 1 ? Math.ceil(totalCount / parsedLimit) : undefined,
        },
        message: _response_message.found("Requirement"),
      });
    }
  } catch (error) {
    console.error("Error:", error);
    _handleCatchErrors(error, res);
  }
});


// module.exports.requirementById = asyncErrorHandler(async (req, res) => {
//   try {
//     const { requirementId } = req.params;
//     const { page, limit, skip = 0, paginate, sortBy,isExport = 0, } = req.query;
//     const records = { count: 0 };

//     const query = { req_id: requirementId };

//     // // Get total count FIRST
//      records.count = await Batch.countDocuments(query);

//     records.rows = await Batch.find({ req_id: requirementId })
//       .select('batchId qty delivered status')
//       .populate({
//         path: 'associateOffer_id',
//         populate: {
//           path: 'seller_id',
//           select: 'basic_details.associate_details.associate_name basic_details.associate_details.organization_name'
//         }
//       })
//       .populate({
//         path: 'procurementCenter_id',
//         select: 'center_name location_url'
//       })
//       .skip((parseInt(page) - 1) * parseInt(limit))
//       .limit(parseInt(limit))
//       .sort(sortBy) ?? [];

//     records.rows = records.rows.map(item => ({
//       _id: item._id,
//       batchId: item.batchId,
//       associateName: item?.associateOffer_id?.seller_id?.basic_details?.associate_details?.associate_name,
//       organization_name: item?.associateOffer_id?.seller_id?.basic_details?.associate_details?.organization_name,
//       procurementCenterName: item?.procurementCenter_id?.center_name,
//       quantity: item.qty,
//       deliveredOn: item.delivered.delivered_at,
//       procurementLocationUrl: item?.procurementCenter_id?.location_url,
//       status: item.status
//     }));

//     // records.count = records.rows.length;

//     if (paginate == 1) {
//       records.page = page;
//       records.limit = limit;
//       records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
//     }

//        // Handle export request
//        if (isExport == 1) {
//         const record = records.rows.map((item) => ({
//           "BATCH ID": item?.batchId || "NA",
//           "ASSOCIATE NAME": item?.associateName || "NA",
//           "PROCUREMENT CENTER": item?.procurementCenterName || "NA",
//           "QUANTITY PURCHASED": item?.quantity || "NA",
//           "DELIVERED ON": item?.deliveredOn || "NA",
//           "BATCH STATUS": item?.status || "NA",
//           "QC STATUS": item?.qc_status || "NA",
//         }));
  
//         if (record.length > 0) {
//           dumpJSONToExcel(req, res, {
//             data: record,
//             fileName: `Batch-List-Record.xlsx`,
//             worksheetName: `Batch-List-Record`,
//           });
//         } else {
//           return sendResponse({
//             res,
//             status: 400,
//             data: [],
//             message: _response_message.notFound("Requirement"),
//           });
//         }
//       } else {
//         // Send paginated data
//         return sendResponse({
//           res,
//           status: 200,
//           data: records,
//           message: _response_message.found("requirement"),
//         });
//       }

//     // return sendResponse({
//     //   res,
//     //   status: 200,
//     //   data: records,
//     //   message: _response_message.found("requirement"),
//     // })
//   } catch (error) {
//     console.log("error", error);
//     _handleCatchErrors(error, res);
//   }
// });

module.exports.requirementById = asyncErrorHandler(async (req, res) => {
  try {
    const { requirementId } = req.params;
    const {
      page = 1,
      limit = 10,
      skip = 0,
      paginate = 1,
      sortBy = { createdAt: -1 },
      search = "",
      isExport = 0,
    } = req.query;

    const query = { req_id: requirementId };

    let batches = await Batch.find(query)
      .select('batchId qty delivered status')
      .populate({
        path: 'associateOffer_id',
        populate: {
          path: 'seller_id',
          select: 'basic_details.associate_details',
        }
      })
      .populate({
        path: 'procurementCenter_id',
        select: 'center_name location_url'
      })
      .sort(sortBy);

    // Search filtering
    let filteredRows = batches;
    if (search) {
      const regex = new RegExp(search, 'i');
      filteredRows = batches.filter(item => {
        const associateName = item?.associateOffer_id?.seller_id?.basic_details?.associate_details?.associate_name || "";
        const orgName = item?.associateOffer_id?.seller_id?.basic_details?.associate_details?.organization_name || "";
        const batchId = item?.batchId || "";
        return (
          regex.test(associateName) ||
          regex.test(orgName) ||
          regex.test(batchId)
        );
      });
    }

    const total = filteredRows.length;

    // Pagination
    const paginatedRows = paginate == 1
      ? filteredRows.slice((page - 1) * limit, page * limit)
      : filteredRows;

    const finalRows = paginatedRows.map(item => ({
      _id: item._id,
      batchId: item.batchId,
      associateName: item?.associateOffer_id?.seller_id?.basic_details?.associate_details?.associate_name,
      organization_name: item?.associateOffer_id?.seller_id?.basic_details?.associate_details?.organization_name,
      procurementCenterName: item?.procurementCenter_id?.center_name,
      quantity: item.qty,
      deliveredOn: item.delivered?.delivered_at,
      procurementLocationUrl: item?.procurementCenter_id?.location_url,
      status: item.status
    }));

    // Export if requested
    if (isExport == 1) {
      const record = finalRows.map((item) => ({
        "BATCH ID": item?.batchId || "NA",
        "ASSOCIATE NAME": item?.associateName || "NA",
        "ORGANIZATION NAME": item?.organization_name || "NA",
        "PROCUREMENT CENTER": item?.procurementCenterName || "NA",
        "QUANTITY PURCHASED": item?.quantity || "NA",
        "DELIVERED ON": item?.deliveredOn || "NA",
        "BATCH STATUS": item?.status || "NA"
      }));

      if (record.length > 0) {
        return dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Batch-List-Record.xlsx`,
          worksheetName: `Batch-List-Record`,
        });
      } else {
        return sendResponse({
          res,
          status: 400,
          data: [],
          message: _response_message.notFound("Requirement"),
        });
      }
    }

    // Send paginated response
    return sendResponse({
      res,
      status: 200,
      data: {
        count: total,
        rows: finalRows,
        page: Number(page),
        limit: Number(limit),
        pages: paginate == 1 ? Math.ceil(total / limit) : 1,
      },
      message: _response_message.found("requirement"),
    });

  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
});


module.exports.batchListByRequestId = asyncErrorHandler(async (req, res) => {
  try {
    const { page, limit, skip = 0, paginate, sortBy, search = "", isExport = 0 } = req.query;
    const { id } = req.params;
    const filter = await getFilter(req, ["status", "reqNo", "branchName"]);
    const query = filter;
    const records = { count: 0 };
    console.log("query--> ", query)
    records.rows =
      (await Batch.find({ req_id: id })
        .select(" ")
        .populate({ path: "req_id", select: "address" })
        .populate({ path: "seller_id", select: "basic_details.associate_details" })
        .populate({ path: 'procurementCenter_id', select: '', match: query })
        .populate({ path: 'farmerOrderIds.farmerOrder_id', select: 'order_no' })
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sortBy)) ?? [];
    if (req.query.search) {

      const pattern = new RegExp(search, 'i');
      records.rows = records.rows.filter(item => {
        if (item.branch_id) {
          return true;
        } else if (pattern.test(item.reqNo) || pattern.test(item.status)) {
          return true;
        } else {
          return false;
        }

      });
      records.count = records.rows.length;
    } else {
      records.count = await Batch.countDocuments({ req_id: id });
    }

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / 10) : 0;
    }

    records.rows = records.rows.map(item => {
      let batch = {}
      batch['batchId'] = item.batchId,
      batch['associate_name'] = item?.seller_id?.basic_details?.associate_details?.associate_name ?? null
      batch['organization_name'] = item?.seller_id?.basic_details?.associate_details?.organization_name ?? null
      batch['procurement_center'] = item?.procurementCenter_id?.center_name ?? null
      batch['quantity_purchased'] = item?.qty ?? null
      batch['procured_on'] = item?.dispatched_at ?? null
      batch['delivery_location'] = item?.req_id?.address?.deliveryLocation ?? null
      batch['address'] = item.req_id?.address ?? null
      batch['status'] = item.status
      batch['lot_ids'] = (item?.farmerOrderIds.reduce((acc, item) => [...acc, item.farmerOrder_id.order_no], [])) ?? []
      batch['_id'] = item._id
      batch['total_amount'] = item?.total_amount ?? "2 CR",
        batch['delivered_at'] = item?.delivered?.delivered_at

      return batch
    })

    // return sendResponse({
    //   res,
    //   status: 200,
    //   data: records,
    //   message: _response_message.found("order"),
    // })


    if (isExport == 1) {

      const record = records.rows.map((item) => {
        return {
          "Batch ID": item?.batchId || 'NA',
          "Associate Name": item?.associate_name || 'NA',
          "Procure Center": item?.procurement_center || 'NA',
          "quantity purchased": item?.quantity_purchased || 'NA',
          "Delivered on": item?.delivered_at || 'NA',
          "delivery location": item?.delivery_location || 'NA',
          "Batch status": item.status || 'NA'
        }
      })

      if (record.length > 0) {

        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Batch-record.xlsx`,
          worksheetName: `Batch-record`
        });
      } else {
        return sendResponse({
          res,
          status: 400,
          data: records,
          message: _response_message.notFound("Batch"),
        })

      }
    } else {
      return sendResponse({
        res,
        status: 200,
        data: records,
        message: _response_message.found("Batch"),
      })

    }

  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
});

module.exports.qcDetailsById = asyncErrorHandler(async (req, res) => {
  try {

    const { id } = req.params;
    const records = {};
    records.rows =
      (await Batch.findById(id)
        .select(" ")
        .populate({ path: 'req_id', select: '' })
        .populate({ path: 'warehousedetails_id', select: '' })
        .populate({ path: 'procurementCenter_id', select: '' })
         .populate({ path: 'seller_id', select: '' })
      )
         ?? []

         const farmerOrderIds = records.rows?.farmerOrderIds?.map(f => f.farmerOrder_id) || [];
         records.lot_details = await FarmerOrders.find({
           _id: { $in: farmerOrderIds },
           status: "Received"
         }).select(" ");  

    return sendResponse({
      res,
      status: 200,
      data: records,
      message: _response_message.found("QC detail")
    })

  } catch (error) {
    console.log("error==>", error);
    _handleCatchErrors(error, res)
  }
})

module.exports.auditTrail = asyncErrorHandler(async (req, res) => {

  const { id } = req.query;

  const record = await Batch.findOne({ _id: id });

  if (!record) {
    return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }))
  }

  const { dispatched, intransit, delivered, createdAt, payment_at, payement_approval_at } = record;

  const steps = [
    {
      name: "Batch Created",
      status: record ? "completed" : "pending",
      date: record ? createdAt : null,
    },
    {
      name: "Mark Dispatched",
      status: dispatched ? "completed" : "pending",
      date: dispatched.dispatched_at ? dispatched.dispatched_at : null,
    },
    {
      name: "In Transit",
      status: intransit ? "completed" : "pending",
      date: intransit.intransit_at ? intransit.intransit_at : null,
    },
    {
      name: "Delivery Date",
      status: delivered ? "completed" : "pending",
      date: delivered.delivered_at ? delivered.delivered_at : null,
    },
    {
      name: "Final QC Check",
      status: dispatched.qc_report.received_qc_status == received_qc_status.accepted ? "completed" : dispatched.qc_report.received_qc_status == received_qc_status.rejected ? "rejected" : "pending",
      date: dispatched.qc_report.received.length != 0 && dispatched.qc_report.received[dispatched.qc_report.received.length - 1].on ? dispatched.qc_report.received[dispatched.qc_report.received.length - 1].on : null
    },
    {
      name: "Payment Approval Date",
      status: payement_approval_at ? "completed" : "pending",
      date: payement_approval_at ? payement_approval_at : null,
    },
    {
      name: "Payment Paid",
      status: payment_at ? "completed" : "pending",
      date: payment_at ? payment_at : null,
    },
  ];


  return res.status(200).send(new serviceResponse({ status: 200, data: steps, message: _response_message.found("audit trail") }))

})
