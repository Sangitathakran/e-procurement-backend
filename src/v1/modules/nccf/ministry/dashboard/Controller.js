const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, } = require("@src/v1/utils/constants/messages");
const { decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType, _poAdvancePaymentStatus, _userStatus, _poBatchStatus } = require("@src/v1/utils/constants");
const { asyncErrorHandler, } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { wareHousev2 } = require("@src/v1/models/app/warehouse/warehousev2Schema");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { CenterProjection } = require("@src/v1/models/app/distiller/centerProjection");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const { BatchOrderProcess } = require("@src/v1/models/app/distiller/batchOrderProcess");
const { mongoose } = require("mongoose");
const { Batch } = require("@src/v1/models/app/procurement/Batch");

/*
module.exports.getDashboardStats = asyncErrorHandler(async (req, res) => {
  try {
    const {
      state = '',
      district = '',
      commodity = '',
      cna = '',
      filterType = 'month',
      startDate,
      endDate
    } = req.query;

    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];

    const getDateRanges = (type, startDate, endDate) => {
      const now = new Date();
      let currentStart, currentEnd, previousStart, previousEnd;

      switch (type) {
        case 'week':
          const day = now.getDay();
          currentStart = new Date(now);
          currentStart.setDate(now.getDate() - day);
          currentStart.setHours(0, 0, 0, 0);
          currentEnd = new Date(now);
          previousStart = new Date(currentStart);
          previousStart.setDate(currentStart.getDate() - 7);
          previousEnd = new Date(currentStart);
          previousEnd.setDate(currentStart.getDate() - 1);
          break;
        case 'year':
          currentStart = new Date(now.getFullYear(), 0, 1);
          currentEnd = now;
          previousStart = new Date(now.getFullYear() - 1, 0, 1);
          previousEnd = new Date(now.getFullYear() - 1, 11, 31);
          break;
        case 'range':
          if (!startDate || !endDate) throw new Error("Start date and end date are required for custom range");
          currentStart = new Date(startDate);
          currentEnd = new Date(endDate);
          previousStart = null;
          previousEnd = null;
          break;
        case 'month':
        default:
          currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
          currentEnd = now;
          previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          previousEnd = new Date(currentStart.getTime() - 1);
          break;
      }

      return { currentStart, currentEnd, previousStart, previousEnd };
    };

    const calculateChange = (currentVal, lastVal) => {
      if (lastVal === 0) return currentVal === 0 ? 0 : 100;
      return ((currentVal - lastVal) / lastVal) * 100;
    };

    const getTrend = (currentVal, lastVal) => {
      if (currentVal > lastVal) return "increased";
      if (currentVal < lastVal) return "decreased";
      return "no change";
    };

    const { currentStart, currentEnd, previousStart, previousEnd } = getDateRanges(filterType, startDate, endDate);

    const buildMatch = (start, end) => {
      const match = {
        createdAt: { $gte: start, $lte: end },
        source_by: { $in: finalCNA }
      };
      if (commodity) match["product.name"] = commodity;
      return match;
    };

    const matchCurrent = buildMatch(currentStart, currentEnd);
    const matchPrevious = previousStart && previousEnd ? buildMatch(previousStart, previousEnd) : {};

    const branchLookup = [
      {
        $lookup: {
          from: "branches",
          localField: "branch_id",
          foreignField: "_id",
          as: "branch"
        }
      },
      { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "paymentInfo.advancePaymentStatus": _poAdvancePaymentStatus.paid,
          ...(state && { "branch.state": state }),
          ...(district && { "branch.district": district }),
          ...(commodity && { "product.name": commodity })
        }
      }
    ];

    const result = await PurchaseOrderModel.aggregate([
      ...branchLookup,
      {
        $facet: {
          current: [
            { $match: matchCurrent },
            {
              $group: {
                _id: null,
                ongoingOrder: { $sum: "$purchasedOrder.poQuantity" },
                paymentReceived: { $sum: "$paymentInfo.paidAmount" }
              }
            }
          ],
          previous: [
            { $match: matchPrevious },
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

    const current = result[0].current[0] || { ongoingOrder: 0, paymentReceived: 0 };
    const last = result[0].previous[0] || { ongoingOrder: 0, paymentReceived: 0 };

    const noOfDistiller = await Distiller.countDocuments({
      is_approved: _userStatus.approved,
      source_by: { $in: finalCNA },
      ...(state && { "address.registered.state": state }),
      ...(district && { "address.registered.district": district })
    });


    const batchOrderLookups = [
      {
        $lookup: {
          from: "purchaseorders",
          localField: "orderId",
          foreignField: "_id",
          as: "order"
        }
      },
      { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "branches",
          localField: "order.branch_id",
          foreignField: "_id",
          as: "branch"
        }
      },
      { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "order.source_by": { $in: finalCNA },
          ...(state && { "branch.state": state }),
          ...(district && { "branch.district": district }),
          ...(commodity && { "order.purchasedOrder.commodity": commodity })
        }
      }
    ];

    const batch = await BatchOrderProcess.aggregate([
      ...batchOrderLookups,
      {
        $facet: {
          current: [
            { $match: { createdAt: { $gte: currentStart, $lte: currentEnd } } },
            {
              $group: {
                _id: null,
                totalQuantityRequired: { $sum: "$quantityRequired" },
                completedQty: {
                  $sum: {
                    $cond: [{ $eq: ["$status", _poBatchStatus.completed] }, "$quantityRequired", 0]
                  }
                }
              }
            }
          ],
          previous: [
            { $match: { createdAt: { $gte: previousStart, $lte: previousEnd } } },
            {
              $group: {
                _id: null,
                totalQuantityRequired: { $sum: "$quantityRequired" },
                completedQty: {
                  $sum: {
                    $cond: [{ $eq: ["$status", _poBatchStatus.completed] }, "$quantityRequired", 0]
                  }
                }
              }
            }
          ],
          totalCompleted: [
            { $match: { status: _poBatchStatus.completed } },
            {
              $group: {
                _id: null,
                completedQty: { $sum: "$quantityRequired" }
              }
            }
          ]
        }
      }
    ]);

    const totalQtyDoc = await BatchOrderProcess.aggregate([
      ...batchOrderLookups,
      {
        $group: {
          _id: null,
          totalQuantityRequired: { $sum: "$quantityRequired" }
        }
      }
    ]);

    const currentMonth = batch[0].current[0] || { totalQuantityRequired: 0, completedQty: 0 };
    const lastMonth = batch[0].previous[0] || { totalQuantityRequired: 0, completedQty: 0 };
    const totalCompletedQty = batch[0].totalCompleted[0]?.completedQty || 0;
    const totalQty = totalQtyDoc[0]?.totalQuantityRequired || 0;

    const quantityChangePercent = calculateChange(currentMonth.totalQuantityRequired, lastMonth.totalQuantityRequired);
    const completedChangePercent = calculateChange(currentMonth.completedQty, lastMonth.completedQty);
    const trendLifted = getTrend(currentMonth.totalQuantityRequired, lastMonth.totalQuantityRequired);
    const trendCompleted = getTrend(currentMonth.completedQty, lastMonth.completedQty);

    const totalQtyOrders = await PurchaseOrderModel.aggregate([
      ...branchLookup,
      {
        $facet: {
          current: [
            {
              $match: {
                ...matchCurrent,
                'paymentInfo.advancePaymentStatus': _poAdvancePaymentStatus.paid
              }
            },
            {
              $group: {
                _id: null,
                poQuantity: { $sum: "$purchasedOrder.poQuantity" }
              }
            }
          ],
          previous: [
            {
              $match: {
                ...matchPrevious,
                'paymentInfo.advancePaymentStatus': _poAdvancePaymentStatus.paid
              }
            },
            {
              $group: {
                _id: null,
                poQuantity: { $sum: "$purchasedOrder.poQuantity" }
              }
            }
          ],
          total: [
            {
              $match: {
                'paymentInfo.advancePaymentStatus': _poAdvancePaymentStatus.paid,
                source_by: { $in: finalCNA },
                ...(commodity && { "purchasedOrder.commodity": commodity })
              }
            },
            {
              $group: {
                _id: null,
                poQuantity: { $sum: "$purchasedOrder.poQuantity" }
              }
            }
          ]
        }
      }
    ]);

    const currentMonthOrder = totalQtyOrders[0].current[0]?.poQuantity || 0;
    const lastMonthOrder = totalQtyOrders[0].previous[0]?.poQuantity || 0;
    const orderChangePercent = calculateChange(currentMonthOrder, lastMonthOrder);
    const trendOrder = getTrend(currentMonthOrder, lastMonthOrder);
    const totalOrderPlace = totalQtyOrders[0].total[0]?.poQuantity || 0;

    const getWarehouseStock = async (matchDates) => {
      const stockAgg = await BatchOrderProcess.aggregate([
        ...batchOrderLookups,
        ...(matchDates ? [{ $match: matchDates }] : []),
        {
          $group: { _id: "$warehouseId" }
        },
        {
          $lookup: {
            from: "warehousedetails",
            localField: "_id",
            foreignField: "_id",
            as: "warehousedetails"
          }
        },
        { $unwind: "$warehousedetails" },
        {
          $group: {
            _id: null,
            totalStock: { $sum: "$warehousedetails.inventory.stock" }
          }
        }
      ]);
      return stockAgg;
    };

    const currentWarehouseStockAgg = await getWarehouseStock({ createdAt: { $gte: currentStart, $lte: currentEnd } });
    const lastWarehouseStockAgg = await getWarehouseStock({ createdAt: { $gte: previousStart, $lte: previousEnd } });

    const currentWarehouseStock = currentWarehouseStockAgg[0]?.totalStock || 0;
    const lastWarehouseStock = lastWarehouseStockAgg[0]?.totalStock || 0;
    const warehouseStockChangePercent = calculateChange(currentWarehouseStock, lastWarehouseStock);
    const warehouseStockTrend = getTrend(currentWarehouseStock, lastWarehouseStock);

    const summary = {
      noOfDistiller,
      orderPlaceQuantity: totalOrderPlace,
      orderPlaceQuantityChange: {
        percent: +orderChangePercent.toFixed(2),
        trend: trendOrder
      },
      completedOrderQuantity: currentMonth.completedQty,
      completedOrderChange: {
        percent: +completedChangePercent.toFixed(2),
        trend: trendCompleted
      },
      paymentReceived: current.paymentReceived,
      paymentReceivedChange: {
        percent: +calculateChange(current.paymentReceived, last.paymentReceived).toFixed(2),
        trend: getTrend(current.paymentReceived, last.paymentReceived)
      },
      ongoingOrder: current.ongoingOrder,
      ongoingOrderChange: {
        percent: +calculateChange(current.ongoingOrder, last.ongoingOrder).toFixed(2),
        trend: getTrend(current.ongoingOrder, last.ongoingOrder)
      },
      procurementQuantity: totalOrderPlace,
      procurementChange: {
        percent: +orderChangePercent.toFixed(2),
        trend: trendOrder
      },
      quantityLifted: totalQty,
      quantityLiftedChange: {
        percent: +quantityChangePercent.toFixed(2),
        trend: trendLifted
      },
      warehouseStock: currentWarehouseStock,
      warehouseStockChange: {
        percent: +warehouseStockChangePercent.toFixed(2),
        trend: warehouseStockTrend
      }
    };

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: summary,
        message: _response_message.found("Order")
      })
    );

  } catch (error) {
    _handleCatchErrors(error, res);
  }
});
*/

