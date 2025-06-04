const {
  _handleCatchErrors,
  dumpJSONToExcel,
  generateFileName,
} = require("@src/v1/utils/helpers");
const {
  serviceResponse,
  sendResponse,
} = require("@src/v1/utils/helpers/api_response");
const {
  _query,
  _response_message,
} = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const {
  _userType,
  _paymentstatus,
  _batchStatus,
  _associateOfferStatus,
  _paymentApproval,
  received_qc_status,
} = require("@src/v1/utils/constants");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
// const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
// const { AgentPayment } = require("@src/v1/models/app/procurement/AgentPayment");
// const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const {
  AssociateOffers,
} = require("@src/v1/models/app/procurement/AssociateOffers");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const {
  ProcurementCenter,
} = require("@src/v1/models/app/procurement/ProcurementCenter");
const { AgentInvoice } = require("@src/v1/models/app/payment/agentInvoice");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const xlsx = require("xlsx");
const fs = require("fs/promises");
const fs2 = require("fs");
const FormData = require("form-data");
const { default: axios } = require("axios");
const {
  AgentPaymentFile,
} = require("@src/v1/models/app/payment/agentPaymentFile");
const { default: mongoose } = require("mongoose");
const {
  FarmerPaymentFile,
} = require("@src/v1/models/app/payment/farmerPaymentFile");
const { listenerCount } = require("@src/v1/models/app/auth/OTP");
const path = require("path");
const { smsService } = require("@src/v1/utils/third_party/SMSservices");
const OTPModel = require("../../../models/app/auth/OTP");
const PaymentLogsHistory = require("@src/v1/models/app/procurement/PaymentLogsHistory");
const { getCache, setCache } = require("@src/v1/utils/cache");
const {
  AssociateInvoice,
} = require("@src/v1/models/app/payment/associateInvoice");
const { Scheme } = require("@src/v1/models/master/Scheme");
const { Commodity } = require("@src/v1/models/master/Commodity");
const SLAManagement = require("@src/v1/models/app/auth/SLAManagement");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");


module.exports.getMandiProcurement = asyncErrorHandler(async (req, res) => {
  const { portalId } = req; 
  let page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  let skip = (page - 1) * limit;
  const isExport = parseInt(req.query.isExport) === 1;
  const centerNames = req.query.search?.trim();

  const searchStates = req.query.stateNames
    ? Array.isArray(req.query.stateNames)
      ? req.query.stateNames
      : req.query.stateNames.split(',').map(s => s.trim())
    : null;
  const paymentQuery = { ho_id: portalId };
  const payments = await Payment.find(paymentQuery, { batch_id: 1}).lean();
  const batchIdSet = [...new Set(payments.map(p => String(p.batch_id)).filter(Boolean))];

  const pipeline = [
    {
      $match: {
        _id: { $in: batchIdSet.map(id => new mongoose.Types.ObjectId(id)) },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "seller_id",
        foreignField: "_id",
        as: "seller",
      },
    },
    { $unwind: "$seller" },
    {
      $lookup: {
        from: "procurementcenters",
        localField: "procurementCenter_id",
        foreignField: "_id",
        as: "center",
      },
    },
    { $unwind: "$center" },
    {
      $lookup: {
        from: "associateoffers",
        localField: "seller_id",
        foreignField: "seller_id",
        as: "associateOffer",
      },
    },
    {
      $unwind: {
        path: "$associateOffer",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "requests",
        localField: "req_id",
        foreignField: "_id",
        as: "relatedRequest",
      },
    },
    {
      $unwind: {
        path: "$relatedRequest",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
  $lookup: {
    from: "branches", 
    localField: "relatedRequest.branch_id",
    foreignField: "_id",
    as: "branch",
  },
},
{
  $unwind: {
    path: "$branch",
    preserveNullAndEmptyArrays: true,
  },
},
    {
      $addFields: {
        liftedDataDays: {
          $cond: [
            { $and: ["$createdAt", "$relatedRequest.createdAt"] },
            {
              $dateDiff: {
                startDate: "$relatedRequest.createdAt",
                endDate: "$createdAt",
                unit: "day",
              },
            },
            null,
          ],
        },
        purchaseDays: {
          $cond: [
            { $and: ["$updatedAt", "$relatedRequest.createdAt"] },
            {
              $dateDiff: {
                startDate: "$relatedRequest.createdAt",
                endDate: "$updatedAt",
                unit: "day",
              },
            },
            null,
          ],
        },
      },
    },
    {
      $group: {
        _id: "$procurementCenter_id",
        centerName: { $first: "$center.center_name" },
        Status: { $first: "$center.active" },
        centerId: { $first: "$center._id" },
        district: { $first: "$seller.address.registered.district" },
        state: { $first: "$seller.address.registered.state" },
        branchName: { $first: "$branch.branchName" }, 
        associate_name: {
          $first: "$seller.basic_details.associate_details.associate_name",
        },
        liftedQty: { $sum: "$qty" },
        offeredQty: { $first: { $ifNull: ["$associateOffer.offeredQty", 0] } },
        liftedDataDays: { $first: "$liftedDataDays" },
        purchaseDays: { $first: "$purchaseDays" },
        productName: { $first: "$relatedRequest.product.name" },
      },
    },
    {
      $addFields: {
        balanceMandi: { $subtract: ["$offeredQty", "$liftedQty"] },
        liftingPercentage: {
          $cond: {
            if: { $gt: ["$offeredQty", 0] },
            then: {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$liftedQty", "$offeredQty"] },
                    100,
                  ],
                },
                2,
              ],
            },
            else: 0,
          },
        },
      },
    },
  ];

  if (searchStates) {
    pipeline.push({
      $match: {
        state: { $in: searchStates },
      },
    });
  }

  if (centerNames?.length) {
    pipeline.push({
      $match: {
        centerName: { $regex: centerNames, $options: "i" },
      },
    });
    page = 1;
    skip = 0;
  }

  pipeline.push({ $sort: { centerName: 1 } });
  const aggregated = await Batch.aggregate(pipeline);


  if (isExport) {
    const exportRows = aggregated.map(item => ({
      "Center Name": item?.centerName || "NA",
      "District": item?.district || "NA",
      "State": item?.state || "NA",
      "Associate Name": item?.associate_name || "NA",
      "Branch Name": item?.branchName || "NA",
      "Product Name": item?.productName || "NA",
      "Offered Qty": item?.offeredQty || 0,
      "Lifted Qty": item?.liftedQty || 0,
      "Balance Qty": item?.balanceMandi || 0,
      "Lifting %": (item?.liftingPercentage ?? 0) + "%",
      "Lifted Days": item?.liftedDataDays ?? "NA",
      "Purchase Days": item?.purchaseDays ?? "NA",
      "Status": item?.Status ? "Active" : "Inactive",
    }));

    if (exportRows.length > 0) {
      return dumpJSONToExcel(req, res, {
        data: exportRows,
        fileName: "MandiWiseProcurementData.xlsx",
        worksheetName: "Mandi Data",
      });
    } else {
      return res.status(404).json(
        new serviceResponse({
          status: 404,
          message: _response_message.notFound("Mandi Procurement Not Found"),
        })
      );
    }
  }

  const totalRecords = aggregated.length;
  const totalPages = Math.ceil(totalRecords / limit);
  const paginatedData = aggregated.slice(skip, skip + limit);

  return res.status(200).json(
    new serviceResponse({
      status: 200,
      data: {
        page,
        limit,
        totalPages,
        totalRecords,
        data: paginatedData,
        message: _response_message.found("Mandi Procurement Data Fetched"),
      },
    })
  );
});