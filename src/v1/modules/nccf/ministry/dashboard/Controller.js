const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, } = require("@src/v1/utils/constants/messages");
const { decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType, _poAdvancePaymentStatus, _userStatus, _poPickupStatus } = require("@src/v1/utils/constants");
const { asyncErrorHandler, } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { wareHousev2 } = require("@src/v1/models/app/warehouse/warehousev2Schema");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { CenterProjection } = require("@src/v1/models/app/distiller/centerProjection");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const { BatchOrderProcess } = require("@src/v1/models/app/distiller/batchOrderProcess");
const { mongoose } = require("mongoose");


module.exports.getDashboardStats = asyncErrorHandler(async (req, res) => {

  try {
    const { state = '', commodity = '', cna = 'NCCF' } = req.query;

    const now = new Date();

    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(startOfCurrentMonth.getTime() - 1);

    const result = await PurchaseOrderModel.aggregate([
      {
        $facet: {
          currentMonth: [
            {
              $match: {
                createdAt: { $gte: startOfCurrentMonth }
              }
            },
            {
              $group: {
                _id: null,
                ongoingOrder: { $sum: "$purchasedOrder.poQuantity" },
                paymentReceived: { $sum: "$paymentInfo.paidAmount" }
              }
            }
          ],
          lastMonth: [
            {
              $match: {
                createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
              }
            },
            {
              $group: {
                _id: null,
                ongoingOrder: { $sum: "$purchasedOrder.poQuantity" },
                paymentReceived: { $sum: "$paymentInfo.paidAmount" }
              }
            }
          ]
        }
      }
    ]);

    const current = result[0].currentMonth[0] || { ongoingOrder: 0, paymentReceived: 0 };
    const last = result[0].lastMonth[0] || { ongoingOrder: 0, paymentReceived: 0 };

    const calculateChange = (currentVal, lastVal) => {
      if (lastVal === 0) {
        return currentVal === 0 ? 0 : 100;
      }
      return ((currentVal - lastVal) / lastVal) * 100;
    };

    const getTrend = (currentVal, lastVal) => {
      if (currentVal > lastVal) return "increase";
      if (currentVal < lastVal) return "decrease";
      return "no change";
    };

    const noOfDistiller = await Distiller.countDocuments({ is_approved: _userStatus.approved });

    const batch = await BatchOrderProcess.aggregate([
      {
        $facet: {
          currentMonth: [
            {
              $match: {
                createdAt: { $gte: startOfCurrentMonth }
              }
            },
            {
              $group: {
                _id: null,
                totalQuantityRequired: { $sum: "$quantityRequired" }
              }
            }
          ],
          lastMonth: [
            {
              $match: {
                createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
              }
            },
            {
              $group: {
                _id: null,
                totalQuantityRequired: { $sum: "$quantityRequired" }
              }
            }
          ]
        }
      }
    ]);

    const currentMonth = batch[0].currentMonth[0] || { totalQuantityRequired: 0 };
    const lastMonth = batch[0].lastMonth[0] || { totalQuantityRequired: 0 };

    const currentQty = currentMonth.totalQuantityRequired;
    const lastQty = lastMonth.totalQuantityRequired;

    const percentChange = lastQty === 0 ? currentQty === 0 ? 0 : 100 : ((currentQty - lastQty) / lastQty) * 100;

    const trendLifted = currentQty > lastQty ? "increase" : currentQty < lastQty ? "decrease" : "no change";

    const totalQtyDoc = await BatchOrderProcess.aggregate([
      {
        $group: {
          _id: null,
          totalQuantityRequired: { $sum: "$quantityRequired" }
        }
      }
    ]);

    const totalQty = totalQtyDoc[0]?.totalQuantityRequired || 0;

    const summary = {
      ongoingOrder: current.ongoingOrder,
      paymentReceived: current.paymentReceived,
      ongoingOrderChange: {
        percent: +calculateChange(current.ongoingOrder, last.ongoingOrder).toFixed(2),
        trend: getTrend(current.ongoingOrder, last.ongoingOrder)
      },
      paymentReceivedChange: {
        percent: +calculateChange(current.paymentReceived, last.paymentReceived).toFixed(2),
        trend: getTrend(current.paymentReceived, last.paymentReceived)
      },
      noOfDistiller: noOfDistiller || 0,
      quantityLifted: totalQty,
      changeFromLastMonth: {
        percent: +percentChange.toFixed(2),
        trendLifted: trendLifted
      }
    };

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: summary,
        message: _response_message.found("Order"),
      })
    );

  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.monthlyLiftedTrends = asyncErrorHandler(async (req, res) => {
  try {
    const { state = '', commodity = '', cna = 'NCCF' } = req.query;

    const monthlySummary = await BatchOrderProcess.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          totalQuantityRequired: { $sum: "$quantityRequired" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 }
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          //  month: "$_id.month",
          month: {
            $let: {
              vars: {
                monthsInString: [
                  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                ]
              },
              in: {
                $arrayElemAt: ["$$monthsInString", "$_id.month"]
              }
            }
          },
          totalQuantityRequired: 1,
          count: 1
        }
      }

    ]);

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: monthlySummary,
        message: _response_message.found("Monthly Lifted summary"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.getMonthlyPayments = asyncErrorHandler(async (req, res) => {
  try {
    const { state = '', commodity = '', cna = 'NCCF' } = req.query;

    const monthlyPayments = await PurchaseOrderModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          totalPaidAmount: { $sum: "$paymentInfo.paidAmount" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 }
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          // month: "$_id.month",
          month: {
            $let: {
              vars: {
                monthsInString: [
                  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                ]
              },
              in: {
                $arrayElemAt: ["$$monthsInString", "$_id.month"]
              }
            }
          },
          totalPaidAmount: 1,
          count: 1
        }
      }
    ]);

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: monthlyPayments,
        message: _response_message.found("Monthly payments"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.stateWiseQuantity = asyncErrorHandler(async (req, res) => {
  try {
    const { state = '', commodity = '', cna = 'NCCF' } = req.query;

    const result = await PurchaseOrderModel.aggregate([
      // Lookup to get branch details including state
      {
        $lookup: {
          from: "branches", // Collection name in MongoDB
          localField: "branch_id",
          foreignField: "_id",
          as: "branch"
        }
      },
      {
        $unwind: {
          path: "$branch",
          preserveNullAndEmptyArrays: false
        }
      },
      // Group by state and sum poQuantity
      {
        $group: {
          _id: "$branch.state",
          totalQuantity: { $sum: "$purchasedOrder.poQuantity" }
        }
      },
      // Format output
      {
        $project: {
          _id: 0,
          state: "$_id",
          totalQuantity: 1
        }
      },
      // Sort by totalQuantity descending
      {
        $sort: { totalQuantity: -1 }
      }
    ]);

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: result,
        message: _response_message.found("State-wise purchase order quantity")
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.warehouseList = asyncErrorHandler(async (req, res) => {
  try {
    const { page = 1, limit = 5, skip = 0, sortBy = "createdAt", search = '', state = '', commodity = '', cna = 'NCCF' } = req.query;

    const commodityNames = typeof commodity === 'string' && commodity.length > 0
      ? commodity.split(',').map(name => name.trim())
      : [];

    // Reject special characters in search
    if (/[.*+?^${}()|[\]\\]/.test(search)) {
      return sendResponse({
        res,
        status: 400,
        errorCode: 400,
        errors: [{ message: "Do not use any special character" }],
        message: "Do not use any special character"
      });
    }

    const aggregationPipeline = [
      {
        $match: {
          warehouseId: { $ne: null }
        }
      },
      {
        $lookup: {
          from: "warehousedetails",
          localField: "warehouseId",
          foreignField: "_id",
          as: "warehouse"
        }
      },
      {
        $unwind: {
          path: "$warehouse",
          preserveNullAndEmptyArrays: false
        }
      },
      ...(search
        ? [{
          $match: {
            $or: [
              { 'warehouse.basicDetails.warehouseName': { $regex: search, $options: 'i' } },
              { 'warehouse.warehouseDetailsId': { $regex: search, $options: 'i' } }
            ]
          }
        }]
        : []),
      ...(state
        ? [{
          $match: {
            'warehouse.addressDetails.state.state_name': { $regex: state, $options: 'i' }
          }
        }]
        : []),
      {
        $lookup: {
          from: "purchaseorders",
          localField: "orderId",
          foreignField: "_id",
          as: "purchaseorders"
        }
      },
      {
        $unwind: {
          path: "$purchaseorders",
          preserveNullAndEmptyArrays: true
        }
      },
      ...(commodityNames.length > 0
        ? [{
          $match: {
            'purchaseorders.product.name': { $in: commodityNames }
          }
        }]
        : []),
      {
        $group: {
          _id: "$warehouse.warehouseDetailsId",
          liftingQty: { $sum: "$quantityRequired" },
          liftedQty: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Accepted"] },
                "$quantityRequired",
                0
              ]
            }
          },
          liftingInProgressQty: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Pending"] },
                "$quantityRequired",
                0
              ]
            }
          },
          warehouseName: { $first: "$warehouse.basicDetails.warehouseName" },
          address: { $first: "$warehouse.addressDetails" }
        }
      },
      {
        $project: {
          _id: 0,
          commodity: '$purchaseorders.product.name',
          warehouseId: "$_id",
          warehouseName: 1,
          liftingQty: 1,
          liftedQty: 1,
          liftingInProgressQty: 1,
          totalQty: "$liftingQty",
          address: {
            addressLine1: "$address.addressLine1",
            addressLine2: "$address.addressLine2",
            city: "$address.city",
            tehsil: "$address.tehsil",
            pincode: "$address.pincode",
            state: "$address.state.state_name",
            district: "$address.district.district_name"
          }
        }
      },
      {
        $sort: { liftingQty: -1 }
      }
    ]

    const withoutPaginationPipeline = [...aggregationPipeline];

    aggregationPipeline.push(
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) }
    );

    const result = { count: 0 };
    withoutPaginationPipeline.push({ $count: "count" })
    ///////////////////
    const liftingQtySumPipeline = aggregationPipeline
      .slice(0, aggregationPipeline.findIndex(stage => stage.$group)) // Up to $group stage
      .concat([
        {
          $group: {
            _id: null,
            totalLiftingQty: { $sum: "$quantityRequired" }
          }
        }
      ]);

    const [liftingQtyResult] = await BatchOrderProcess.aggregate(liftingQtySumPipeline);
    result.totalLiftingQty = liftingQtyResult?.totalLiftingQty ?? 0;
    //////////////
    result.rows = await BatchOrderProcess.aggregate(aggregationPipeline);
    const totalCount = await BatchOrderProcess.aggregate(withoutPaginationPipeline);

    result.count = totalCount?.[0]?.count ?? 0;
    result.page = page;
    result.limit = limit;
    result.pages = limit != 0 ? Math.ceil(result.count / limit) : 0;

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        message: _response_message.found("Warehouse lifting list"),
        data: result
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
})

