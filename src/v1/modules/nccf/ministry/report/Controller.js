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


module.exports.summary = asyncErrorHandler(async (req, res) => {
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
        $lookup: {
          from: "batchorderprocesses",
          let: { orderId: "$orderId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$orderId", "$$orderId"] }, status: "Accepted" } },
            {
              $lookup: {
                from: "warehousedetails",
                localField: "warehouseId",
                foreignField: "_id",
                as: "warehouse"
              }
            },
            { $unwind: { path: "$warehouse", preserveNullAndEmptyArrays: true } },
          ],
          as: "acceptedBatches"
        }
      },
      {
        $addFields: {
          liftedQuantity: { $sum: "$acceptedBatches.quantityRequired" },
          balanceQuantity: {
            $subtract: [
              "$purchasedOrder.poQuantity",
              { $sum: "$acceptedBatches.quantityRequired" }
            ]
          },
          warehouse: { $first: "$acceptedBatches.warehouse.basicDetails.warehouseName" },
          warehouseAddress: { $first: "$acceptedBatches.warehouse.address" }
        }
      },
      {
        $project: {
          _id: 0,
          orderId: "$purchasedOrder.poNo",
          distillerName: "$distillers.basic_details.distiller_details.organization_name",
          address: "$distillers.address.registered",
          bankDetails: "$distillers.bank_details",
          poDate: '$createdAt',
          poToken: "$paymentInfo.token",
          mandiTax: "$paymentInfo.mandiTax",
          commodity: "$product.name",
          poQuantity: "$purchasedOrder.poQuantity",
          poAmount: "$paymentInfo.totalAmount",
          liftedDate: "$batchorderprocesses.updatedAt",
          projectProcurement: "",
          liftedQuantity: 1,
          balanceQuantity: 1,
          warehouse: 1,
          warehouseAddress: 1,
          paymentDebited: "$paymentInfo.paidAmount",
          remainingAmount: "$paymentInfo.balancePayment",
          state: "$distillers.address.registered.state",
          district: "$distillers.address.registered.district",
          state: "$poStatus"
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

module.exports.omcReport = asyncErrorHandler(async (req, res) => {
  try {
    
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      search = '',
      state = '',
      startDate = '',
      endDate = '',
      cna = 'NCCF',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = new RegExp(search, 'i');

    const matchConditions = {};

    if (state) {
      matchConditions['distiller.address.registered.state'] = state;
    }

    if (search) {
      matchConditions['distiller.basic_details.distiller_details.organization_name'] = searchRegex;
    }

    if (startDate && endDate) {
      matchConditions['createdAt'] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const basePipeline = [
      {
        $lookup: {
          from: 'distillers',
          localField: 'distiller_id',
          foreignField: '_id',
          as: 'distiller',
        },
      },
      { $unwind: '$distiller' },
      { $match: matchConditions },
      {
        $lookup: {
          from: 'batchorderprocesses',
          localField: 'orderId',
          foreignField: '_id',
          as: 'batchorderprocesses',
        },
      },
      {
        $group: {
          _id: {
            distillerId: '$distiller._id',
            state: '$distiller.address.registered.state',
            distillerName: '$distiller.basic_details.distiller_details.organization_name',
          },
          poQuantity: { $sum: '$purchasedOrder.poQuantity' },
          poDate: { $first: '$createdAt' },
          deliveryScheduleDate: { $first: { $arrayElemAt: ['$batchorderprocesses.scheduledPickupDate', 0] } },
        },
      },
      {
        $lookup: {
          from: 'requests',
          pipeline: [
            {
              $match: {
                'product.name': { $regex: /maize/i }
              }
            },
            {
              $project: {
                _id: 1,
                quantity: '$product.quantity',
              }
            }
          ],
          as: 'maizeRequests'
        }
      },
      {
        $lookup: {
          from: 'payments',
          let: { maizeReqIds: '$maizeRequests._id' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$req_id', '$$maizeReqIds'] }
              }
            }
          ],
          as: 'paymentsForMaize'
        }
      },
      {
        $addFields: {
          maizeRequirement: 2000,
          thirtyPercentMonthlyRequirement: {
            $round: [{ $multiply: [2000, 0.3] }, 2]
          },
          maizeProcurement: {
            $sum: '$maizeRequests.quantity'
          },
          procurementDoneFromFarmer: {
            $sum: '$maizeRequests.quantity'
          },
          noOfFarmerBeficated: {
            $size: '$paymentsForMaize'
          },
          cna: cna
        }
      },
      {
        $project: {
          _id: 0,
          distillerId: '$_id.distillerId',
          state: '$_id.state',
          distillerName: '$_id.distillerName',
          poQuantity: 1,
          maizeRequirement: 1,
          thirtyPercentMonthlyRequirement: 1,
          cna: 1,
          poDate: 1,
          deliveryScheduleDate: 1,
          maizeProcurement: 1,
          procurementDoneFromFarmer: 1,
          noOfFarmerBeficated: 1,
        }
      }
    ];

    // Count before pagination
    const countPipeline = [...basePipeline, { $count: 'count' }];

    // Total sum of poQuantity
    const totalAmountPipeline = [
      ...basePipeline,
      {
        $group: {
          _id: null,
          totalPoQuantity: { $sum: '$totalPoQuantity' }
        }
      }
    ];

    // Paginate
    const paginatedPipeline = [...basePipeline, { $skip: skip }, { $limit: parseInt(limit) }];

    const [rows, countRes, totalRes] = await Promise.all([
      PurchaseOrderModel.aggregate(paginatedPipeline),
      PurchaseOrderModel.aggregate(countPipeline),
      PurchaseOrderModel.aggregate(totalAmountPipeline),
    ]);

    const result = {
      rows,
      count: countRes[0]?.count || 0,
      totalPoAmount: totalRes[0]?.totalPoAmount || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: limit != 0 ? Math.ceil((countRes[0]?.count || 0) / limit) : 0
    };

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: result,
      message: _response_message.found("OMC Report"),
    }));
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});