module.exports.getDashboardStats = asyncErrorHandler(async (req, res) => {
  try {
    const {
      state = '',
      district = '',
      commodity = '',
      filterType = 'month',
      startDate,
      endDate
    } = req.query;
    const parseArrayParam = (param, fallback = []) =>
      param ? (Array.isArray(param) ? param : param.split(',').map(p => p.trim())) : fallback;

    const stateList = parseArrayParam(req.query.state);
    const districtList = parseArrayParam(req.query.district);
    const commodityList = parseArrayParam(req.query.commodity);
    const cna = parseArrayParam(req.query.cna, ['NCCF']);

    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];

    const getDateRanges = (type, startDate, endDate) => {
      const now = new Date();
      let currentStart, currentEnd, previousStart, previousEnd;

      switch (type) {
        case 'week':
          const day = now.getDay();
          currentStart = new Date(now);
          currentStart.setDate(now.getDate() - day);
          currentStart.setHours(0, 0, 0, 0);
          currentEnd = new Date(now);
          previousStart = new Date(currentStart);
          previousStart.setDate(currentStart.getDate() - 7);
          previousEnd = new Date(currentStart);
          previousEnd.setDate(currentStart.getDate() - 1);
          break;
        case 'year':
          currentStart = new Date(now.getFullYear(), 0, 1);
          currentEnd = now;
          previousStart = new Date(now.getFullYear() - 1, 0, 1);
          previousEnd = new Date(now.getFullYear() - 1, 11, 31);
          break;
        case 'range':
          if (!startDate || !endDate) throw new Error("Start date and end date are required for custom range");
          currentStart = new Date(startDate);
          currentEnd = new Date(endDate);
          previousStart = null;
          previousEnd = null;
          break;
        case 'month':
        default:
          currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
          currentEnd = now;
          previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          previousEnd = new Date(currentStart.getTime() - 1);
          break;
      }

      return { currentStart, currentEnd, previousStart, previousEnd };
    };

    const calculateChange = (currentVal, lastVal) => {
      if (lastVal === 0) return currentVal === 0 ? 0 : 100;
      return ((currentVal - lastVal) / lastVal) * 100;
    };

    const getTrend = (currentVal, lastVal) => {
      if (currentVal > lastVal) return "increased";
      if (currentVal < lastVal) return "decreased";
      return "no change";
    };

    const { currentStart, currentEnd, previousStart, previousEnd } = getDateRanges(filterType, startDate, endDate);

    const buildMatch = (start, end) => {
      const match = {
        createdAt: { $gte: start, $lte: end },
        source_by: { $in: finalCNA }
      };
      if (commodityList.length > 0) match["product.name"] = { $in: commodityList };
      return match;
    };

    const matchCurrent = buildMatch(currentStart, currentEnd);
    const matchPrevious = previousStart && previousEnd ? buildMatch(previousStart, previousEnd) : {};

    const branchLookup = [
      {
        $lookup: {
          from: "branches",
          localField: "branch_id",
          foreignField: "_id",
          as: "branch"
        }
      },
      { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "paymentInfo.advancePaymentStatus": _poAdvancePaymentStatus.paid,
          "source_by": { $in: finalCNA },
          ...(stateList.length > 0 && { "branch.state": { $in: stateList } }),
          ...(districtList.length > 0 && { "branch.district": { $in: districtList } }),
          ...(commodityList.length > 0 && { "product.name": { $in: commodityList } })
        }
      }
    ];

    const result = await PurchaseOrderModel.aggregate([
      ...branchLookup,
      {
        $facet: {
          current: [
            { $match: matchCurrent },
            {
              $group: {
                _id: null,
                ongoingOrder: { $sum: "$purchasedOrder.poQuantity" },
                paymentReceived: { $sum: "$paymentInfo.paidAmount" }
              }
            }
          ],
          previous: [
            { $match: matchPrevious },
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

    const current = result[0].current[0] || { ongoingOrder: 0, paymentReceived: 0 };
    const last = result[0].previous[0] || { ongoingOrder: 0, paymentReceived: 0 };

    let noOfDistiller = 0;

    if (commodityList.length > 0) {
      const matchingDistillers = await PurchaseOrderModel.aggregate([
        {
          $match: {
            source_by: { $in: finalCNA },
            "product.name": { $in: commodityList }
          }
        },
        {
          $group: {
            _id: null,
            distillerIds: { $addToSet: "$distiller_id" }
          }
        }
      ]);

      const distillerIds = matchingDistillers[0]?.distillerIds || [];

      noOfDistiller = await Distiller.countDocuments({
        _id: { $in: distillerIds },
        is_approved: _userStatus.approved,
        source_by: { $in: finalCNA },
        ...(stateList.length > 0 && { "address.registered.state": { $in: stateList } }),
        ...(districtList.length > 0 && { "address.registered.district": { $in: districtList } })
      });

    } else {
      noOfDistiller = await Distiller.countDocuments({
        is_approved: _userStatus.approved,
        source_by: { $in: finalCNA },
        ...(stateList.length > 0 && { "address.registered.state": { $in: stateList } }),
        ...(districtList.length > 0 && { "address.registered.district": { $in: districtList } })
      });
    }

    let previousNoOfDistiller = 0;

    if (commodityList.length > 0) {
      const previousMatchingDistillers = await PurchaseOrderModel.aggregate([
        {
          $match: {
            source_by: { $in: finalCNA },
            "product.name": { $in: commodityList },
            createdAt: { $gte: previousStart, $lte: previousEnd }
          }
        },
        {
          $group: {
            _id: null,
            distillerIds: { $addToSet: "$distiller_id" }
          }
        }
      ]);

      const prevDistillerIds = previousMatchingDistillers[0]?.distillerIds || [];

      previousNoOfDistiller = await Distiller.countDocuments({
        _id: { $in: prevDistillerIds },
        is_approved: _userStatus.approved,
        source_by: { $in: finalCNA },
        ...(stateList.length > 0 && { "address.registered.state": { $in: stateList } }),
        ...(districtList.length > 0 && { "address.registered.district": { $in: districtList } })
      });
    } else {
      previousNoOfDistiller = await Distiller.countDocuments({
        is_approved: _userStatus.approved,
        source_by: { $in: finalCNA },
        createdAt: { $gte: previousStart, $lte: previousEnd },
        ...(stateList.length > 0 && { "address.registered.state": { $in: stateList } }),
        ...(districtList.length > 0 && { "address.registered.district": { $in: districtList } })
      });
    }

    const batchOrderLookups = [
      {
        $lookup: {
          from: "purchaseorders",
          localField: "orderId",
          foreignField: "_id",
          as: "order"
        }
      },
      { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "branches",
          localField: "order.branch_id",
          foreignField: "_id",
          as: "branch"
        }
      },
      { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "order.source_by": { $in: finalCNA },
          ...(stateList.length > 0 && { "branch.state": { $in: stateList } }),
          ...(districtList.length > 0 && { "branch.district": { $in: districtList } }),
          ...(commodityList.length > 0 && { "order.purchasedOrder.commodity": { $in: commodityList } })
        }
      }
    ];

    const batch = await BatchOrderProcess.aggregate([
      ...batchOrderLookups,
      {
        $facet: {
          current: [
            { $match: { createdAt: { $gte: currentStart, $lte: currentEnd } } },
            {
              $group: {
                _id: null,
                totalQuantityRequired: { $sum: "$quantityRequired" },
                completedQty: {
                  $sum: {
                    $cond: [{ $eq: ["$status", _poBatchStatus.completed] }, "$quantityRequired", 0]
                  }
                }
              }
            }
          ],
          previous: [
            { $match: { createdAt: { $gte: previousStart, $lte: previousEnd } } },
            {
              $group: {
                _id: null,
                totalQuantityRequired: { $sum: "$quantityRequired" },
                completedQty: {
                  $sum: {
                    $cond: [{ $eq: ["$status", _poBatchStatus.completed] }, "$quantityRequired", 0]
                  }
                }
              }
            }
          ],
          totalCompleted: [
            { $match: { status: _poBatchStatus.completed } },
            {
              $group: {
                _id: null,
                completedQty: { $sum: "$quantityRequired" }
              }
            }
          ]
        }
      }
    ]);

    const totalQtyDoc = await BatchOrderProcess.aggregate([
      ...batchOrderLookups,
      {
        $group: {
          _id: null,
          totalQuantityRequired: { $sum: "$quantityRequired" }
        }
      }
    ]);

    const currentMonth = batch[0].current[0] || { totalQuantityRequired: 0, completedQty: 0 };
    const lastMonth = batch[0].previous[0] || { totalQuantityRequired: 0, completedQty: 0 };
    const totalCompletedQty = batch[0].totalCompleted[0]?.completedQty || 0;
    const totalQty = totalQtyDoc[0]?.totalQuantityRequired || 0;

    const quantityChangePercent = calculateChange(currentMonth.totalQuantityRequired, lastMonth.totalQuantityRequired);
    const completedChangePercent = calculateChange(currentMonth.completedQty, lastMonth.completedQty);
    const trendLifted = getTrend(currentMonth.totalQuantityRequired, lastMonth.totalQuantityRequired);
    const trendCompleted = getTrend(currentMonth.completedQty, lastMonth.completedQty);

    const totalQtyOrders = await PurchaseOrderModel.aggregate([
      ...branchLookup,
      {
        $facet: {
          current: [
            {
              $match: {
                ...matchCurrent,
                'paymentInfo.advancePaymentStatus': _poAdvancePaymentStatus.paid
              }
            },
            {
              $group: {
                _id: null,
                poQuantity: { $sum: "$purchasedOrder.poQuantity" }
              }
            }
          ],
          previous: [
            {
              $match: {
                ...matchPrevious,
                'paymentInfo.advancePaymentStatus': _poAdvancePaymentStatus.paid
              }
            },
            {
              $group: {
                _id: null,
                poQuantity: { $sum: "$purchasedOrder.poQuantity" }
              }
            }
          ],
          total: [
            {
              $match: {
                'paymentInfo.advancePaymentStatus': _poAdvancePaymentStatus.paid,
                source_by: { $in: finalCNA },
                ...(commodity && { "purchasedOrder.commodity": commodity })
              }
            },
            {
              $group: {
                _id: null,
                poQuantity: { $sum: "$purchasedOrder.poQuantity" }
              }
            }
          ]
        }
      }
    ]);

    const distillerPlaceOrder = await PurchaseOrderModel.aggregate([
      // Include any branch or join lookups here
      ...branchLookup,
      {
        $facet: {
          current: [
            {
              $match: {
                ...matchCurrent,
              }
            },
            {
              $group: {
                _id: "$created_by" // or "$distiller_id" if different
              }
            },
            {
              $count: "uniqueDistillerCount"
            }
          ],
          previous: [
            {
              $match: {
                ...matchPrevious,
              }
            },
            {
              $group: {
                _id: "$created_by"
              }
            },
            {
              $count: "uniqueDistillerCount"
            }
          ],
          total: [
            {
              $match: {
                source_by: { $in: finalCNA },
                ...(commodity && { "purchasedOrder.commodity": commodity })
              }
            },
            {
              $group: {
                _id: "$distiller_id"
              }
            },
            {
              $count: "uniqueDistillerCount"
            }
          ]
        }
      }
    ]);

    const currentCount = distillerPlaceOrder[0]?.current?.[0]?.uniqueDistillerCount || 0;
    const previousCount = distillerPlaceOrder[0]?.previous?.[0]?.uniqueDistillerCount || 0;

    const distillerPlaceOrderPercent = calculateChange(currentCount, previousCount);
    const trendDistillerPlaceOrder = getTrend(currentCount, previousCount);
    const totalDistillerPlaceOrder = distillerPlaceOrder[0]?.total?.[0]?.uniqueDistillerCount || 0;

    const currentMonthOrder = totalQtyOrders[0].current[0]?.poQuantity || 0;
    const lastMonthOrder = totalQtyOrders[0].previous[0]?.poQuantity || 0;

    const orderChangePercent = calculateChange(currentMonthOrder, lastMonthOrder);
    const trendOrder = getTrend(currentMonthOrder, lastMonthOrder);
    const totalOrderPlace = totalQtyOrders[0].total[0]?.poQuantity || 0;

    const getWarehouseStock = async (matchDates) => {
      const stockAgg = await BatchOrderProcess.aggregate([
        ...batchOrderLookups,
        ...(matchDates ? [{ $match: matchDates }] : []),
        {
          $group: { _id: "$warehouseId" }
        },
        {
          $lookup: {
            from: "warehousedetails",
            localField: "_id",
            foreignField: "_id",
            as: "warehousedetails"
          }
        },
        { $unwind: "$warehousedetails" },
        {
          $group: {
            _id: null,
            totalStock: { $sum: "$warehousedetails.inventory.stock" }
          }
        }
      ]);
      return stockAgg;
    };

    const currentWarehouseStockAgg = await getWarehouseStock({ createdAt: { $gte: currentStart, $lte: currentEnd } });
    const lastWarehouseStockAgg = await getWarehouseStock({ createdAt: { $gte: previousStart, $lte: previousEnd } });

    const currentWarehouseStock = currentWarehouseStockAgg[0]?.totalStock || 0;
    const lastWarehouseStock = lastWarehouseStockAgg[0]?.totalStock || 0;
    const warehouseStockChangePercent = calculateChange(currentWarehouseStock, lastWarehouseStock);
    const warehouseStockTrend = getTrend(currentWarehouseStock, lastWarehouseStock);

    const procurementQtyAgg = await Batch.aggregate([
      {
        $lookup: {
          from: "warehousedetails",
          localField: "warehousedetails_id",
          foreignField: "_id",
          as: "warehouse"
        }
      },
      { $unwind: { path: "$warehouse", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          ...(stateList.length > 0 && { "warehouse.addressDetails.state.state_name": { $in: stateList } }),
          ...(districtList.length > 0 && { "warehouse.addressDetails.district.district_name": { $in: districtList } }),
          source_by: { $in: finalCNA },
          createdAt: { $gte: currentStart, $lte: currentEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalProcurementQty: { $sum: "$qty" }
        }
      }
    ]);

    const procurementQuantity = procurementQtyAgg[0]?.totalProcurementQty || 0;

    const summary = {
      noOfDistiller,
      noOfDistillerChange: {
        percent: +calculateChange(noOfDistiller, previousNoOfDistiller).toFixed(2),
        trend: getTrend(noOfDistiller, previousNoOfDistiller)
      },
      distillerPlaceOrder: totalDistillerPlaceOrder,
      distillerPlaceOrderChange: {
        percent: +distillerPlaceOrderPercent.toFixed(2),
        trend: trendDistillerPlaceOrder
      },
      orderPlaceQuantity: totalOrderPlace,
      orderPlaceQuantityChange: {
        percent: +orderChangePercent.toFixed(2),
        trend: trendOrder
      },
      completedOrderQuantity: currentMonth.completedQty,
      completedOrderChange: {
        percent: +completedChangePercent.toFixed(2),
        trend: trendCompleted
      },
      paymentReceived: current.paymentReceived,
      paymentReceivedChange: {
        percent: +calculateChange(current.paymentReceived, last.paymentReceived).toFixed(2),
        trend: getTrend(current.paymentReceived, last.paymentReceived)
      },
      ongoingOrder: current.ongoingOrder,
      ongoingOrderChange: {
        percent: +calculateChange(current.ongoingOrder, last.ongoingOrder).toFixed(2),
        trend: getTrend(current.ongoingOrder, last.ongoingOrder)
      },
      // procurementQuantity: totalOrderPlace,
      // procurementChange: {
      //   percent: +orderChangePercent.toFixed(2),
      //   trend: trendOrder
      // },
      procurementQuantity: procurementQuantity,
      procurementChange: {
        percent: +calculateChange(procurementQuantity, 0).toFixed(2),
        trend: getTrend(procurementQuantity, 0)
      },
      quantityLifted: totalQty,
      quantityLiftedChange: {
        percent: +quantityChangePercent.toFixed(2),
        trend: trendLifted
      },
      warehouseStock: currentWarehouseStock,
      warehouseStockChange: {
        percent: +warehouseStockChangePercent.toFixed(2),
        trend: warehouseStockTrend
      },
      balanceLiftedQty: totalQty - currentMonth.completedQty,
      balanceLiftedQtyChange: {
        percent: +calculateChange(
          totalQty - currentMonth.completedQty,
          totalQty - lastMonth.completedQty
        ).toFixed(2),
        trend: getTrend(
          totalQty - currentMonth.completedQty,
          totalQty - lastMonth.completedQty
        )
      },
      qtyBalanceInStock: totalQty - currentWarehouseStock,
      qtyBalanceInStockChange: {
        percent: +calculateChange(
          totalQty - currentWarehouseStock,
          totalQty - lastWarehouseStock
        ).toFixed(2),
        trend: getTrend(
          totalQty - currentWarehouseStock,
          totalQty - lastWarehouseStock
        )
      }
    };

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: summary,
        message: _response_message.found("Order")
      })
    );

  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.monthlyLiftedTrends = asyncErrorHandler(async (req, res) => {
  try {
    const { state = '', commodity = '', cna = '' } = req.query;

    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];


    const monthlySummary = await BatchOrderProcess.aggregate([
      {
        $match: {
          source_by: { $in: finalCNA },
        }
      },
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

module.exports.stateWiseAnalysis = asyncErrorHandler(async (req, res) => {
  try {
    // 1. Distiller counts
    const { page = 1, limit, skip = 0, search = '', state = '', district = '', commodity = '', cna = '' } = req.query;

    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];

    const distillerState = Distiller.aggregate([
      {
        $match: {
          source_by: { $in: finalCNA },
          is_approved: _userStatus.approved,
        }
      },
      { $group: { _id: '$address.registered.state', distillerCount: { $sum: 1 } } }
    ]);

    // 2. Warehouse counts and requiredStock
    const warehouseState = wareHouseDetails.aggregate([
      {
        $match: {
          source_by: { $in: finalCNA },
          active: true
        }
      },
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
      {
        $match: {
          source_by: { $in: finalCNA }
        }
      },
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
    const totalDistillers = Distiller.countDocuments({ source_by: { $in: finalCNA }, is_approved: _userStatus.approved });
    const totalWarehouses = wareHouseDetails.countDocuments({ source_by: { $in: finalCNA }, active: true });

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

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: response,
      message: _response_message.found("State wise analysis"),
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.getMonthlyPayments = asyncErrorHandler(async (req, res) => {
  try {
    const { state = '', commodity = '', cna = '' } = req.query;

    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];

    const monthlyPayments = await PurchaseOrderModel.aggregate([
      {
        $match: {
          source_by: { $in: finalCNA },
        }
      },
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
    const { state = '', commodity = '', cna = '' } = req.query;

    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];

    const result = await PurchaseOrderModel.aggregate([
      {
        $match: {
          source_by: { $in: finalCNA }
        }
      },
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
      },
      {
        $limit: 5
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

module.exports.stateWiseProcurementQuantity = asyncErrorHandler(async (req, res) => {
  try {
    const { state = '', commodity = '', cna = '' } = req.query;

    const { sort = 'desc' } = req.query;

    const sortOrder = sort === 'asc' ? 1 : -1;

    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];

    const result = await BatchOrderProcess.aggregate([
      {
        $match: {
          source_by: { $in: finalCNA },
        }
      },
      {
        $lookup: {
          from: 'warehousedetails', // Make sure the collection name is correct in MongoDB
          localField: 'warehouseId',
          foreignField: '_id',
          as: 'warehouse',
        },
      },
      {
        $unwind: '$warehouse',
      },
      {
        $group: {
          _id: '$warehouse.addressDetails.state.state_name',
          quantityProcured: { $sum: '$quantityRequired' }
        },
      },
      {
        $sort: {
          quantityProcured: sortOrder,
        },
      },
      {
        $limit: 5
      }
    ]);

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: result,
        message: _response_message.found("State-wise procurement quantity")
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.stateWiseLiftingQuantity = asyncErrorHandler(async (req, res) => {
  try {
    const { state = '', commodity = '', cna = '' } = req.query;

    const { sort = 'desc' } = req.query;

    const sortOrder = sort === 'asc' ? 1 : -1;


    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];

    const result = await BatchOrderProcess.aggregate([
      {
        $match: {
          source_by: { $in: finalCNA }
        }
      },
      {
        $lookup: {
          from: 'warehousedetails', // Make sure the collection name is correct in MongoDB
          localField: 'warehouseId',
          foreignField: '_id',
          as: 'warehouse',
        },
      },
      {
        $unwind: '$warehouse',
      },
      {
        $group: {
          _id: '$warehouse.addressDetails.state.state_name',
          liftingQuantity: { $sum: '$quantityRequired' }
        },
      },
      {
        $sort: {
          liftingQuantity: sortOrder,
        },
      },
      {
        $limit: 5
      }
    ]);

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: result,
        message: _response_message.found("State-wise lifting quantity")
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.paymentWithTenPercant = asyncErrorHandler(async (req, res) => {
  try {
    const { page = 1, limit, skip = 0, sortBy = "createdAt", search = '', state = '', commodity = '', cna = '' } = req.query;


    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];

    const pipeline = [
      {
        $match: {
          "paymentInfo.token": { $in: [10] },
          deletedAt: null,
          source_by: { $in: finalCNA }
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
    const { page = 1, limit, skip = 0, sortBy = "createdAt", search = '', state = '', commodity = '', cna = '' } = req.query;

    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];

    const pipeline = [
      {
        $match: {
          "paymentInfo.token": { $in: [100] },
          deletedAt: null,
          source_by: { $in: finalCNA }
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

module.exports.warehouseList = asyncErrorHandler(async (req, res) => {
  try {
    const { page = 1, limit = 5, skip = 0, search = '', state = '', district = '', commodity = '', cna = '' } = req.query;

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

    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];

    const commodityNames = typeof commodity === 'string' && commodity.length > 0 ? commodity.split(',').map(name => name.trim()) : [];

    const states = typeof state === 'string' && state.length > 0 ? state.split(',').map(s => s.trim()) : [];

    const districts = typeof district === 'string' && district.length > 0 ? district.split(',').map(d => d.trim()) : [];

    const aggregationPipeline = [
      {
        $match: {
          warehouseId: { $ne: null },
          source_by: { $in: finalCNA },
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
      ...(states.length > 0
        ? [{
          $match: {
            'warehouse.addressDetails.state.state_name': { $in: states }
          }
        }]
        : []),
      ...(districts.length > 0
        ? [{
          $match: {
            'warehouse.addressDetails.district.district_name': { $in: districts }
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
    const { page = 1, limit, skip = 0, search = '', state = '', district = '', commodity = '', cna = '' } = req.query;

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

    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];

    const commodityNames = typeof commodity === 'string' && commodity.length > 0 ? commodity.split(',').map(name => name.trim()) : [];

    const states = typeof state === 'string' && state.length > 0 ? state.split(',').map(s => s.trim()) : [];

    const districts = typeof district === 'string' && district.length > 0 ? district.split(',').map(d => d.trim()) : [];

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
            'distillers.address.registered.state': { $in: states }
          }
        }]
        : []),
      ...(districts.length > 0
        ? [{
          $match: {
            'distillers.address.registered.district': { $in: districts }
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
          source_by: { $in: finalCNA },
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
    const { page = 1, limit, skip = 0, search = '', state = '', district = '', commodity = '', cna = '' } = req.query;

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

    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];

    const commodityNames = typeof commodity === 'string' && commodity.length > 0 ? commodity.split(',').map(name => name.trim()) : [];

    const states = typeof state === 'string' && state.length > 0 ? state.split(',').map(s => s.trim()) : [];

    const districts = typeof district === 'string' && district.length > 0 ? district.split(',').map(d => d.trim()) : [];

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
      ...(states.length > 0
        ? [{
          $match: {
            'distillers.address.registered.state': { $in: states }
          }
        }]
        : []),
      ...(districts.length > 0
        ? [{
          $match: {
            'distillers.address.registered.district': { $in: districts }
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
          source_by: { $in: finalCNA },
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

module.exports.getStateWiseProjection = asyncErrorHandler(async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = '',
      state = '',
      district = '',
      cna = '',
      isExport = 0,
      startDate = '',
      endDate = ''
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { state: 1 };

    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];

    const commodityNames = typeof commodity === 'string' && commodity.length > 0
      ? commodity.split(',').map(name => name.trim())
      : [];

    const states = typeof state === 'string' && state.length > 0
      ? state.split(',').map(s => s.trim())
      : [];

    const districts = typeof district === 'string' && district.length > 0
      ? district.split(',').map(d => d.trim())
      : [];

    const query = {};
    query.source_by = { $in: finalCNA };

    if (search) {
      query.$or = [
        { state: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } },
        { center_location: { $regex: search, $options: 'i' } },
      ];
    }

    if (states.length > 0) {
      query.state = { $in: states };
    }

    if (districts.length > 0) {
      query.district = { $in: districts };
    }

    // Add date range filter
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
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
          fileName: `State-Wise-Projections-${new Date().toISOString().split('T')[0]}.xlsx`,
          worksheetName: "State Wise Projections",
        });
      } else {
        return res.status(200).json({
          status: 400,
          message: "No Center Projection data found to export.",
          data: [],
        });
      }
    }

    const [total, data, lastUpdatedDoc] = await Promise.all([
      CenterProjection.countDocuments(query),
      CenterProjection.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      CenterProjection.findOne(query).sort({ updatedAt: -1 }).select('updatedAt')
    ]);

    const lastUpdatedAt = lastUpdatedDoc?.updatedAt || null;

    const pages = limit != 0 ? Math.ceil(total / limit) : 0;

    return res.status(200).json({
      status: 200,
      data,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages,
      lastUpdatedAt,
      message: "Center Projections fetched successfully"
    });

  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: "Error fetching center projections",
      error: error.message
    });
  }
});

module.exports.performanceByDistiller = asyncErrorHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', state = '', district = '', commodity = '', cna = '' } = req.query;

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

    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];

    const commodityNames = typeof commodity === 'string' && commodity.length > 0 ? commodity.split(',').map(name => name.trim()) : [];

    const states = typeof state === 'string' && state.length > 0 ? state.split(',').map(s => s.trim()) : [];

    const districts = typeof district === 'string' && district.length > 0 ? district.split(',').map(d => d.trim()) : [];

    const matchStage = {
      "paymentInfo.token": { $in: [10, 100] },
      "paymentInfo.advancePaymentStatus": _poAdvancePaymentStatus.paid,
      source_by: { $in: finalCNA },
      deletedAt: null,
    };


    if (commodityNames.length > 0) {
      matchStage["product.name"] = { $in: commodityNames };
    }

    const distillerMatchStage = {};
    if (states.length > 0) {
      console.log(states);
      distillerMatchStage["distiller.address.registered.state"] = { $in: states };
    }
    if (districts.length > 0) {
      distillerMatchStage["distiller.address.registered.district"] = { $in: districts };
    }
    if (search) {
      distillerMatchStage["distiller.basic_details.distiller_details.organization_name"] = {
        $regex: search,
        $options: "i"
      };
    }

    const aggregationPipeline = [
      // Filter for tokens 10 or 100
      { $match: matchStage },
      // Lookup Distiller
      {
        $lookup: {
          from: "distillers", // your collection name
          localField: "distiller_id",
          foreignField: "_id",
          as: "distiller"
        }
      },
      { $unwind: "$distiller" },
      // Apply distiller filters
      { $match: distillerMatchStage },
      // Lookup BatchOrderProcess to calculate date gap
      {
        $lookup: {
          from: "batchorderprocesses", // your collection name
          localField: "_id",
          foreignField: "orderId",
          as: "batches"
        }
      },
      {
        $addFields: {
          avgPickupGap: {
            $avg: {
              $map: {
                input: {
                  $filter: {
                    input: "$batches",
                    as: "batch",
                    cond: { $eq: ["$$batch.pickupStatus", "completed"] }
                  }
                },
                as: "completedBatch",
                in: {
                  $divide: [
                    {
                      $subtract: [
                        "$$completedBatch.actualPickupDate",
                        "$createdAt"
                      ]
                    },
                    1000 * 60 * 60 * 24 // convert ms to days
                  ]
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: "$distiller._id",
          distillerName: { $first: "$distiller.basic_details.distiller_details.organization_name" },
          distillerState: { $first: "$distiller.address.registered.state" },
          qtyToken10: {
            $sum: {
              $cond: [{ $eq: ["$paymentInfo.token", 10] }, "$purchasedOrder.poQuantity", 0]
            }
          },
          qtyToken100: {
            $sum: {
              $cond: [{ $eq: ["$paymentInfo.token", 100] }, "$purchasedOrder.poQuantity", 0]
            }
          },
          averagePickupGapInDays: { $avg: "$avgPickupGap" }
        }
      },
      {
        $project: {
          _id: 0,
          distillerName: 1,
          distillerState: 1,
          qtyToken10: 1,
          qtyToken100: 1,
          averagePickupGapInDays: {
            $round: ["$averagePickupGapInDays", 2]
          }
        }
      }
    ]
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    // const result = await PurchaseOrderModel.aggregate();
    // return res.status(200).json(new serviceResponse({ status: 200, data: result }));


    // Add pagination using $facet
    const finalResult = await PurchaseOrderModel.aggregate([
      {
        $facet: {
          paginatedData: [
            ...aggregationPipeline,
            { $skip: skip },
            { $limit: pageSize }
          ],
          totalCount: [
            ...aggregationPipeline,
            { $count: "count" }
          ]
        }
      }
    ]);

    const rows = finalResult[0].paginatedData;
    const count = finalResult[0].totalCount[0]?.count || 0;
    const pages = Math.ceil(count / pageSize);

    return res.status(200).json(
      new serviceResponse({
        status: 200,
        data: {
          count,
          rows,
          pages,
          page: pageNumber,
          limit: pageSize
        }
      })
    );

  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: "Error fetching center projections",
      error: error.message
    });
  }
});