const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
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
    const { page = 1, limit, skip = 0, sortBy = "createdAt", search = '', state = '', district = '', commodity = '', cna = '', startDate = '',
      endDate = '', isExport = 0 } = req.query;

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

    const commodityNames = typeof commodity === 'string' && commodity.length > 0
      ? commodity.split(',').map(name => name.trim())
      : [];

    const states = typeof state === 'string' && state.length > 0
      ? state.split(',').map(s => s.trim())
      : [];

    const districts = typeof district === 'string' && district.length > 0
      ? district.split(',').map(d => d.trim())
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
      ...(startDate && endDate
        ? [{
          $match: {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
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
          liftedDate: { $first: "$batchorderprocesses.updatedAt" },
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
          cna: "$source_by",
          distillerName: "$distillers.basic_details.distiller_details.organization_name",
          address: "$distillers.address.registered",
          bankDetails: "$distillers.bank_details",
          orderId: "$purchasedOrder.poNo",
          poDate: '$createdAt',
          poToken: "$paymentInfo.token",
          mandiTax: "$paymentInfo.mandiTax",
          commodity: "$product.name",
          poQuantity: "$purchasedOrder.poQuantity",
          poAmount: "$paymentInfo.totalAmount",
          projectProcurement: "",
          liftedQuantity: 1,
          liftedDate: 1,
          balanceQuantity: 1,
          warehouse: 1,
          warehouseAddress: 1,
          paymentDebited: "$paymentInfo.paidAmount",
          remainingAmount: "$paymentInfo.balancePayment",
          state: "$distillers.address.registered.state",
          district: "$distillers.address.registered.district",
          remarks: "$poStatus",
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ];

    const withoutPaginationPipeline = [...pipeline];

    // Pagination
    // pipeline.push(
    //   { $skip: parseInt(skip) },
    //   { $limit: parseInt(limit) }
    // );

    if (parseInt(isExport) !== 1) {
      pipeline.push(
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) }
      );
    }

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

    // return res.status(200).send(new serviceResponse({
    //   status: 200,
    //   data: result,
    //   message: _response_message.found("Order Summary"),
    // }));

    if (isExport == 1) {
      const exportData = result.rows.map(item => ({
        "CNA": item.cna,
        "Distiller name": item.distillerName,
        "Address - Line 1": item.address?.line1 || "",
        "Address - Line 2": item.address?.line2 || "",
        "Village": item.address?.village || "",
        "Taluka": item.address?.taluka || "",
        "District": item.address?.district || "",
        "State": item.address?.state || "",
        "Pincode": item.address?.pinCode || "",
        "Bank Name": item.bankDetails?.bank_name || "",
        "Branch Name": item.bankDetails?.branch_name || "",
        "Account Holder": item.bankDetails?.account_holder_name || "",
        "Account Number": item.bankDetails?.account_number || "",
        "IFSC Code": item.bankDetails?.ifsc_code || "",
        "PO Date": item.poDate,
        "PO (%)": item.poToken,
        "Mandi Tax": item.mandiTax,
        "Commodity": item.commodity,
        "PO Quantity": item.poQuantity,
        "PO Amount": item.poAmount,
        "Project Procurement": item.projectProcurement,
        "Lifted Quantity": item.liftedQuantity,
        "Lifted Date": item.liftedDate,
        "Remaining Quantity": item.remainingQuantity,
        "Warehouse": item.warehouse,
        "Warehouse Address": item.warehouseAddress,
        "Payment Debited": item.paymentDebited,
        "Remaining Amount": item.remainingAmount,
        "Remarks": item.remarks,

      }));


      if (exportData.length > 0) {
        return dumpJSONToExcel(req, res, {
          data: exportData,
          fileName: `Order-summary.xlsx`,
          worksheetName: `Order-summary`
        });
      } else {
        return res.status(404).send(new serviceResponse({
          status: 404,
          message: _response_message.notFound("Order summary"),
        }));
      }

    } else {
      return res.status(200).send(new serviceResponse({
        status: 200,
        data: result,
        message: _response_message.found("Order Summary"),
      }));
    }

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
      cna = '',
      isExport = 0
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = new RegExp(search, 'i');

    const matchConditions = {};

    const finalCNA = cna
      ? Array.isArray(cna)
        ? cna
        : cna.split(',').map(str => str.trim())
      : ['NCCF'];

    matchConditions.source_by = { $in: finalCNA };
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

      // Fetch maize POs of the same distiller
      {
        $lookup: {
          from: 'purchaseorders',
          let: { distillerId: '$_id.distillerId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$distiller_id', '$$distillerId'] },
                    { $regexMatch: { input: '$product.name', regex: /maize/i } }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                totalMaizeRequirement: { $sum: '$purchasedOrder.poQuantity' }
              }
            }
          ],
          as: 'maizePOs'
        }
      },

      // Fetch maize Procurement of the same state
      // {
      //   $lookup: {
      //     from: 'requests',
      //     pipeline: [
      //       {
      //         $match: {
      //           'product.name': { $regex: /maize/i }
      //         }
      //       },
      //       {
      //         $project: {
      //           _id: 1,
      //           quantity: '$product.quantity',
      //         }
      //       }
      //     ],
      //     as: 'maizeRequests'
      //   }
      // },
      {
        $lookup: {
          from: 'requests',
          let: { distillerState: '$_id.state' },
          pipeline: [
            {
              $lookup: {
                from: 'branches',
                localField: 'branch_id',
                foreignField: '_id',
                as: 'branchOffice'
              }
            },
            { $unwind: '$branchOffice' },
            {
              $match: {
                $expr: {
                  $and: [
                    { $regexMatch: { input: '$product.name', regex: /maize/i } },
                    { $eq: ['$branchOffice.state', '$$distillerState'] }
                  ]
                }
              }
            },
            {
              $project: {
                _id: 1,
                quantity: '$product.quantity'
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
          maizeRequirement: {
            $ifNull: [{ $arrayElemAt: ['$maizePOs.totalMaizeRequirement', 0] }, 0]
          },
          thirtyPercentMonthlyRequirement: {
            $round: [{
              $multiply: [
                { $ifNull: [{ $arrayElemAt: ['$maizePOs.totalMaizeRequirement', 0] }, 0] },
                0.3
              ]
            }, 2]
          },
          maizeProcurement: {
            $sum: '$maizeRequests.quantity'
          },
          procurementDoneFromFarmer: {
            $sum: {
              $map: {
                input: '$paymentsForMaize',
                as: 'p',
                in: {
                  $convert: {
                    input: '$$p.qtyProcured',
                    to: 'double',
                    onError: 0,
                    onNull: 0
                  }
                }
              }
            }
          },
          noOfFarmerBenefited: {
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
          noOfFarmerBenefited: 1,
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
          totalPoAmount: { $sum: '$poQuantity' }
        }
      }
    ];

    // const paginatedPipeline = [...basePipeline, { $skip: skip }, { $limit: parseInt(limit) }];

    const paginatedPipeline = [...basePipeline];
    if (parseInt(isExport) !== 1) {
      paginatedPipeline.push(
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) }
      );
    }

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

    // return res.status(200).send(new serviceResponse({
    //   status: 200,
    //   data: result,
    //   message: _response_message.found("OMC Report"),
    // }));

    if (isExport == 1) {
      const exportData = result.rows.map(item => ({
        "CNA": item.cna,
        "State": item.state,
        "Distiller under OMC contract": item.distillerName || "",
        "Maize Requirement (MT)": item.maizeRequirement || "",
        "30% of Monthly Requirement (MT)": item.thirtyPercentMonthlyRequirement || "",
        "Delivery Schedule Date": item.deliveryScheduleDate || "",
        "Maize Procurement (MT)": item.maizeProcurement || "",
        "Procurement done from farmer": item.procurementDoneFromFarmer || "",
        "No. of farmers benefitted": item.noOfFarmerBenefited || "",
      }));


      if (exportData.length > 0) {
        return dumpJSONToExcel(req, res, {
          data: exportData,
          fileName: `OMC-Report.xlsx`,
          worksheetName: `OMC-Report`
        });
      } else {
        return res.status(404).send(new serviceResponse({
          status: 404,
          message: _response_message.notFound("OMC Report"),
        }));
      }

    } else {
      return res.status(200).send(new serviceResponse({
        status: 200,
        data: result,
        message: _response_message.found("OMC Report"),
      }));
    }


  } catch (error) {
    _handleCatchErrors(error, res);
  }
});
