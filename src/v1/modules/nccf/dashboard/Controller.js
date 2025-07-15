const {
  _handleCatchErrors,
  dumpJSONToExcel,
} = require("@src/v1/utils/helpers");

const {
  serviceResponse,
  sendResponse,
} = require("@src/v1/utils/helpers/api_response");
const {
  _response_message,
  _middleware,
} = require("@src/v1/utils/constants/messages");
const { decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const {
  _userType,
  _poAdvancePaymentStatus,
  _status,
  _procuredStatus,
  _collectionName,
  _associateOfferStatus,
  _userStatus,
} = require("@src/v1/utils/constants");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const { Scheme } = require("@src/v1/models/master/Scheme");
const {
  wareHousev2,
} = require("@src/v1/models/app/warehouse/warehousev2Schema");
const {
  PurchaseOrderModel,
} = require("@src/v1/models/app/distiller/purchaseOrder");
const {
  wareHouseDetails,
} = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { mongoose } = require("mongoose");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const {
  StateDistrictCity,
} = require("@src/v1/models/master/StateDistrictCity");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { BatchOrderProcess } = require("@src/v1/models/app/distiller/batchOrderProcess");
const { procurement_partners } = require("@config/index");

/*
module.exports.getDashboardStats = asyncErrorHandler(async (req, res) => {
  try {
    const { user_id } = req;

    const currentDate = new Date();

    const wareHouseCount = (await wareHousev2.countDocuments()) ?? 0;
    const purchaseOrderCount =
      (await PurchaseOrderModel.countDocuments({ distiller_id: user_id })) ?? 0;

    const result = await wareHouseDetails.aggregate([
      {
        $project: {
          stockToSum: {
            $cond: {
              if: { $gt: ["$inventory.requiredStock", 0] }, // If requiredStock > 0
              then: "$inventory.requiredStock",
              else: "$inventory.stock", // Otherwise, take stock
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalStock: { $sum: "$stockToSum" },
        },
      },
    ]);

    const moU = await Distiller.countDocuments({
      mou_approval: _userStatus.pending,
    });

    const onBoarding = await Distiller.countDocuments({
      is_approved: _userStatus.pending,
    });

    const distillerCount = await Distiller.countDocuments();

    const pending_request = await Distiller.countDocuments({
      is_approved:"pending"
    });

    const realTimeStock = result.length > 0 ? result[0].totalStock : 0;

    const records = {
      wareHouseCount,
      purchaseOrderCount,
      realTimeStock,
      moUCount: moU,
      onBoardingCount: onBoarding,
      // totalRequest: moU + onBoarding,
       totalRequest: pending_request,
      distillerCount,
    };

    return res.send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("NCCF dashboard Stats"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});
*/


module.exports.getDashboardStats = asyncErrorHandler(async (req, res) => {
  try {
    const { user_id } = req;
    let { commodity, state } = req.query;
    let commodities = commodity?.split(",").map(c => c.trim().split(" ")[0]);
    let states = state?.split(",")?.map(s => s.trim());
    let stock = 0; //Get realtimestock if commodity is passed

    // Initialize filters
    let poFilter = {};
    let distillerFilter = {};
    let matchQuery = {};

    const getWarehouseProcurementStatsResult = await getWarehouseProcurementStats({ commodity: commodities, state: states });
    const totalsQuantity = getWarehouseProcurementStatsResult.reduce(
      (acc, curr) => {
        acc.totalProcuredQty += curr.totalProcuredQty || 0;
        acc.totalAvailableQty += curr.totalAvailableQty || 0;
        return acc;
      },
      { totalProcuredQty: 0, totalAvailableQty: 0 }
    );


    // State filter
    if (state) {
      if (typeof state === "string") {
        try {
          state = JSON.parse(state);
        } catch (err) {
          state = state.split(",").map(s => s.trim());
        }
      }
      const stateArray = Array.isArray(state) ? state : [state];
      const regexStates = stateArray.map(name => new RegExp(name, "i"));
      distillerFilter['address.registered.state'] = { $in: regexStates };
      poFilter['distiller.address.registered.state'] = { $in: regexStates };
      matchQuery['$or'] = [
        { 'address.registered.state': { $in: regexStates } },
        { 'addressDetails.state.state_name': { $in: regexStates } }
      ];
    }

    // Commodity filter 
    if (commodity) {
      if (typeof commodity === "string") {
        try {
          commodity = JSON.parse(commodity);
        } catch (err) {
          commodity = commodity.split(",").map(s => s.trim());
        }
      }
      const commodityArray = Array.isArray(commodity) ? commodity : [commodity];
      const regexCommodities = commodityArray.map(name => new RegExp(name, "i"));
      poFilter['product.name'] = { $in: regexCommodities };
      matchQuery['product.name'] = { $in: regexCommodities };
      distillerFilter['product.name'] = { $in: regexCommodities };
    }

    const baseMatch = { active: true };
    const finalMatchQuery = Object.keys(matchQuery).length > 0 ? { ...baseMatch, ...matchQuery } : baseMatch;

    //const wareHouseCount = await wareHouseDetails.countDocuments(finalMatchQuery);
    let wareHouseCount = 0;
    let matchedBatches = []
    if (commodity) {
      const commodityArray = Array.isArray(commodity) ? commodity : [commodity];
      const regexCommodities = commodityArray.map(name => new RegExp(name, "i"));

      const matchedRequestIds = await RequestModel.find({
        $or: regexCommodities.map(regex => ({ 'product.name': { $regex: regex } }))
      }).distinct('_id');

      matchedBatches = await Batch.find({
        req_id: { $in: matchedRequestIds }
      }).distinct('warehousedetails_id');

      wareHouseCount = await wareHouseDetails.countDocuments({
        _id: { $in: matchedBatches }
      });
    } else {
      wareHouseCount = await wareHouseDetails.countDocuments(finalMatchQuery);
    }
    // Purchase Order aggregation
    const purchaseOrderPipeline = [
      {
        $lookup: {
          from: "distillers",
          localField: "distiller_id",
          foreignField: "_id",
          as: "distiller"
        }
      },
      { $unwind: "$distiller" }
    ];

    if (Object.keys(poFilter).length > 0) {
      purchaseOrderPipeline.push({ $match: poFilter });
    }

    purchaseOrderPipeline.push({ $count: "count" });

    const purchaseOrderAggregate = await PurchaseOrderModel.aggregate(purchaseOrderPipeline);
    const DistillertotalCount = await Distiller.countDocuments({is_approved: _userStatus.approved, ...distillerFilter});
    const purchaseOrderCount = purchaseOrderAggregate.length > 0 ? purchaseOrderAggregate[0].count : 0;

    // Distiller aggregation
    const distillerPipeline = [
      {
        $lookup: {
          from: "purchaseorders",
          let: { distillerId: "$_id" },
          pipeline: [
            {
              $lookup: {
                from: "distillers",
                localField: "distiller_id",
                foreignField: "_id",
                as: "distiller"
              }
            },
            { $unwind: "$distiller" },
            {
              $match: {
                $expr: { $eq: ["$distiller_id", "$$distillerId"] },
                ...(Object.keys(poFilter).length > 0 ? poFilter : {})
              }
            }
          ],
          as: "filteredOrders"
        }
      },
      { $match: { filteredOrders: { $ne: [] } } },
      { $count: "count" }
    ];

    const distillerAggregate = await Distiller.aggregate(distillerPipeline);
    const distillerCount = (!state && !commodity) ? DistillertotalCount : (distillerAggregate.length > 0 ? distillerAggregate[0].count : 0);

    // Stock pipeline filter
    const stockPipeline = [];

    //state filter for warehouse
    if (state) {
      const stateArray = Array.isArray(state) ? state : [state];
      const regexStates = stateArray.map(name => new RegExp(name, "i"));
      stockPipeline.push({
        $match: {
          $or: [
            { 'address.registered.state': { $in: regexStates } },
            { 'addressDetails.state.state_name': { $in: regexStates } }
          ]
        }
      });
    }

    //commodity filter for warehouse
    if (commodity) {
      const commodityArray = Array.isArray(commodity) ? commodity : [commodity];
      const regexCommodities = commodityArray.map(name => new RegExp(name, "i"));
      stockPipeline.push({
        $match: {
          'product.name': { $in: regexCommodities }
        }
      });
      const wareHouseArr = await wareHouseDetails.find({
        _id: { $in: matchedBatches }
      }, { inventory: 1 });

      stock = wareHouseArr.reduce((acc, curr) => acc + curr?.inventory?.stock || 0, 0);
    }

    stockPipeline.push(
      {
        $project: {
          stockToSum: {
            $cond: {
              if: { $gt: ["$inventory.requiredStock", 0] },
              then: "$inventory.requiredStock",
              else: "$inventory.stock"
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalStock: { $sum: "$stockToSum" }
        }
      }
    );

    const result = await wareHouseDetails.aggregate(stockPipeline);
    const realTimeStock = commodity ? stock : (result.length > 0 ? result[0].totalStock : 0);

    // Other filtered counts
    const stateFilter = state ? { 'address.registered.state': { $in: [new RegExp(state, "i")] } } : {};
    const moU = await Distiller.countDocuments({ mou_approval: _userStatus.pending, ...stateFilter });
    const onBoarding = await Distiller.countDocuments({ is_approved: _userStatus.pending, ...stateFilter });
    const pending_request = await Distiller.countDocuments({ is_approved: "pending", ...stateFilter });
    const records = {
      wareHouseCount: getWarehouseProcurementStatsResult?.length || 0, //wareHouseCount ?? 0,
      purchaseOrderCount,
      realTimeStock,
      moUCount: moU,
      onBoardingCount: onBoarding,
      totalRequest: pending_request,
      distillerCount,

      totalProcuredQty: totalsQuantity?.totalProcuredQty?.toFixed(2),
      totalAvailableQty: totalsQuantity?.totalAvailableQty?.toFixed(2),

    };

    return res.send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("NCCF dashboard Stats"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});






module.exports.getonBoardingRequests = asyncErrorHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    let { state } = req.query;

    //state input to array
    try {
      if (typeof state === "string") state = JSON.parse(state);
    } catch (err) {
      return res.status(400).send(new serviceResponse({
        status: 400,
        message: "Invalid state format. Must be a valid JSON array of strings.",
      }));
    }

    const stateArray = Array.isArray(state) ? state : state ? [state] : [];

    //apply state filter
    const stateFilter = stateArray.length
      ? { "address.registered.state": { $in: stateArray } }
      : {};

    const data = await Distiller.aggregate([
      { $match: stateFilter },
      {
        $project: {
          distiller_name: "$basic_details.distiller_details.organization_name",
          distiller_id: "$user_code",
          status: "$is_approved",
          state: "$address.registered.state"
        },
      },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]);

    const totalCount = await Distiller.countDocuments(stateFilter);

    const records = {
      data,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };

    return res.send(new serviceResponse({
      status: 200,
      data: records,
      message: _response_message.found("NCCF dashboard onboarding requests"),
    }));
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});



module.exports.getpenaltyStatus = asyncErrorHandler(async (req, res) => {
  try {
    const page = 1,
      limit = 5,
      paginate = 1;

    let aggregationPipeline = [
      {
        $lookup: {
          from: "distillers", // Adjust this to your actual collection name for branches
          localField: "distiller_id",
          foreignField: "_id",
          as: "distillerDetails",
        },
      },
      // Unwind batchDetails array if necessary
      {
        $unwind: {
          path: "$distillerDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "batchorderprocesses", // Adjust this to your actual collection name for branches
          localField: "_id",
          foreignField: "orderId",
          as: "batchDetails",
        },
      },

      // Unwind batchDetails array if necessary
      { $unwind: { path: "$batchDetails", preserveNullAndEmptyArrays: true } },

      // Unwind penaltyDetails if it's an array (assuming it is)
      {
        $unwind: {
          path: "$batchDetails.penaltyDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Group by order ID and sum up penaltyAmount
      {
        $group: {
          _id: "$_id",
          order_id: { $first: "$purchasedOrder.poNo" },
          distillerName: {
            $first:
              "$distillerDetails.basic_details.distiller_details.organization_name",
          },
          commodity: { $first: "$product.name" },
          quantityRequired: { $first: "$purchasedOrder.poQuantity" },
          totalAmount: { $first: "$paymentInfo.totalAmount" },
          paymentSent: { $first: "$paymentInfo.paidAmount" },
          outstandingPayment: { $first: "$paymentInfo.balancePayment" },
          totalPenaltyAmount: {
            $sum: {
              $ifNull: ["$batchDetails.penaltyDetails.penaltyAmount", 0],
            },
          },
          paymentStatus: { $first: "$poStatus" },
          distiller_id: { $first: "$distillerDetails.user_code" },
        },
      },

      // Final Projection
      {
        $project: {
          _id: 1,
          order_id: 1,
          distillerName: 1,
          commodity: 1,
          quantityRequired: 1,
          totalAmount: 1,
          paymentSent: 1,
          outstandingPayment: 1,
          totalPenaltyAmount: 1, // Ensure total sum is included
          paymentStatus: 1,
          distiller_id: 1,
        },
      },
    ];

    aggregationPipeline.push(
      { $sort: { createdAt: -1, _id: 1 } },
      { $limit: parseInt(limit) }
    );

    const rows = await PurchaseOrderModel.aggregate(aggregationPipeline);

    const countPipeline = [{ $count: "total" }];

    const countResult = await PurchaseOrderModel.aggregate(countPipeline);
    const count = countResult[0]?.total || 0;

    const records = { rows, count };

    if (paginate == 1) {
      records.page = parseInt(page);
      records.limit = parseInt(limit);
      records.pages = limit != 0 ? Math.ceil(count / limit) : 0;
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("NCCF dashboard penalty status"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

// module.exports.getWarehouseList = asyncErrorHandler(async (req, res) => {
//   const { limit = 5 } = req.query;
//   const page = 1,
//     sortBy = "createdAt",
//     sortOrder = "asc",
//     isExport = 0;

//   try {
//     const warehouses = await wareHouseDetails
//   .find()
//   .select('_id basicDetails addressDetails.district addressDetails.state inventory procurement_partner active')
//   .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
//   .skip((page - 1) * limit)
//   .limit(parseInt(limit));


//     // Count total warehouses
//     const totalWarehouses = await wareHouseDetails.countDocuments();
//     const activeWarehouses = await wareHouseDetails.countDocuments({
//       active: true,
//     });
//     const inactiveWarehouses = totalWarehouses - activeWarehouses;

//     // Handle export functionality
//     if (isExport == 1) {
//       const exportData = warehouses.map((item) => ({
//         "Warehouse ID": item._id,
//         "Warehouse Name": item.basicDetails?.warehouseName || "NA",
//         City: item.addressDetails?.city || "NA",
//         State: item.addressDetails?.state || "NA",
//         Status: item.active ? "Active" : "Inactive",
//       }));

//       if (exportData.length) {
//         return dumpJSONToExcel(req, res, {
//           data: exportData,
//           fileName: `Warehouse-List.xlsx`,
//           worksheetName: `Warehouses`,
//         });
//       }

//       return res
//         .status(200)
//         .send(
//           new serviceResponse({
//             status: 200,
//             message: "No data available for export",
//           })
//         );
//     }


//     // Return paginated results
//     return res.status(200).send(
//       new serviceResponse({
//         status: 200,
//         data: {
//           records: warehouses,
//           page,
//           limit,
//           totalRecords: totalWarehouses,
//           activeRecords: activeWarehouses,
//           inactiveRecords: inactiveWarehouses,
//           pages: Math.ceil(totalWarehouses / limit),
//         },
//         message: "Warehouses fetched successfully",
//       })
//     );
//   } catch (error) {
//     console.error(error);
//     return res
//       .status(500)
//       .send(
//         new serviceResponse({
//           status: 500,
//           message: "Error fetching warehouses",
//           error: error.message,
//         })
//       );
//   }
// });


// module.exports.getWarehouseList = asyncErrorHandler(async (req, res) => {
//   const { limit = 5, state, commodity } = req.query;

//   const page = 1;
//   const sortBy = "createdAt";
//   const sortOrder = "asc";
//   const isExport = 0;

//   try {
//     const matchConditions = [];

//     if (state) {
//       matchConditions.push({ "addressDetails.state": state });
//     }

//     const commodityMatch = commodity ? commodity.split(",").map(c => c.trim()) : [];

//     const aggregationPipeline = [];

//     // Add initial $match if state exists
//     if (matchConditions.length) {
//       aggregationPipeline.push({ $match: { $and: matchConditions } });
//     }

//     // Sorting and pagination
//     aggregationPipeline.push(
//       { $sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 } },
//       { $skip: (page - 1) * parseInt(limit) },
//       { $limit: parseInt(limit) }
//     );

//     // Join with batchorderprocesses
//     aggregationPipeline.push(
//       {
//         $lookup: {
//           from: "batchorderprocesses",
//           localField: "_id",
//           foreignField: "warehouseId",
//           as: "batchOrders"
//         }
//       },
//       {
//         $unwind: {
//           path: "$batchOrders",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $lookup: {
//           from: "purchaseorders",
//           localField: "batchOrders.orderId",
//           foreignField: "_id",
//           as: "purchaseOrder"
//         }
//       },
//       {
//         $unwind: {
//           path: "$purchaseOrder",
//           preserveNullAndEmptyArrays: true
//         }
//       }
//     );



//     // Final projection
//     aggregationPipeline.push({
//       $project: {
//         _id: 1,
//         warehouseName: "$basicDetails.warehouseName",
//         inventory: 1,
//         procurement_partner: 1,
//         state: "$addressDetails.state",
//         district: "$addressDetails.district",
//         orderId: "$purchaseOrder._id",
//         poquantity:"$purchaseOrder.purchasedOrder.poQuantity",
//         commodity: {
//           $ifNull: ["$purchaseOrder.product.name", "NA"]
//         },
//         active: 1,
//         "basicDetails.warehouseName": 1,
//         "addressDetails.state.state_name": 1,
//         "addressDetails.district.district_name": 1
//       }
//     });

//     // Run aggregation
//     let warehouses = await wareHouseDetails.aggregate(aggregationPipeline);

//     // Count total warehouses (filtered by state if applicable)
//     const totalWarehouses = await wareHouseDetails.countDocuments(
//       state ? { "addressDetails.state": state } : {}
//     );
//     const activeWarehouses = await wareHouseDetails.countDocuments({
//       active: true,
//       ...(state ? { "addressDetails.state": state } : {})
//     });
//     const inactiveWarehouses = totalWarehouses - activeWarehouses;

//     // Handle export
//     if (isExport == 1) {
//       const exportData = warehouses.map((item) => ({
//         "Warehouse ID": item._id,
//         "Warehouse Name": item.warehouseName || "NA",
//         City: item.district?.district_name || "NA",
//         State: item.state?.state_name || "NA",
//         Commodity: item.commodity || "NA",
//         Status: item.active ? "Active" : "Inactive",
//       }));


//       if (exportData.length) {
//         return dumpJSONToExcel(req, res, {
//           data: exportData,
//           fileName: `Warehouse-List.xlsx`,
//           worksheetName: `Warehouses`,
//         });
//       }

//       return res.status(200).send(
//         new serviceResponse({
//           status: 200,
//           message: "No data available for export",
//         })
//       );
//     }

//     // Return paginated result
//     return res.status(200).send(
//       new serviceResponse({
//         status: 200,
//         data: {
//           records: warehouses,
//           page,
//           limit,
//           totalRecords: totalWarehouses,
//           activeRecords: activeWarehouses,
//           inactiveRecords: inactiveWarehouses,
//           pages: Math.ceil(totalWarehouses / limit),
//         },
//         message: "Warehouses fetched successfully",
//       })
//     );
//   } catch (error) {
//     console.error(error);
//     return res.status(500).send(
//       new serviceResponse({
//         status: 500,
//         message: "Error fetching warehouses",
//         error: error.message,
//       })
//     );
//   }
// });

module.exports.getWarehouseList = asyncErrorHandler(async (req, res) => {
  let { state, commodity, limit = 10, search = '' } = req.query;
  const page = parseInt(req.query.page) || 1;
  const sortBy = "createdAt";
  const sortOrder = "asc";
  const isExport = 0;

  // Parse query inputs
  try {
    if (typeof state === "string") state = JSON.parse(state);
    if (typeof commodity === "string") commodity = JSON.parse(commodity);
  } catch {
    return res.status(400).send(new serviceResponse({
      status: 400,
      message: "Invalid state or commodity format. Must be a valid JSON array of strings.",
    }));
  }

  // Normalize filters
  const stateArray = Array.isArray(state) ? state : state ? [state] : [];
  const commodityArray = Array.isArray(commodity) ? commodity : commodity ? [commodity] : [];

  const dynamicMatch = {
    procurement_partner: {
      $in: [procurement_partners.Radiant, procurement_partners.Agribid],
    },
    ...(stateArray.length && {
      "addressDetails.state.state_name": {
        $in: stateArray.map((s) => new RegExp(`^${s}$`, "i")),
      },
    }),
  };

  // Add search conditions if any
  if (search) {
    dynamicMatch.$or = [
      { procurement_partner: { $regex: search, $options: "i" } },
      { "basicDetails.warehouseName": { $regex: search, $options: "i" } },
      { "addressDetails.state.state_name": { $regex: search, $options: "i" } },
      { "addressDetails.district.district_name": { $regex: search, $options: "i" } },
    ];
  }

  const aggregationPipeline = [
    { $match: dynamicMatch },

    // Lookup batch orders
    {
      $lookup: {
        from: "batchorderprocesses",
        localField: "_id",
        foreignField: "warehouseId",
        as: "batchOrders",
      },
    },
    { $unwind: { path: "$batchOrders", preserveNullAndEmptyArrays: true } },

    // Lookup purchase orders
    {
      $lookup: {
        from: "purchaseorders",
        localField: "batchOrders.orderId",
        foreignField: "_id",
        as: "purchaseOrder",
      },
    },
    { $unwind: { path: "$purchaseOrder", preserveNullAndEmptyArrays: true } },

    // Lookup internal & external batches
    {
      $lookup: {
        from: "externalbatches",
        localField: "_id",
        foreignField: "warehousedetails_id",
        as: "externalBatches",
      },
    },
    {
      $lookup: {
        from: "batches",
        localField: "_id",
        foreignField: "warehousedetails_id",
        as: "internalBatches",
      },
    },

    {
      $addFields: {
        totalProcuredQty: {
          $round: [
            {
              $cond: {
                if: { $eq: ["$procurement_partner", procurement_partners.Radiant] },
                then: { $sum: "$internalBatches.qty" },
                else: { $sum: "$externalBatches.inward_quantity" }
              }
            },
            2
          ]
        },
        totalLiftedQty: {
          $round: [
            {
              $cond: {
                if: { $eq: ["$procurement_partner", procurement_partners.Radiant] },
                then: { $sum: "$internalBatches.allotedQty" },
                else: { $sum: "$externalBatches.outward_quantity" }
              }
            },
            2
          ]
        }
      }
    }

  ];

  // Optional filter by commodity
  if (commodityArray.length > 0) {
    aggregationPipeline.push({
      $match: {
        "purchaseOrder.product.name": { $in: commodityArray },
      },
    });
  }

  // Count warehouses
  const totalWarehouses = await wareHouseDetails.countDocuments(dynamicMatch);
  const activeWarehouses = await wareHouseDetails.countDocuments({
    ...dynamicMatch,
    active: true,
  });
  const inactiveWarehouses = totalWarehouses - activeWarehouses;

  // Add sorting and pagination
  aggregationPipeline.push(
    { $sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 } },
    { $skip: (page - 1) * parseInt(limit) },
    { $limit: parseInt(limit) }
  );

  // Final projection
  aggregationPipeline.push({
    $project: {
      _id: 1,
      warehouseName: "$basicDetails.warehouseName",
      inventory: 1,
      procurement_partner: 1,
      state: "$addressDetails.state",
      district: "$addressDetails.district",
      orderId: "$purchaseOrder._id",
      poquantity: "$purchaseOrder.purchasedOrder.poQuantity",
      commodity: {
        $ifNull: ["$purchaseOrder.product.name", "NA"],
      },
      active: 1,
      "basicDetails.warehouseName": 1,
      "addressDetails.state.state_name": 1,
      "addressDetails.district.district_name": 1,
      totalProcuredQty: 1,
      totalLiftedQty: 1,
    },
  });

  const warehouses = await wareHouseDetails.aggregate(aggregationPipeline);

  // Export Excel if needed
  if (isExport === 1) {
    const exportData = warehouses.map((item) => ({
      "Warehouse ID": item._id,
      "Warehouse Name": item.warehouseName || "NA",
      City: item.district?.district_name || "NA",
      State: item.state?.state_name || "NA",
      Commodity: item.commodity || "NA",
      Status: item.active ? "Active" : "Inactive",
    }));

    if (exportData.length) {
      return dumpJSONToExcel(req, res, {
        data: exportData,
        fileName: `Warehouse-List.xlsx`,
        worksheetName: `Warehouses`,
      });
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        message: "No data available for export",
      })
    );
  }

  // Final response
  return res.status(200).send(
    new serviceResponse({
      status: 200,
      data: {
        records: warehouses,
        page,
        limit,
        totalRecords: totalWarehouses,
        activeRecords: activeWarehouses,
        inactiveRecords: inactiveWarehouses,
        pages: Math.ceil(totalWarehouses / limit),
      },
      message: "Warehouses fetched successfully",
    })
  );
});

module.exports.getCompanyNames = async (req, res) => {
  try {
    // FETCH DISTINCT PROCUREMENT PARTNER VALUES
    const result = await wareHouseDetails.distinct("procurement_partner");

    if (!result || result.length === 0) {
      return sendResponse({
        res,
        data: [],
        status: 404,
        message: _response_message.notFound("procurement partners"),
      });
    }

    return sendResponse({
      res,
      data: result,
      status: 200,
      message: _response_message.found("procurement partners"),
    });
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};

module.exports.getMonthlyPaidAmount = asyncErrorHandler(async (req, res) => {
  try {
    const { state } = req.query;

    // Build match stage based on state condition
    const matchStage = {};
    if (state) {
      matchStage["distiller.address.registered.state"] = state;
    }

    const monthlyPaidAmounts = await PurchaseOrderModel.aggregate([
      {
        $lookup: {
          from: "distillers",
          localField: "distiller_id",
          foreignField: "_id",
          as: "distiller",
        },
      },
      {
        $unwind: "$distiller",
      },
      {
        $match: matchStage, // Apply state filter if provided
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalPaidAmount: { $sum: "$paymentInfo.paidAmount" },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          totalPaidAmount: 1,
        },
      },
    ]);

    // Generate a full list of months with 0 for missing data
    const currentYear = new Date().getFullYear();
    const startYear = monthlyPaidAmounts.length
      ? monthlyPaidAmounts[0].year
      : currentYear;
    const endYear = currentYear;

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const filledMonthlyData = [];
    let totalSumAllMonths = 0;

    for (let year = startYear; year <= endYear; year++) {
      for (let month = 1; month <= 12; month++) {
        const existingData = monthlyPaidAmounts.find(
          (data) => data.year === year && data.month === month
        );

        const paidAmount = existingData ? existingData.totalPaidAmount : 0;
        totalSumAllMonths += paidAmount;

        filledMonthlyData.push({
          year,
          month: monthNames[month - 1],
          totalPaidAmount: paidAmount,
        });
      }
    }

    if (!filledMonthlyData.length) {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          message: "No data available for monthly paid amounts",
        })
      );
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: {
          monthlyData: filledMonthlyData,
          totalSumAllMonths,
        },
        message: "Monthly paid amounts fetched successfully",
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).send(
      new serviceResponse({
        status: 500,
        message: "Error fetching monthly paid amounts",
        error: error.message,
      })
    );
  }
});

module.exports.getPublicStates = async (req, res) => {
  try {
    const states = await StateDistrictCity.aggregate([
      { $unwind: "$states" },
      { $project: { "states.state_title": 1, "states._id": 1 } },
      { $group: { _id: null, states: { $push: "$states" } } },
    ]);

    if (!states.length || !states[0].states.length) {
      return sendResponse({
        res,
        data: [],
        status: 404,
        message: _response_message.notFound("state"),
      });
    }

    return sendResponse({
      res,
      data: states[0].states,
      status: 200,
      message: _response_message.found("state"),
    });
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};

module.exports.getPublicDistrictByState = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse({
        res,
        data: null,
        status: 404,
        message: _response_message.invalid(id),
      });
    }
    const result = await StateDistrictCity.findOne(
      { "states._id": id },
      { "states.$": 1 }
    );

    if (!result && result?.states?.length > 0) {
      sendResponse({
        res,
        data: districts,
        status: 404,
        message: _response_message.notFound("state"),
      });
    }

    const state = result.states[0];
    const districts = state.districts.map((district) => ({
      district_title: district.district_title,
      _id: district._id,
    }));
    return sendResponse({
      res,
      data: districts,
      status: 200,
      message: _response_message.found("district"),
    });
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};



module.exports.getStatewiseDistillerCount = async (req, res) => {
  try {
    let { state, commodity } = req.query;

    // Parse JSON strings if provided
    try {
      if (typeof state === "string") state = JSON.parse(state);
      if (typeof commodity === "string") commodity = JSON.parse(commodity);
    } catch (err) {
      return res.status(400).send({
        status: 400,
        message: "Invalid state or commodity format. Must be a valid JSON array of strings.",
      });
    }

    // Ensure values are arrays
    const stateArray = Array.isArray(state) ? state : state ? [state] : [];
    const commodityArray = Array.isArray(commodity) ? commodity : commodity ? [commodity] : [];

    const hasFilters = stateArray.length > 0 || commodityArray.length > 0;

    let StateWiseDistiller;

    if (hasFilters) {
      const poMatch = {};

      // State filter for purchase orders
      if (stateArray.length) {
        poMatch['distiller.address.registered.state'] = { $in: stateArray };
      }

      // Commodity filter
      if (commodityArray.length) {
        poMatch['product.name'] = { $in: commodityArray };
      }

      StateWiseDistiller = await Distiller.aggregate([
        {
          $lookup: {
            from: "purchaseorders",
            let: { distillerId: "$_id" },
            pipeline: [
              {
                $lookup: {
                  from: "distillers",
                  localField: "distiller_id",
                  foreignField: "_id",
                  as: "distiller"
                }
              },
              { $unwind: "$distiller" },
              {
                $match: {
                  $expr: { $eq: ["$distiller_id", "$$distillerId"] },
                  ...poMatch
                }
              }
            ],
            as: "filteredOrders"
          }
        },
        {
          $match: {
            filteredOrders: { $ne: [] }, // Only distillers with matching orders
            "address.registered.state": { $ne: null },
            // Additional state filter for distillers
            ...(stateArray.length ? {
              "address.registered.state": { $in: stateArray }
            } : {})
          }
        },
        {
          $group: {
            _id: "$address.registered.state",
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            state: "$_id",
            count: 1
          }
        }
      ]);

    } else {
      // Default aggregation without filters
      StateWiseDistiller = await Distiller.aggregate([
        {
          $match: {
            "address.registered.state": { $ne: null }
          }
        },
        {
          $group: {
            _id: "$address.registered.state",
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            state: "$_id",
            count: 1
          }
        }
      ]);
    }

    const totalState = StateWiseDistiller.reduce(
      (sum, state) => sum + state.count,
      0
    );

    return sendResponse({
      res,
      status: 200,
      data: { stateWiseCount: StateWiseDistiller, totalState },
      message: _response_message.found("All distiller count fetch successfully"),
    });

  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
};


module.exports.getProcurmentCountDistiller = async (req, res) => {
  try {
    let { state, commodity } = req.query;

    //parse `commodity` and `state`
    try {
      if (typeof commodity === "string") {
        if (commodity.trim().startsWith("[")) {
          commodity = JSON.parse(commodity);
        } else {
          commodity = commodity.split(",").map(c => c.trim());
        }
      }

      if (typeof state === "string") {
        if (state.trim().startsWith("[")) {
          state = JSON.parse(state);
        } else {
          state = state.split(",").map(s => s.trim());
        }
      }
    } catch (err) {
      return res.status(400).send(new serviceResponse({
        status: 400,
        message: "Invalid state or commodity format. Use a JSON array or comma-separated values.",
      }));
    }

    const stateArray = Array.isArray(state) ? state : state ? [state] : [];
    const commodityArray = Array.isArray(commodity) ? commodity : commodity ? [commodity] : [];

    // Filter
    const matchStage = {};

    if (commodityArray.length > 0) {
      matchStage["product.name"] = {
        $in: commodityArray.map(name => name)
      };
    }

    const pipeline = [];

    //commodity filter
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    //distiller lookup
    pipeline.push({
      $lookup: {
        from: "distillers",
        localField: "distiller_id",
        foreignField: "_id",
        as: "distiller"
      }
    });

    pipeline.push({ $unwind: "$distiller" });

    //apply state filter
    if (stateArray.length > 0) {
      pipeline.push({
        $match: {
          "distiller.address.registered.state": {
            $in: stateArray.map(name => name)
          }
        }
      });
    } else {
      pipeline.push({
        $match: {
          "distiller.address.registered.state": { $ne: null }
        }
      });
    }

    //group by state
    pipeline.push({
      $group: {
        _id: "$distiller.address.registered.state",
        productCount: { $sum: 1 }
      }
    });

    const statewiseData = await PurchaseOrderModel.aggregate(pipeline);

    const result = statewiseData.map(item => ({
      state_name: item._id,
      productCount: item.productCount
    }));

    const grandTotalProductCount = result.reduce(
      (sum, item) => sum + item.productCount,
      0
    );

    return sendResponse({
      res,
      status: 200,
      message: "State wise procurement count",
      data: {
        states: result,
        grandTotalProductCount,
      },
    });

  } catch (error) {
    console.error("Error in getProcurmentCountDistiller:", error);
    _handleCatchErrors(error, res);
  }
};




// module.exports.getDistillerWisePayment = asyncErrorHandler(async (req, res) => {
//   try{
//     const page = 1,
//       limit = 5;

//     const data = await Distiller.aggregate([
//       {
//         $project: {
//           distiller_name: "$basic_details.distiller_details.organization_name",
//           distiller_id: "$user_code",
//           address: "$address.registered.state",
//         },
//       },
//     ])
//       .skip((page - 1) * limit)
//       .limit(limit);

//     const totalCount = await Distiller.countDocuments();

//     const records = {
//       data,
//       meta: {
//         total: totalCount,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         totalPages: Math.ceil(totalCount / limit),
//       },
//     };

//     return res.send(
//       new serviceResponse({
//         status: 200,
//         data: records,
//         message: _response_message.found("NCCF dashboard onboarding requests"),
//       })
//     );

//   }catch (error) {
//     _handleCatchErrors(error, res);
//   }
// });


module.exports.getDistillerWisePayment = asyncErrorHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    let { state, commodity } = req.query

    try {
      if (typeof state === "string") state = JSON.parse(state);
      if (typeof commodity === "string") commodity = JSON.parse(commodity);
    } catch (err) {
      return res.status(400).send(new serviceResponse({
        status: 400,
        message: "Invalid state or commodity format. Must be a valid JSON array of strings.",
      }));
    }

    // Ensure values are arrays
    const stateArray = Array.isArray(state) ? state : state ? [state] : [];
    const commodityArray = Array.isArray(commodity) ? commodity : commodity ? [commodity] : [];

    // Filters
    const stateFilters = stateArray.length
      ? {
        "distiller_info.address.registered.state": {
          $in: stateArray.map(name => name)
        }
      }
      : {};

    const commodityFilters = commodityArray.length
      ? {
        "product.name": {
          $in: commodityArray.map(name => name)
        }
      }
      : {};

    const aggregationPipeline = [
      {
        $match: {
          "paymentInfo.advancePaymentStatus": "Paid",
          ...commodityFilters,
        },
      },
      {
        $lookup: {
          from: "distillers",
          localField: "distiller_id",
          foreignField: "_id",
          as: "distiller_info",
        },
      },
      { $unwind: "$distiller_info" },
      {
        $match: {
          ...stateFilters,
        },
      },
      {
        $group: {
          _id: "$distiller_info._id",
          user_code: { $first: "$distiller_info.user_code" },
          distiller_id: { $first: "$distiller_id" },
          distiller_name: {
            $first:
              "$distiller_info.basic_details.distiller_details.organization_name",
          },
          address: {
            $first: "$distiller_info.address.registered.state",
          },
          paidAmount: { $sum: "$paymentInfo.paidAmount" },
          commodities: {
            $addToSet: "$product.name"
          }
        },
      },
      {
        $project: {
          _id: 0,
          user_code: 1,
          distiller_id: 1,
          distiller_name: 1,
          address: 1,
          paidAmount: 1,
          commodities: 1
        },
      },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    const data = await PurchaseOrderModel.aggregate(aggregationPipeline).exec();

    const countPipeline = [
      {
        $match: {
          "paymentInfo.advancePaymentStatus": "Paid",
          ...commodityFilters,
        },
      },
      {
        $lookup: {
          from: "distillers",
          localField: "distiller_id",
          foreignField: "_id",
          as: "distiller_info",
        },
      },
      { $unwind: "$distiller_info" },
      {
        $match: {
          ...stateFilters,
        },
      },
      {
        $group: {
          _id: "$distiller_id",
        },
      },
      { $count: "total" },
    ];

    const countResult = await PurchaseOrderModel.aggregate(countPipeline).exec();
    const totalCount = countResult[0]?.total || 0;

    return res.send(
      new serviceResponse({
        status: 200,
        data: {
          data,
          meta: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
        message:
          data.length > 0
            ? _response_message.found("Distiller-wise payment data")
            : "No paid purchase orders found",
      })
    );
  } catch (error) {
    console.error("Aggregation Error:", error);
    _handleCatchErrors(error, res);
  }
});



async function getWarehouseProcurementStats({ commodity = [], state = [] }) {
  const matchConditions = {};

  // Match multiple states (case-insensitive)
  if (state.length > 0) {
    matchConditions['warehouseDetails.addressDetails.state.state_name'] = {
      $in: state.map(s => new RegExp(`^${s}$`, 'i')),
    };
  }

  const pipeline = [
    {
      $lookup: {
        from: 'warehousedetails',
        localField: 'warehousedetails_id',
        foreignField: '_id',
        as: 'warehouseDetails',
      },
    },
    { $unwind: '$warehouseDetails' },
    {
      $match: {
        ...matchConditions,
        'warehouseDetails.procurement_partner': {
          $in: [procurement_partners.Radiant, procurement_partners.Agribid],
        },
      },
    },

    {
      $lookup: {
        from: 'requests',
        localField: 'req_id',
        foreignField: '_id',
        as: 'requestDoc',
      },
    },
    { $unwind: '$requestDoc' },

    // Match multiple commodities (case-insensitive)
    ...(commodity.length > 0
      ? [{
        $match: {
          'requestDoc.product.name': {
            $in: commodity.map(c => new RegExp(`^${c}$`, 'i')),
          },
        },
      }]
      : []),

    {
      $lookup: {
        from: 'externalbatches',
        localField: 'warehousedetails_id',
        foreignField: 'warehousedetails_id',
        as: 'externalBatches',
      },
    },

    {
      $group: {
        _id: '$warehousedetails_id',
        procurement_partner: {
          $first: '$warehouseDetails.procurement_partner',
        },
        state_name: {
          $first: '$warehouseDetails.addressDetails.state.state_name',
        },
        commodity: { $first: '$requestDoc.product.name' },

        internalProcuredQty: { $sum: '$qty' },
        internalAvailableQty: { $sum: '$available_qty' },
        externalProcuredQty: {
          $sum: { $sum: '$externalBatches.inward_quantity' },
        },
        externalAvailableQty: {
          $sum: { $sum: '$externalBatches.remaining_quantity' },
        },
      },
    },

    {
      $project: {
        state: '$state_name',
        commodity: 1,
        procurement_partner: 1,
        totalProcuredQty: {
          $cond: [
            { $eq: ['$procurement_partner', procurement_partners.Radiant] },
            '$internalProcuredQty',
            '$externalProcuredQty',
          ],
        },
        totalAvailableQty: {
          $cond: [
            { $eq: ['$procurement_partner', procurement_partners.Radiant] },
            '$internalAvailableQty',
            '$externalAvailableQty',
          ],
        },
      },
    },
  ];
  const result = await Batch.aggregate(pipeline);
 
  return result;
}
