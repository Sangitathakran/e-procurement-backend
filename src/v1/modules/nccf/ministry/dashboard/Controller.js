const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, } = require("@src/v1/utils/constants/messages");
const { decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType, _poAdvancePaymentStatus, _userStatus } = require("@src/v1/utils/constants");
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
    const { user_id } = req;
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

    return res.status(200).json({
      status: true,
      message: "Monthly Lifted summary fetched successfully",
      data: monthlySummary
    });
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.getMonthlyPayments = asyncErrorHandler(async (req, res) => {
  try {
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

    return res.status(200).json({
      status: true,
      message: "Monthly payments fetched successfully",
      data: monthlyPayments
    });
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.stateWiseQuantity = asyncErrorHandler(async (req, res) => {
  try {
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