module.exports.poRaised = asyncErrorHandler(async (req, res) => {
  try {
    const { page = 1, limit, skip = 0, sortBy = "createdAt", search = '', state = '', commodity = '', cna = 'NCCF' } = req.query;

    // Reject special characters in search
    if (/[.*+?^${}()|[\]\\]/.test(search)) {
      return sendResponse({
        res,
        status: 400,
        errorCode: 400,
        errors: [{ message: "Do not use any special character" }],
        message: "Do not use any special character"
      });
    }

    const commodityNames = typeof commodity === 'string' && commodity.length > 0
      ? commodity.split(',').map(name => name.trim())
      : [];

    const pipeline = [
      {
        $lookup: {
          from: "distillers",
          localField: "distiller_id",
          foreignField: "_id",
          as: "distillers"
        }
      },
      { $unwind: { path: "$distillers", preserveNullAndEmptyArrays: true } },
      ...(search
        ? [{
          $match: { 'distillers.basic_details.distiller_details.organization_name': { $regex: search, $options: 'i' } }
        }]
        : []),
      ...(state
        ? [{
          $match: {
            'distillers.address.registered.state': { $regex: state, $options: 'i' }
          }
        }]
        : []),
      ...(commodityNames.length > 0
        ? [{
          $match: {
            'product.name': { $in: commodityNames }
          }
        }]
        : []),
      {
        $match: {
          "paymentInfo.advancePaymentStatus": _poAdvancePaymentStatus.paid,
          deletedAt: null
        }
      },
      {
        $project: {
          _id: 0,
          distillerName: "$distillers.basic_details.distiller_details.organization_name",
          state: "$distillers.address.registered.state",
          poToken: "$paymentInfo.token",
          poAmount: "$paymentInfo.totalAmount",
          commodity: "$product.name",
          quantity: "$purchasedOrder.poQuantity",
          status: "$payment_status",
          createdAt: 1
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ];
    const withoutPaginationPipeline = [...pipeline];

    pipeline.push(
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) }
    );

    // Count total documents
    const countPipeline = [...withoutPaginationPipeline, { $count: "count" }];

    // Sum of poAmount
    const sumPipeline = [
      ...withoutPaginationPipeline,
      {
        $group: {
          _id: null,
          totalPoAmount: { $sum: "$poAmount" }
        }
      }
    ];

    const result = { count: 0, totalPoAmount: 0 };
    result.rows = await PurchaseOrderModel.aggregate(pipeline);
    const [countResult] = await PurchaseOrderModel.aggregate(countPipeline);
    const [sumResult] = await PurchaseOrderModel.aggregate(sumPipeline);

    result.count = countResult?.count ?? 0;
    result.totalPoAmount = sumResult?.totalPoAmount ?? 0;
    result.page = page;
    result.limit = limit;
    result.pages = limit != 0 ? Math.ceil(result.count / limit) : 0;

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: result,
      message: _response_message.found("PO Raised"),
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.ongoingOrders = asyncErrorHandler(async (req, res) => {
  try {
    const { page = 1, limit, skip = 0, sortBy = "createdAt", search = '', state = '', commodity = '', cna = 'NCCF' } = req.query;

    // Reject special characters in search
    if (/[.*+?^${}()|[\]\\]/.test(search)) {
      return sendResponse({
        res,
        status: 400,
        errorCode: 400,
        errors: [{ message: "Do not use any special character" }],
        message: "Do not use any special character"
      });
    }

    const commodityNames = typeof commodity === 'string' && commodity.length > 0
      ? commodity.split(',').map(name => name.trim())
      : [];

    const pipeline = [
      {
        $lookup: {
          from: "distillers",
          localField: "distiller_id",
          foreignField: "_id",
          as: "distillers"
        }
      },
      { $unwind: { path: "$distillers", preserveNullAndEmptyArrays: true } },
      ...(search
        ? [{
          $match: { 'distillers.basic_details.distiller_details.organization_name': { $regex: search, $options: 'i' } }
        }]
        : []),
      ...(state
        ? [{
          $match: {
            'distillers.address.registered.state': { $regex: state, $options: 'i' }
          }
        }]
        : []),
      ...(commodityNames.length > 0
        ? [{
          $match: {
            'product.name': { $in: commodityNames }
          }
        }]
        : []),
      {
        $match: {
          "paymentInfo.advancePaymentStatus": _poAdvancePaymentStatus.paid,
          deletedAt: null,
          status: { $ne: "Completed" }
        }
      },
      {
        $project: {
          _id: 0,
          orderId: "$purchasedOrder.poNo",
          distillerName: "$distillers.basic_details.distiller_details.organization_name",
          poToken: "$paymentInfo.token",
          commodity: "$product.name",
          quantity: "$purchasedOrder.poQuantity",
          poAmount: "$paymentInfo.totalAmount",
          state: "$distillers.address.registered.state",
          district: "$distillers.address.registered.district",
          createdAt: 1 // needed for sorting
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ];

    const withoutPaginationPipeline = [...pipeline];

    // Pagination
    pipeline.push(
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) }
    );

    // Count total documents
    const countPipeline = [...withoutPaginationPipeline, { $count: "count" }];

    // Sum of poAmount
    const totalAmountPipeline = [
      ...withoutPaginationPipeline,
      {
        $group: {
          _id: null,
          totalPoAmount: { $sum: "$poAmount" }
        }
      }
    ];

    const result = { count: 0, totalPoAmount: 0 };
    result.rows = await PurchaseOrderModel.aggregate(pipeline);

    const [countResult] = await PurchaseOrderModel.aggregate(countPipeline);
    const [sumResult] = await PurchaseOrderModel.aggregate(totalAmountPipeline);

    result.count = countResult?.count ?? 0;
    result.totalPoAmount = sumResult?.totalPoAmount ?? 0;
    result.page = parseInt(page);
    result.limit = parseInt(limit);
    result.pages = limit != 0 ? Math.ceil(result.count / limit) : 0;

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: result,
      message: _response_message.found("PO Raised"),
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.stateWiseAnalysis = asyncErrorHandler(async (req, res) => {
  try {
    // 1. Distiller counts
    const distillerState = Distiller.aggregate([
      { $group: { _id: '$address.registered.state', distillerCount: { $sum: 1 } } }
    ]);

    // 2. Warehouse counts and requiredStock
    const warehouseState = wareHouseDetails.aggregate([
      {
        $group: {
          _id: '$addressDetails.state.state_name',
          warehouseCount: { $sum: 1 },
          totalRequiredStock: { $sum: '$inventory.requiredStock' }
        }
      }
    ]);

    // 3. Batch-order stats via PurchaseOrder → Distiller → State
    const batchState = BatchOrderProcess.aggregate([
      { $lookup: { from: 'purchaseorders', localField: 'orderId', foreignField: '_id', as: 'po' } },
      { $unwind: '$po' },
      { $lookup: { from: 'distillers', localField: 'po.distiller_id', foreignField: '_id', as: 'dist' } },
      { $unwind: '$dist' },
      {
        $group: {
          _id: '$dist.address.registered.state',
          batchCount: { $sum: 1 },
          totalBatchQty: { $sum: '$quantityRequired' }
        }
      }
    ]);

    // 4. Totals
    const totalDistillers = Distiller.countDocuments();
    const totalWarehouses = wareHouseDetails.countDocuments();

    const [dState, wState, bState, totalD, totalW] = await Promise.all([
      distillerState, warehouseState, batchState, totalDistillers, totalWarehouses
    ]);

    // Combine all states into one map
    const map = {};

    dState.forEach(d => {
      const state = d._id || 'Unknown';
      map[state] = { state, distillerCount: d.distillerCount, warehouseCount: 0, totalRequiredStock: 0, batchOrderCount: 0, totalBatchQty: 0 };
    });
    wState.forEach(w => {
      const state = w._id || 'Unknown';
      if (!map[state]) map[state] = { state, distillerCount: 0, warehouseCount: 0, totalRequiredStock: 0, batchOrderCount: 0, totalBatchQty: 0 };
      map[state].warehouseCount = w.warehouseCount;
      map[state].totalRequiredStock = w.totalRequiredStock;
    });
    bState.forEach(b => {
      const state = b._id || 'Unknown';
      if (!map[state]) map[state] = { state, distillerCount: 0, warehouseCount: 0, totalRequiredStock: 0, batchOrderCount: 0, totalBatchQty: 0 };
      map[state].batchOrderCount = b.batchCount;
      map[state].totalBatchQty = b.totalBatchQty;
    });

    const response = {
      totalDistillers: totalD,
      totalWarehouses: totalW,
      stateWiseStats: Object.values(map),
    };

    // res.status(200).json({ success: true, data: response });

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: response,
      message: _response_message.found("State wise analysis"),
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.getStateWishProjection = asyncErrorHandler(async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = '',
      state = '',
      district = '',
      isExport = 0,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { state: 1 };

    const query = {};
    if (search) {
      query.$or = [
        { state: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } },
        { center_location: { $regex: search, $options: 'i' } },
      ];
    }
    if (state) {
      query.state = { $regex: state, $options: 'i' };
    }

    if (district) {
      query.district = { $regex: district, $options: 'i' };
    }

    if (parseInt(isExport) === 1) {
      const exportData = await CenterProjection.find(query).sort(sort);

      const formattedData = exportData.map((item) => ({
        "Center Location": item.center_location || "NA",
        "State": item.state || "NA",
        "District": item.district || "NA",
        "Center Projection": item.current_projection || "NA",
        "Qty Booked": item.qty_booked || "NA",
      }));

      if (formattedData.length > 0) {
        return dumpJSONToExcel(req, res, {
          data: formattedData,
          fileName: `Center-Projections-${new Date().toISOString().split('T')[0]}.xlsx`,
          worksheetName: "Center Projections",
        });
      } else {
        return res.status(200).json({
          status: 400,
          message: "No Center Projection data found to export.",
          data: [],
        });
      }
    }

    const [total, data] = await Promise.all([
      CenterProjection.countDocuments(query),
      CenterProjection.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
    ]);
    const pages = limit != 0 ? Math.ceil(total / limit) : 0;
    return res.status(200).json({
      status: 200,
      data,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages,
      message: "Center Projections fetched successfully"
    });

  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: "Error fetching center projections ",
      error: error.message
    });
  }
});


module.exports.paymentWithTenPercant = asyncErrorHandler(async (req, res) => {
  try {
    const { page = 1, limit, skip = 0, sortBy = "createdAt", search = '', state = '', commodity = '', cna = 'NCCF' } = req.query;

    const pipeline = [
      {
        $match: {
          "paymentInfo.token": { $in: [10] },
          deletedAt: null
        }
      },
      {
        $group: {
          _id: {
            token: "$paymentInfo.token"
          },
          totalPOQuantity: { $sum: "$purchasedOrder.poQuantity" },
          totalPaidAmount: { $sum: "$paymentInfo.paidAmount" },
          distillerIds: { $addToSet: "$distiller_id" }
        }
      },
      {
        $addFields: {
          totalDistillers: { $size: "$distillerIds" }
        }
      },
      {
        $project: {
          _id: 0,
          token: "$_id.token",
          totalPOQuantity: 1,
          totalPaidAmount: 1,
          totalDistillers: 1
        }
      },
      {
        $sort: { token: 1 }
      }
    ];

    const result = await PurchaseOrderModel.aggregate(pipeline);

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: result,
      message: _response_message.found("PO Raised"),
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
});


module.exports.paymentWithHundredPercant = asyncErrorHandler(async (req, res) => {
  try {
    const { page = 1, limit, skip = 0, sortBy = "createdAt", search = '', state = '', commodity = '', cna = 'NCCF' } = req.query;

    const pipeline = [
      {
        $match: {
          "paymentInfo.token": { $in: [100] },
          deletedAt: null
        }
      },
      {
        $group: {
          _id: {
            token: "$paymentInfo.token"
          },
          totalPOQuantity: { $sum: "$purchasedOrder.poQuantity" },
          totalPaidAmount: { $sum: "$paymentInfo.paidAmount" },
          distillerIds: { $addToSet: "$distiller_id" }
        }
      },
      {
        $addFields: {
          totalDistillers: { $size: "$distillerIds" }
        }
      },
      {
        $project: {
          _id: 0,
          token: "$_id.token",
          totalPOQuantity: 1,
          totalPaidAmount: 1,
          totalDistillers: 1
        }
      },
      {
        $sort: { token: 1 }
      }
    ];

    const result = await PurchaseOrderModel.aggregate(pipeline);

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: result,
      message: _response_message.found("Token-wise PO Summary"),
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
});