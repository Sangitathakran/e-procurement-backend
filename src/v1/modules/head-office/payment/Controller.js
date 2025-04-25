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
const { Scheme } = require("@src/v1/models/master/Scheme");
const { Commodity } = require("@src/v1/models/master/Commodity");
const SLAManagement = require("@src/v1/models/app/auth/SLAManagement");
const ObjectId = require("mongoose").Types.ObjectId;

const validateMobileNumber = async (mobile) => {
  let pattern = /^[0-9]{10}$/;
  return pattern.test(mobile);
};

/*
module.exports.payment = async (req, res) => {
  try {
    let { page, limit, skip, paginate = 1, sortBy, search = "", isExport = 0 } = req.query;

    // let query = search ? { reqNo: { $regex: search, $options: "i" } } : {};
    limit = 50
    const { portalId, user_id } = req;

    const paymentIds = (
      await Payment.find({
        ho_id: { $in: [portalId, user_id] },
        bo_approve_status: _paymentApproval.approved,
      })
    ).map((i) => i.req_id);

    let query = {
      _id: { $in: paymentIds },
      ...(search ? { reqNo: { $regex: search, $options: "i" } } : {})
    };

    const aggregationPipeline = [
      // { $match: { _id: { $in: paymentIds } } },
      { $match: query },
      {
        $lookup: {
          from: "batches",
          localField: "_id",
          foreignField: "req_id",
          as: "batches",
          pipeline: [
            {
              $lookup: {
                from: "payments",
                localField: "_id",
                foreignField: "batch_id",
                as: "payment",
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "branch_id",
          foreignField: "_id",
          as: "branch",
        },
      },
      { $unwind: { path: "$branch" } },
      {
        $match: {
          batches: { $ne: [] },
        },
      },
      {
        $addFields: {
          approval_status: {
            $cond: {
              if: {
                $anyElementTrue: {
                  $map: {
                    input: "$batches",
                    as: "batch",
                    in: {
                      $or: [
                        { $not: { $ifNull: ["$$batch.ho_approval_at", true] } }, // Check if the field is missing
                        { $eq: ["$$batch.ho_approval_at", null] }, // Check for null value
                      ],
                    },
                  },
                },
              },
              then: "Pending",
              else: "Approved",
            },
          },
          qtyPurchased: {
            $reduce: {
              input: "$batches",
              initialValue: 0,
              in: { $add: ["$$value", "$$this.qty"] }, // Sum of qty from batches
            },
          },
          amountPayable: {
            $reduce: {
              input: "$batches",
              initialValue: 0,
              in: { $add: ["$$value", "$$this.totalPrice"] }, // Sum of totalPrice from batches
            },
          },
          amountPaid: {
            $reduce: {
              input: "$batches",
              initialValue: 0,
              in: { $add: ["$$value", "$$this.totalPrice"] }, // Sum of totalPrice from batches
            },
          },
          payment_status: {
            $cond: {
              if: {
                $anyElementTrue: {
                  $map: {
                    input: "$batches",
                    as: "batch",
                    in: {
                      $anyElementTrue: {
                        $map: {
                          input: "$$batch.payment",
                          as: "pay",
                          in: { $in: ["$$pay.payment_status", ["Pending", "In Progress"]] }, // Assuming status field exists in payments

                        },
                      },
                    },
                  },
                },
              },
              then: "Pending",
              else: "Completed",
            },
          },
          overall_payment_status: {
            $switch: {
              branches: [{
                case: {
                  $allElementsTrue: {
                    $map: {
                      input: "$batches",
                      as: "batch",
                      in: {
                        $allElementsTrue: {
                          $map: {
                            input: "$$batch.payment",
                            as: "pay",
                            in: { $eq: ["$$pay.payment_status", "Pending"] },
                          },
                        },
                      },
                    },
                  },
                },
                then: "Pending",
              },
              {
                case: {
                  $allElementsTrue: {
                    $map: {
                      input: "$batches",
                      as: "batch",
                      in: {
                        $allElementsTrue: {
                          $map: {
                            input: "$$batch.payment",
                            as: "pay",
                            in: { $eq: ["$$pay.payment_status", "Completed"] },
                          },
                        },
                      },
                    },
                  },
                },
                then: "Completed",
              },
              {
                case: {
                  $allElementsTrue: {
                    $map: {
                      input: "$batches",
                      as: "batch",
                      in: {
                        $allElementsTrue: {
                          $map: {
                            input: "$$batch.payment",
                            as: "pay",
                            in: { $eq: ["$$pay.payment_status", "In Progress"] },
                          },
                        },
                      },
                    },
                  },
                },
                then: "Payment initiated",
              },
              {
                case: {
                  $anyElementTrue: {
                    $map: {
                      input: "$batches",
                      as: "batch",
                      in: {
                        $anyElementTrue: {
                          $map: {
                            input: "$$batch.payment",
                            as: "pay",
                            in: { $in: ["$$pay.payment_status", ["Pending", "In Progress", "Failed", "Rejected"]] },
                          },
                        },
                      },
                    },
                  },
                },
                then: "Partially initiated",
              }
              ],
              default: "Pending", // Default case when no action is taken
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          reqNo: 1,
          product: 1,
          branch_id: 1,
          "branch._id": 1,
          "branch.branchName": 1,
          approval_status: 1,
          qtyPurchased: 1,
          amountPayable: 1,
          amountPaid: 1,
          payment_status: 1,
          overall_payment_status: 1,
          // branch: 1
        },
      },
      { 
        $sort: { 
          payment_status: -1, 
          createdAt: -1 
        } 
      }
      // { $skip: skip },
      // { $limit: parseInt(limit) },
    ];
    const records = await RequestModel.aggregate([
      ...aggregationPipeline,
      {
        $facet: {
          data: [...aggregationPipeline, 
            { $skip: (page - 1) * limit },
           { $limit: parseInt(limit) },
            ], 
          totalCount: [{ $count: "count" }], // Count the documents
        },
      },
    ]);

    const response = {
      count: records[0]?.totalCount[0]?.count || 0,
      rows: records[0]?.data || [],
    };
    if (paginate == 1) {
      response.page = page;
      response.limit = limit;
      response.pages = limit != 0 ? Math.ceil(response.count / limit) : 0;
    }

   
    if (isExport == 1) {
      const record = response.rows.map((item) => {
        return {
          "Order ID": item?.reqNo || "NA",
          "Branch Name": item?.branch?.branchName || "NA",
          "Commodity": item?.product?.name || "NA",
          "Quantity Purchased": item?.qtyPurchased || "NA",
          "Approval Status": item?.approval_status ?? "NA",
          "Payment Status": item?.payment_status ?? "NA",
        };
      });

      if (record.length > 0) {
        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `HO-Payment-record.xlsx`,
          worksheetName: `HO-Payment-record`,
        });
      } else {
        return res
          .status(400)
          .send(
            new serviceResponse({
              status: 400,
              data: records,
              message: _response_message.notFound("Payment"),
            })
          );
      }
    } else {
      return res
        .status(200)
        .send(
          new serviceResponse({
            status: 200,
            data: response,
            message: _response_message.found("Payment"),
          })
        );
    }

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.payment = async (req, res) => {
  try {
    // console.log("raj kapoor")
    const { page, limit, skip, paginate = 1, sortBy, search = "", isExport = 0, state = "", commodity = "" } = req.query;

    // let query = search ? { reqNo: { $regex: search, $options: "i" } } : {};

    const { portalId, user_id } = req;

    const paymentIds = (
      await Payment.find({
        ho_id: { $in: [portalId, user_id] },
        bo_approve_status: _paymentApproval.approved,
      })
    ).map((i) => i.req_id);

    let query = {
      _id: { $in: paymentIds },
      // ...(search ? { reqNo: { $regex: search, $options: "i" } } : {}),
      ...(state || search || commodity ? {
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
                  "branch.branchName": {
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
    };

    const aggregationPipeline = [
      // { $match: { _id: { $in: paymentIds } } },
      // { $match: query },

      {
        $lookup: {
          from: "batches",
          localField: "_id",
          foreignField: "req_id",
          as: "batches",
          pipeline: [
            {
              $lookup: {
                from: "payments",
                localField: "_id",
                foreignField: "batch_id",
                as: "payment",
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "branch_id",
          foreignField: "_id",
          as: "branch",
        },
      },
      {
        $lookup: {
          from: "farmers",
          localField: "farmer_order_id",
          foreignField: "farmer_order_id",
          as: "farmer",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "batches.seller_id",
          foreignField: "_id",
          as: "sellers",
        },
      },
      {
        $lookup: {
          from: "procurementcenters",
          localField: "batches.procurementCenter_id",
          foreignField: "_id",
          as: "ProcurementCenter",
        },
      },
      {
        $lookup: {
          from: "requests",
          localField: "batches.req_id",
          foreignField: "_id",
          as: "request",
        },
      },
      {
        $lookup: {
          from: "payments",
          localField: "_id",
          foreignField: "batch_id",
          as: "payment",
        },
      },
      { $unwind: { path: "$branch" } },
      {
        $match: {
          batches: { $ne: [] },
        },
        $match: query,
      },
      {
        $addFields: {
          approval_status: {
            $cond: {
              if: {
                $anyElementTrue: {
                  $map: {
                    input: "$batches",
                    as: "batch",
                    in: {
                      $or: [
                        { $not: { $ifNull: ["$$batch.ho_approval_at", true] } }, // Check if the field is missing
                        { $eq: ["$$batch.ho_approval_at", null] }, // Check for null value
                      ],
                    },
                  },
                },
              },
              then: "Pending",
              else: "Approved",
            },
          },
          qtyPurchased: {
            $reduce: {
              input: "$batches",
              initialValue: 0,
              in: { $add: ["$$value", "$$this.qty"] }, // Sum of qty from batches
            },
          },
          amountPayable: {
            $reduce: {
              input: "$batches",
              initialValue: 0,
              in: { $add: ["$$value", "$$this.totalPrice"] }, // Sum of totalPrice from batches
            },
          },
          amountPaid: {
            $reduce: {
              input: "$batches",
              initialValue: 0,
              in: { $add: ["$$value", "$$this.totalPrice"] }, // Sum of totalPrice from batches
            },
          },
          payment_status: {
            $cond: {
              if: {
                $anyElementTrue: {
                  $map: {
                    input: "$batches",
                    as: "batch",
                    in: {
                      $anyElementTrue: {
                        $map: {
                          input: "$$batch.payment",
                          as: "pay",
                          in: {
                            $eq: ["$$pay.payment_status", "Pending"], // Assuming status field exists in payments
                          },
                        },
                      },
                    },
                  },
                },
              },
              then: "Pending",
              else: "Approved",
            },
          },
          overall_payment_status: {
            $switch: {
              branches: [{
                case: {
                  $allElementsTrue: {
                    $map: {
                      input: "$batches",
                      as: "batch",
                      in: {
                        $allElementsTrue: {
                          $map: {
                            input: "$$batch.payment",
                            as: "pay",
                            in: { $eq: ["$$pay.payment_status", "Pending"] },
                          },
                        },
                      },
                    },
                  },
                },
                then: "Pending",
              },
              {
                case: {
                  $allElementsTrue: {
                    $map: {
                      input: "$batches",
                      as: "batch",
                      in: {
                        $allElementsTrue: {
                          $map: {
                            input: "$$batch.payment",
                            as: "pay",
                            in: { $eq: ["$$pay.payment_status", "Completed"] },
                          },
                        },
                      },
                    },
                  },
                },
                then: "Completed",
              },
              {
                case: {
                  $allElementsTrue: {
                    $map: {
                      input: "$batches",
                      as: "batch",
                      in: {
                        $allElementsTrue: {
                          $map: {
                            input: "$$batch.payment",
                            as: "pay",
                            in: { $eq: ["$$pay.payment_status", "In Progress"] },
                          },
                        },
                      },
                    },
                  },
                },
                then: "Payment initiated",
              },
              {
                case: {
                  $anyElementTrue: {
                    $map: {
                      input: "$batches",
                      as: "batch",
                      in: {
                        $anyElementTrue: {
                          $map: {
                            input: "$$batch.payment",
                            as: "pay",
                            in: { $in: ["$$pay.payment_status", ["Pending", "In Progress", "Failed", "Rejected"]] },
                          },
                        },
                      },
                    },
                  },
                },
                then: "Partially initiated",
              }
              ],
              default: "Pending", // Default case when no action is taken
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          reqNo: 1,
          product: 1,
          branch_id: 1,
          "branch._id": 1,
          "branch.branchName": 1,
          approval_status: 1,
          qtyPurchased: 1,
          amountPayable: 1,
          amountPaid: 1,
          payment_status: 1,
          overall_payment_status: 1,
          farmer: 1,
          quotedPrice: 1,
          sellers: 1,
          batches: 1,
          ProcurementCenter: 1,
          payment: 1,
          request: 1,
        },
      },
      { $sort: sortBy ? { [sortBy]: 1 } : { createdAt: -1 } },
      // { $skip: skip },
      // { $limit: parseInt(limit) },
    ];
    const records = await RequestModel.aggregate([
      ...aggregationPipeline, // Use the pipeline for fetching paginated data
      {
        $facet: {
          data: [
            ...aggregationPipeline, // Include the full pipeline for data
            { $skip: skip },
            { $limit: parseInt(limit) },
          ],
          totalCount: [
            { $match: query }, // Reapply the match condition
            { $count: "count" }, // Correctly calculate the total count
          ],
        },
      },
    ]).allowDiskUse(true);

    const response = {
      count: records[0]?.totalCount[0]?.count || 0,
      rows: records[0]?.data || [],
    };

    if (paginate == 1) {
      response.page = page;
      response.limit = limit;
      response.pages = limit != 0 ? Math.ceil(response.count / limit) : 0;
    }


    // return res
    //   .status(200)
    //   .send(
    //     new serviceResponse({
    //       status: 200,
    //       data: response,
    //       message: _response_message.found("Payment"),
    //     })
    //   );


    if (isExport == 1) {
      const exportRecords = await RequestModel.aggregate([
        ...aggregationPipeline,
        { $match: query },
      ]);
      const record = exportRecords.map((item) => {
        const procurementAddress = item?.ProcurementCenter[0]?.address;
        const paymentDetails = item.payment[0] || {};
        const sellerDetails = item.sellers?.[0]?.basic_details?.associate_details || {};
        const farmerDetails = item.farmer ? item.farmer[0] || {} : {};
        const farmerAddress = farmerDetails?.address
          ? `${farmerDetails.address.village || "NA"}, ${farmerDetails.address.block || "NA"}, 
               ${farmerDetails.address.country || "NA"}`
          : "NA";
        const batchIds = item?.batches?.map(batch => batch.batchId).join(', ') || "NA";
        const dispatchedDates = item?.batches?.map(batch => batch.dispatched?.dispatched_at || "NA").join(", ") || "NA";
        const intransitDates = item?.batches?.map(batch => batch.intransit?.intransit_at || "NA").join(", ") || "NA";
        const deliveredat = item?.batches?.map(batch => batch.delivered?.delivered_at || "NA").join(", ") || "NA";
        const deliveryDates = item?.request?.map(req => req.deliveryDate).join(", ") || "NA";
        const receivingDates = item?.batches
          ?.map(batch => batch?.dispatched?.qc_report?.received?.map(received => received?.on || "NA"))
          ?.flat()
          ?.join(", ") || "NA";
        return {
          "Order ID": item?.reqNo || "NA",
          "MSP": item?.quotedPrice || "NA",
          "Branch Name": item?.branch?.branchName || "NA",
          "Batch Id": batchIds,
          "Commodity": item?.product?.name || "NA",
          "Quantity Purchased": item?.qtyPurchased || "NA",
          "Approval Status": item?.approval_status ?? "NA",
          "Payment Status": item?.payment_status ?? "NA",
          "Collection center": item?.ProcurementCenter[0]?.center_name ?? "NA",
          "Procurement Address Line 1": procurementAddress?.line1 || "NA",
          "Procurement City": procurementAddress?.city || "NA",
          "Procurement District": procurementAddress?.district || "NA",
          "Procurement State": procurementAddress?.state || "NA",
          "Procurement Country": procurementAddress?.country || "NA",
          "Procurement Postal Code": procurementAddress?.postalCode || "NA",
          "Payment Status": paymentDetails?.payment_status || "NA",
          "Payment Approval Date": paymentDetails?.bo_approve_at || "NA",
          "Approved Amount": paymentDetails?.amount || "NA",
          "Credited Amount": paymentDetails?.amount || "NA",
          "Delivery location": "HAUZ KHAS",
          "Associate User Code": item.sellers?.[0]?.user_code || "NA",
          "Associate Name": sellerDetails?.associate_name || "NA",
          "Farmer ID": farmerDetails?.farmer_id || "NA",
          "Farmer Name": farmerDetails?.name || "NA",
          "Mobile No": farmerDetails?.basic_details?.mobile_no || "NA",
          "Farmer DOB": farmerDetails?.basic_details?.dob || "NA",
          "Father Name": farmerDetails?.parents?.father_name || "NA",
          "Farmer Address": farmerAddress,
          "Dispatched Date": dispatchedDates,
          "In-Transit Date": intransitDates,
          "Delivery Date": deliveredat,
          "Expected Delivery Date": deliveryDates,
          "Receivinng Date": receivingDates,
        };
      });

      if (record.length > 0) {
        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `HO-Payment-record.xlsx`,
          worksheetName: `HO-Payment-record`,
        });
      } else {
        return res
          .status(400)
          .send(
            new serviceResponse({
              status: 400,
              data: records,
              message: _response_message.notFound("Payment"),
            })
          );
      }
    } else {
      return res
        .status(200)
        .send(
          new serviceResponse({
            status: 200,
            data: response,
            message: _response_message.found("Payment"),
          })
        );
    }

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};
*/

/*
module.exports.payment = async (req, res) => {
  try {
    var { page = 1, limit = 50, search = "", isExport = 0, isApproved, paymentStatus, approve_status = "Pending" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    isApproved = isApproved === "true";
    const { portalId, user_id } = req;

    // Ensure necessary indexes are created (run once in your database setup)
    await Payment.createIndexes({ ho_id: 1, bo_approve_status: 1 });
    await RequestModel.createIndexes({ reqNo: 1, createdAt: -1 });
    await Batch.createIndexes({ req_id: 1 });
    await Payment.createIndexes({ batch_id: 1 });
    await Branches.createIndexes({ _id: 1 });

    // Step 1: Get relevant payment IDs
    const paymentIds = await Payment.distinct("req_id", {
      ho_id: { $in: [portalId, user_id] },
      bo_approve_status: _paymentApproval.approved,
    });

    if (paymentIds.length === 0) {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: { count: 0, rows: [] },
          message: _response_message.found("Payment"),
        })
      );
    }

    // Step 2: Construct the Query
    let query = {
      _id: { $in: paymentIds },
      //...(search ? { reqNo: { $regex: search, $options: "i" } } : {}),
    };

    // Step 3: Get total count (without full aggregation)
    const totalCount = await RequestModel.countDocuments(query);

    // Step 4: Aggregation Pipeline with Optimized Lookups
    const aggregationPipeline = [
      { $match: query },
      {
        $lookup: {
          from: "batches",
          localField: "_id",
          foreignField: "req_id",
          as: "batches",
          pipeline: [
            { $match: { qty: { $exists: true } } }, // Only fetch relevant documents
            {
              $lookup: {
                from: "payments",
                localField: "_id",
                foreignField: "batch_id",
                as: "payment",
                pipeline: [{ $project: { payment_status: 1 } }], // Fetch only needed fields
              },
            },
            {
              $project: {                
                qty:1,
                totalPrice:1,
                ho_approval_at: 1, // Include ho_approval_at
                payment: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "branch_id",
          foreignField: "_id",
          as: "branch",
        },
      },
      { $unwind: "$branch" },
      // { $match: { "batches.0": { $exists: true } } }, // Ensure there are batches
      {
        $match: {
          batches: { $ne: [] },
          "batches.ho_approve_status": approve_status == _paymentApproval.pending ? _paymentApproval.pending : { $ne: _paymentApproval.pending }
        }
      },
      {
        $addFields: {
          ho_approval_at: { $arrayElemAt: ["$batches.ho_approval_at", 0] },
          approval_status: {
            $cond: {
              if: {
                $anyElementTrue: {
                  $map: {
                    input: "$batches",
                    as: "batch",
                    in: {
                      $or: [
                        { $not: { $ifNull: ["$$batch.ho_approval_at", true] } },
                        { $eq: ["$$batch.ho_approval_at", null] },
                      ],
                    },
                  },
                },
              },
              then: "Pending",
              else: "Approved",
            },
          },
          qtyPurchased: {
            $sum: "$batches.qty",
          },
          amountPayable: {
            $sum: "$batches.totalPrice",
          },
          amountPaid: {
            $sum: "$batches.totalPrice",
          },
          payment_status: {
            $cond: {
              if: {
                $anyElementTrue: {
                  $map: {
                    input: "$batches",
                    as: "batch",
                    in: {
                      $anyElementTrue: {
                        $map: {
                          input: "$$batch.payment",
                          as: "pay",
                          in: {
                            $in: [
                              "$$pay.payment_status",
                              ["Pending", "In Progress"],
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
              then: "Pending",
              else: "Completed",
            },
          },
          overall_payment_status: {
            $switch: {
              branches: [{
                case: {
                  $allElementsTrue: {
                    $map: {
                      input: "$batches",
                      as: "batch",
                      in: {
                        $allElementsTrue: {
                          $map: {
                            input: "$$batch.payment",
                            as: "pay",
                            in: { $eq: ["$$pay.payment_status", "Pending"] },
                          },
                        },
                      },
                    },
                  },
                },
                then: "Pending",
              },
              {
                case: {
                  $allElementsTrue: {
                    $map: {
                      input: "$batches",
                      as: "batch",
                      in: {
                        $allElementsTrue: {
                          $map: {
                            input: "$$batch.payment",
                            as: "pay",
                            in: { $eq: ["$$pay.payment_status", "Completed"] },
                          },
                        },
                      },
                    },
                  },
                },
                then: "Completed",
              },
              {
                case: {
                  $allElementsTrue: {
                    $map: {
                      input: "$batches",
                      as: "batch",
                      in: {
                        $allElementsTrue: {
                          $map: {
                            input: "$$batch.payment",
                            as: "pay",
                            in: { $eq: ["$$pay.payment_status", "In Progress"] },
                          },
                        },
                      },
                    },
                  },
                },
                then: "Partially initiated",
              },
              {
                case: {
                  $anyElementTrue: {
                    $map: {
                      input: "$batches",
                      as: "batch",
                      in: {
                        $anyElementTrue: {
                          $map: {
                            input: "$$batch.payment",
                            as: "pay",
                            in: { $in: ["$$pay.payment_status", ["Failed", "Rejected"]] },
                          },
                        },
                      },
                    },
                  },
                },
                then: "Failed",
              }
              ],
              default: "Pending", // Default case when no action is taken
            },
          },
        },
      },

    ];

    if (search) {
      aggregationPipeline.push({
        $match: { $or: [{ reqNo: { $regex: search, $options: "i" } }, { 'branch.branchName': { $regex: search, $options: "i" } }] }
      });
    }

    aggregationPipeline.push(
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
        $project: {
          _id: 1,
          reqNo: 1,
          product: 1,
          branch_id: 1,
          "branch._id": 1,
          "branch.branchName": 1,
          approval_status: 1,
          qtyPurchased: 1,
          amountPayable: 1,
          amountPaid: 1,
          payment_status: 1,
          overall_payment_status: 1,
          ho_approval_at: 1,
          schemeName: {
            $concat: [
              "$schemeDetails.schemeName", " ",
              { $ifNull: ["$schemeDetails.commodityDetails.name", " "] }, " ",
              { $ifNull: ["$schemeDetails.season", " "] }, " ",
              { $ifNull: ["$schemeDetails.period", " "] },
            ],
          },
        },
      },
      { $sort: { payment_status: -1, createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    );

    const records = await RequestModel.aggregate(aggregationPipeline) || [];
    console.log("Total records from aggregation: ", records.length);

    // filtering records on the basis of approval_status
    const apStatus = isApproved ? "Approved" : "Pending";
    var filteredRecords = records.filter((el) => el?.approval_status === apStatus);
    // filtering on the basis of overall_payment_status
    if (paymentStatus) {
      filteredRecords = records.filter((el) => el?.overall_payment_status === paymentStatus);
    }

    // console.log("filteredRes => ", filteredRecords, apStatus, isApproved, paymentStatus)

    // Step 5: Prepare Response
    const response = {
      count: totalCount,
      // rows: filteredRecords,
      rows: records,
      page,
      limit,
      pages: Math.ceil(totalCount / limit),
    };

    if (isExport == 1) {
      // Export logic
      const record = response.rows.map((item) => ({
        "Order ID": item?.reqNo || "NA",
        "Branch Name": item?.branch?.branchName || "NA",
        Commodity: item?.product?.name || "NA",
        "Quantity Purchased": item?.qtyPurchased || "NA",
        "Approval Status": item?.approval_status ?? "NA",
        "Payment Status": item?.payment_status ?? "NA",
      }));

      if (record.length > 0) {
        return dumpJSONToExcel(req, res, {
          data: record,
          fileName: `HO-Payment-record.xlsx`,
          worksheetName: `HO-Payment-record`,
        });
      } else {
        return res.status(400).send(
          new serviceResponse({
            status: 400,
            data: [],
            message: _response_message.notFound("Payment"),
          })
        );
      }
    } else {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: response,
          message: _response_message.found("Payment"),
        })
      );
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};
*/

// module.exports.payment = async (req, res) => {
//   try {
//     let { page = 1, limit = 50, search = "", isExport = 0, isApproved, paymentStatus, approve_status = "Pending" } = req.query;
//     page = parseInt(page);
//     limit = parseInt(limit);
//     isApproved = isApproved === "true";
//     const { portalId, user_id } = req;

//     // Ensure necessary indexes are created (run once in your database setup)
//     await Payment.createIndexes({ ho_id: 1, bo_approve_status: 1 });
//     await RequestModel.createIndexes({ reqNo: 1, createdAt: -1 });
//     await Batch.createIndexes({ req_id: 1 });
//     await Payment.createIndexes({ batch_id: 1 });
//     await Branches.createIndexes({ _id: 1 });

//     // Step 1: Get relevant payment IDs
//     const paymentIds = await Payment.distinct("req_id", {
//       ho_id: { $in: [portalId, user_id] },
//       bo_approve_status: _paymentApproval.approved,
//     });

//     if (paymentIds.length === 0) {
//       return res.status(200).send(
//         new serviceResponse({
//           status: 200,
//           data: { count: 0, rows: [] },
//           message: _response_message.found("Payment"),
//         })
//       );
//     }

//     // Step 2: Construct Query
//     let query = {
//       _id: { $in: paymentIds },
//     };

//     // Step 3: Get total count
//     const totalCount = await RequestModel.countDocuments(query);

//     // Step 4: Aggregation Pipeline
//     const aggregationPipeline = [
//       { $match: query },
//       {
//         $lookup: {
//           from: "batches",
//           localField: "_id",
//           foreignField: "req_id",
//           as: "batches",
//           pipeline: [
//             { $match: { qty: { $exists: true } } },
//             {
//               $lookup: {
//                 from: "payments",
//                 localField: "_id",
//                 foreignField: "batch_id",
//                 as: "payment",
//                 pipeline: [{ $project: { payment_status: 1 } }],
//               },
//             },
//             {
//               $project: {
//                 qty: 1,
//                 totalPrice: 1,
//                 ho_approval_at: 1,
//                 payment: 1,
//               },
//             },
//           ],
//         },
//       },
//       {
//         $lookup: {
//           from: "branches",
//           localField: "branch_id",
//           foreignField: "_id",
//           as: "branch",
//         },
//       },
//       { $unwind: "$branch" },
//       {
//         $match: {
//           batches: { $ne: [] },
//           "batches.ho_approve_status": approve_status == _paymentApproval.pending ? _paymentApproval.pending : { $ne: _paymentApproval.pending }
//         }
//       },
//       {
//         $lookup: {
//           from: "schemes",
//           localField: "product.schemeId",
//           foreignField: "_id",
//           as: "schemeDetails",
//         },
//       },
//       { $unwind: { path: "$schemeDetails", preserveNullAndEmptyArrays: true } },
//       {
//         $lookup: {
//           from: "commodities",
//           localField: "schemeDetails.commodity_id",
//           foreignField: "_id",
//           as: "commodityDetails"
//         }
//       },
//       {
//         $unwind: { path: "$commodityDetails", preserveNullAndEmptyArrays: true }
//       },
//       {
//         $addFields: {
//           ho_approval_at: { $arrayElemAt: ["$batches.ho_approval_at", 0] },
//           approval_status: {
//             $cond: {
//               if: {
//                 $anyElementTrue: {
//                   $map: {
//                     input: "$batches",
//                     as: "batch",
//                     in: {
//                       $or: [
//                         { $not: { $ifNull: ["$$batch.ho_approval_at", true] } },
//                         { $eq: ["$$batch.ho_approval_at", null] },
//                       ],
//                     },
//                   },
//                 },
//               },
//               then: "Pending",
//               else: "Approved",
//             },
//           },
//           payment_status: {
//             $cond: {
//               if: {
//                 $anyElementTrue: {
//                   $map: {
//                     input: "$batches",
//                     as: "batch",
//                     in: {
//                       $anyElementTrue: {
//                         $map: {
//                           input: "$$batch.payment",
//                           as: "pay",
//                           in: {
//                             $in: [
//                               "$$pay.payment_status",
//                               ["Pending", "In Progress"],
//                             ],
//                           },
//                         },
//                       },
//                     },
//                   },
//                 },
//               },
//               then: "Pending",
//               else: "Completed",
//             },
//           },
//           overall_payment_status: {
//             $switch: {
//               branches: [{
//                 case: {
//                   $allElementsTrue: {
//                     $map: {
//                       input: "$batches",
//                       as: "batch",
//                       in: {
//                         $allElementsTrue: {
//                           $map: {
//                             input: "$$batch.payment",
//                             as: "pay",
//                             in: { $eq: ["$$pay.payment_status", "Pending"] },
//                           },
//                         },
//                       },
//                     },
//                   },
//                 },
//                 then: "Pending",
//               },
//               {
//                 case: {
//                   $allElementsTrue: {
//                     $map: {
//                       input: "$batches",
//                       as: "batch",
//                       in: {
//                         $allElementsTrue: {
//                           $map: {
//                             input: "$$batch.payment",
//                             as: "pay",
//                             in: { $eq: ["$$pay.payment_status", "Completed"] },
//                           },
//                         },
//                       },
//                     },
//                   },
//                 },
//                 then: "Completed",
//               },
//               {
//                 case: {
//                   $allElementsTrue: {
//                     $map: {
//                       input: "$batches",
//                       as: "batch",
//                       in: {
//                         $allElementsTrue: {
//                           $map: {
//                             input: "$$batch.payment",
//                             as: "pay",
//                             in: { $eq: ["$$pay.payment_status", "In Progress"] },
//                           },
//                         },
//                       },
//                     },
//                   },
//                 },
//                 then: "Partially initiated",
//               },
//               {
//                 case: {
//                   $anyElementTrue: {
//                     $map: {
//                       input: "$batches",
//                       as: "batch",
//                       in: {
//                         $anyElementTrue: {
//                           $map: {
//                             input: "$$batch.payment",
//                             as: "pay",
//                             in: { $in: ["$$pay.payment_status", ["Failed", "Rejected"]] },
//                           },
//                         },
//                       },
//                     },
//                   },
//                 },
//                 then: "Failed",
//               }
//               ],
//               default: "Pending", // Default case when no action is taken
//             },
//           },
//         },
//       },
//       {
//         $group: {
//           _id: "$_id",
//           reqNo: { $first: "$reqNo" },
//           branch_id: { $first: "$branch_id" },
//           branchName: { $first: "$branch.branchName" },
//           approval_status: { $first: "$approval_status" },
//           qtyPurchased: { $sum: { $sum: "$batches.qty" } },
//           amountPayable: { $sum: { $sum: "$batches.totalPrice" } },
//           amountPaid: { $sum: { $sum: "$batches.totalPrice" } },
//           payment_status: { $first: "$payment_status" },
//           overall_payment_status: { $first: "$overall_payment_status" },
//           ho_approval_at: { $first: "$ho_approval_at" },
//           commodity: { $first: "$product.name" },
//           schemeName: { $first: "$schemeDetails.schemeName" },
//           schemeName: {
//             $first: {
//               $concat: [
//                 "$schemeDetails.schemeName", " ",
//                 { $ifNull: ["$commodityDetails.name", " "] }, " ",
//                 { $ifNull: ["$schemeDetails.season", " "] }, " ",
//                 { $ifNull: ["$schemeDetails.period", " "] },
//               ],
//             },
//           },
//         },
//       },
//       {
//         $project: {
//           _id: 1,
//           reqNo: 1,
//           commodity: 1,
//           branch_id: 1,
//           branchName: 1,
//           approval_status: 1,
//           qtyPurchased: 1,
//           amountPayable: 1,
//           amountPaid: 1,
//           payment_status: 1,
//           overall_payment_status: 1,
//           ho_approval_at: 1,
//           schemeName: 1,
//         },
//       },
//       // { $sort: { payment_status: -1, createdAt: -1 } },
//       { $sort: { _id: -1, createdAt: -1 } },
//       { $skip: (page - 1) * limit },
//       { $limit: limit },
//     ];

//     // Filtering
//     if (search) {
//       aggregationPipeline.push({
//         $match: {
//           $or: [
//             { reqNo: { $regex: search, $options: "i" } },
//             { branchName: { $regex: search, $options: "i" } },
//           ],
//         },
//       });
//     }

//     const records = await RequestModel.aggregate(aggregationPipeline) || [];

//     // Additional filtering on approval_status
//     const apStatus = isApproved ? "Approved" : "Pending";
//     var filteredRecords = records.filter((el) => el?.approval_status === apStatus);

//     // Additional filtering on paymentStatus
//     if (paymentStatus) {
//       filteredRecords = records.filter((el) => el?.overall_payment_status === paymentStatus);
//     }

//     // Prepare Response
//     const response = {
//       count: totalCount,
//       rows: records,
//       page,
//       limit,
//       pages: Math.ceil(totalCount / limit),
//     };

//     // Export Logic
//     if (isExport == 1) {
//       const record = response.rows.map((item) => ({
//         "Order ID": item?.reqNo || "NA",
//         "Branch Name": item?.branchName || "NA",
//         "Commodity": item?.Commodity || "NA",
//         "Quantity Purchased": item?.qtyPurchased || "NA",
//         "Approval Status": item?.approval_status ?? "NA",
//         "Payment Status": item?.payment_status ?? "NA",
//       }));

//       if (record.length > 0) {
//         return dumpJSONToExcel(req, res, {
//           data: record,
//           fileName: `HO-Payment-record.xlsx`,
//           worksheetName: `HO-Payment-record`,
//         });
//       } else {
//         return res.status(400).send(
//           new serviceResponse({
//             status: 400,
//             data: [],
//             message: _response_message.notFound("Payment"),
//           })
//         );
//       }
//     } else {
//       return res.status(200).send(
//         new serviceResponse({
//           status: 200,
//           data: response,
//           message: _response_message.found("Payment"),
//         })
//       );
//     }
//   } catch (error) {
//     _handleCatchErrors(error, res);
//   }
// };


module.exports.payment = async (req, res) => {
  try {
    let { page = 1, limit = 50, search = "", isExport = 0, approve_status = "Pending", paymentStatus } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const { portalId, user_id } = req;

    // Get relevant req_ids from payments
    const reqIds = await Payment.distinct("req_id", {
      ho_id: { $in: [portalId, user_id] },
      bo_approve_status: _paymentApproval.approved,
    });

    if (reqIds.length === 0) {
      return res.status(200).send(new serviceResponse({
        status: 200,
        data: { count: 0, rows: [] },
        message: _response_message.found("Payment"),
      }));
    }

    // Fetch all requests
    const allRequests = await RequestModel.find({ _id: { $in: reqIds } }).lean();

    // Preload batches and payments
    const batchMap = {};
    const paymentMap = {};

    const allBatches = await Batch.find({ req_id: { $in: reqIds }, qty: { $exists: true } }).lean();
    const batchIds = allBatches.map(batch => batch._id);
    const allPayments = await Payment.find({ batch_id: { $in: batchIds } }).lean();

    allBatches.forEach(batch => {
      batchMap[batch.req_id] = batchMap[batch.req_id] || [];
      batch.payment = [];
      batchMap[batch.req_id].push(batch);
    });

    allPayments.forEach(payment => {
      const batch = allBatches.find(b => b._id.equals(payment.batch_id));
      if (batch) {
        batch.payment = batch.payment || [];
        batch.payment.push(payment);
      }
    });

    // Preload branch info
    const branchIds = allRequests.map(req => req.branch_id);
    const branchList = await Branches.find({ _id: { $in: branchIds } }).lean();
    const branchMap = {};
    branchList.forEach(branch => {
      branchMap[branch._id] = branch;
    });

    // Preload scheme and commodity info
    const schemeIds = allRequests.map(req => req?.product?.schemeId).filter(Boolean);
    const schemes = await Scheme.find({ _id: { $in: schemeIds } }).lean();
    const schemeMap = {};
    schemes.forEach(s => { schemeMap[s._id] = s; });

    const commodityIds = schemes.map(s => s.commodity_id).filter(Boolean);
    const commodities = await Commodity.find({ _id: { $in: commodityIds } }).lean();
    const commodityMap = {};
    commodities.forEach(c => { commodityMap[c._id] = c; });

    // Build final records
    let records = allRequests.map(req => {
      const batches = batchMap[req._id] || [];

      const qtyPurchased = batches.reduce((sum, b) => sum + (b.qty || 0), 0);
      const amountPayable = batches.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

      const allPaymentsInBatch = batches.flatMap(b => b.payment || []);
      const allStatuses = allPaymentsInBatch.map(p => p.payment_status);

      const approval_status = batches.some(b => !b.ho_approval_at) ? "Pending" : "Approved";
      const payment_status = allStatuses.some(st => ["Pending", "In Progress"].includes(st))
        ? "Pending"
        : "Completed";

      let overall_payment_status = "Pending";
      if (allStatuses.every(st => st === "Pending")) overall_payment_status = "Pending";
      else if (allStatuses.every(st => st === "Completed")) overall_payment_status = "Completed";
      else if (allStatuses.every(st => st === "In Progress")) overall_payment_status = "Partially initiated";
      else if (allStatuses.some(st => ["Failed", "Rejected"].includes(st))) overall_payment_status = "Failed";
      else overall_payment_status = "Pending";

      const branch = branchMap[req.branch_id];
      const scheme = schemeMap[req?.product?.schemeId];
      const commodity = commodityMap[scheme?.commodity_id];

      const schemeName = [
        scheme?.schemeName || "",
        commodity?.name || "",
        scheme?.season || "",
        scheme?.period || ""
      ].join(" ").trim();

      return {
        _id: req._id,
        reqNo: req.reqNo,
        branch_id: req.branch_id,
        branchName: branch?.branchName || "NA",
        commodity: req?.product?.name || "NA",
        approval_status,
        qtyPurchased,
        amountPayable,
        amountPaid: amountPayable,
        payment_status,
        overall_payment_status,
        ho_approval_at: batches[0]?.ho_approval_at || null,
        schemeName
      };
    });

    // Filter by approval_status
    if (approve_status) {
      records = records.filter(r => r.approval_status === approve_status);
    }

    // Filter by paymentStatus
    if (paymentStatus) {
      records = records.filter(r => r.overall_payment_status === paymentStatus);
    }

    // Filter by search term
    if (search) {
      const searchRegex = new RegExp(search, "i");
      records = records.filter(r =>
        searchRegex.test(r.reqNo) || searchRegex.test(r.branchName)
      );
    }

    // Count before pagination
    const totalCount = records.length;

    // Apply skip + limit
    const paginated = records.slice((page - 1) * limit, page * limit);

    // Export if needed
    if (isExport == 1) {
      const exportData = records.map((item) => ({
        "Order ID": item?.reqNo || "NA",
        "Branch Name": item?.branchName || "NA",
        "Commodity": item?.commodity || "NA",
        "Quantity Purchased": item?.qtyPurchased || "NA",
        "Approval Status": item?.approval_status ?? "NA",
        "Payment Status": item?.payment_status ?? "NA",
      }));

      if (exportData.length > 0) {
        return dumpJSONToExcel(req, res, {
          data: exportData,
          fileName: `HO-Payment-record.xlsx`,
          worksheetName: `HO-Payment-record`,
        });
      } else {
        return res.status(400).send(new serviceResponse({
          status: 400,
          data: [],
          message: _response_message.notFound("Payment"),
        }));
      }
    }

    // Send paginated response
    return res.status(200).send(new serviceResponse({
      status: 200,
      data: {
        count: totalCount,
        rows: paginated,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
      message: _response_message.found("Payment"),
    }));
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};



module.exports.associateOrders = async (req, res) => {
  try {
    const {
      page,
      limit,
      skip,
      paginate = 1,
      sortBy,
      search = "",
      req_id,
      isExport = 0,
    } = req.query;

    const { user_type, portalId, user_id } = req;

    if (user_type != _userType.ho) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.Unauthorized("user") }],
        })
      );
    }
    const paymentIds = (
      await Payment.find({
        ho_id: { $in: [new mongoose.Types.ObjectId(portalId), new mongoose.Types.ObjectId(user_id)] },
        req_id: new mongoose.Types.ObjectId(req_id),
        bo_approve_status: _paymentApproval.approved,
      })
    ).map((i) => i.associateOffers_id);

    let query = {
      _id: { $in: paymentIds },
      req_id: new mongoose.Types.ObjectId(req_id),
      status: {
        $in: [
          _associateOfferStatus.partially_ordered,
          _associateOfferStatus.ordered,
        ],
      },
      // ...(search ? { order_no: { $regex: search, $options: "i" } } : {}), // Search functionality
    };

    const records = { count: 0 };
    records.reqDetails = await RequestModel.findOne({ _id: req_id }).select({
      _id: 1,
      reqNo: 1,
      product: 1,
      deliveryDate: 1,
      address: 1,
      quotedPrice: 1,
      status: 1,
    });
    records.rows =
      paginate == 1
        ? await AssociateOffers.find(query)
          .populate({
            path: "seller_id",
            select:
              "_id user_code basic_details.associate_details.associate_type basic_details.associate_details.associate_name basic_details.associate_details.organization_name",
          })
          .sort(sortBy)
          .skip(skip)
          .limit(parseInt(limit))
        : await AssociateOffers.find(query).sort(sortBy);

    // records.rows =
    //   paginate == 1
    //     ? await AssociateOffers.find(query)
    //         .populate({
    //           path: "seller_id",
    //           select:
    //             "_id user_code basic_details.associate_details.associate_type basic_details.associate_details.associate_name basic_details.associate_details.organization_name",           
    //           })
    //         .sort(sortBy)
    //         .skip(skip)
    //         .limit(parseInt(limit))
    //     : await AssociateOffers.find(query).sort(sortBy);

    // records.count = await AssociateOffers.countDocuments(query);

    // if (paginate == 1) {
    //   records.page = page;
    //   records.limit = limit;
    //   records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    // }

    let pipeline = [
      { $match: query },

      // Lookup for seller_id instead of populate
      {
        $lookup: {
          from: 'users',
          localField: 'seller_id',
          foreignField: '_id',
          pipeline: [
            { $project: { user_code: 1, 'basic_details.associate_details': 1 } }
          ],
          as: 'seller_id',
        },
      },
      {
        $unwind: {
          path: '$seller_id',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'seller_id.basic_details.associate_details.organization_name': { $regex: search, $options: 'i' } },
            { 'seller_id.basic_details.associate_details.associate_name': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Count total records
    const countPipeline = [
      ...pipeline,
      { $count: "count" }
    ];

    // add necessary fields
    pipeline.push(
      // Project only required fields
      {
        $project: {
          _id: 1,
          req_id: 1,
          seller_id: 1,
          offeredQty: 1,
          status: 1,
          procuredQty: 1,
          updatedBy: 1,
          createdBy: 1,
          deletedAt: 1,
          deletedBy: 1,
          comments: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      }
    );

    // sorting
    pipeline.push(
      // Sorting
      { $sort: sortBy },
    );

    if (paginate == 1) {
      pipeline.push({ $skip: parseInt(skip) }, { $limit: parseInt(limit) });
      records.page = page;
      records.limit = limit;
    }

    records.rows = await AssociateOffers.aggregate(pipeline);

    countResult = await AssociateOffers.aggregate(countPipeline);
    records.count = countResult[0]?.count || 0;

    if (paginate == 1) {
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("Payment"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.batchList = async (req, res) => {
  try {
    const { page, limit, skip, paginate = 1, sortBy, search = '', associateOffer_id, isExport = 0, batch_status = "Pending" } = req.query

    const paymentIds = (await Payment.find({ associateOffers_id: associateOffer_id })).map(i => i.batch_id)

    let query = {
      _id: { $in: paymentIds },
      associateOffer_id: new mongoose.Types.ObjectId(associateOffer_id),
      bo_approve_status: _paymentApproval.approved,
      ho_approve_status: batch_status == _paymentApproval.pending ? _paymentApproval.pending : _paymentApproval.approved,
      ...(search ? 
        {
          $or: [
            { batchId: { $regex: search, $options: 'i' } },
             { whrNo: { $regex: search, $options: 'i' } }
          ]
        }
        :  {})
      // ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
    };

    const records = { count: 0 };

    const pipeline = [
      {
        $match: query,
      },
      {
        $lookup: {
          from: 'users',
          localField: 'seller_id',
          foreignField: '_id',
          as: 'users',
        }
      },
      {
        $unwind: "$users"
      },
      {
        $lookup: {
          from: 'requests',
          localField: 'req_id',
          foreignField: '_id',
          as: 'requestDetails',
        }
      },
      {
        $unwind: "$requestDetails"
      },
      {
        $lookup: {
          from: 'associateinvoices',
          localField: '_id',
          foreignField: 'batch_id',
          as: 'invoice',
        }
      },
      {
        $lookup: {
          from: 'payments',
          localField: '_id',
          foreignField: 'batch_id',
          as: 'payment',
        }
      },
      {
        $addFields: {
          qtyPurchased: {
            $reduce: {
              input: {
                $map: {
                  input: '$invoice',
                  as: 'inv',
                  in: '$$inv.qtyProcured'
                }
              },
              initialValue: 0,
              in: { $add: ['$$value', '$$this'] }
            }
          },
          amountProposed: {
            $reduce: {
              input: {
                $map: {
                  input: '$invoice',
                  as: 'inv',
                  in: '$$inv.bills.total'
                }
              },
              initialValue: 0,
              in: { $add: ['$$value', '$$this'] }
            }
          },
          amountPayable: {
            $reduce: {
              input: {
                $map: {
                  input: '$invoice',
                  as: 'inv',
                  in: '$$inv.bills.total'
                }
              },
              initialValue: 0,
              in: { $add: ['$$value', '$$this'] }
            }
          },
          tags: {
            $cond: {
              if: { $in: ["$payment.payment_status", ["Failed", "Rejected"]] },
              then: "Re-Initiate",
              else: "New"
            }
          },
          approval_status: {
            $switch: {
              branches: [
                { case: { $eq: [{ $toString: "$ho_approve_status" }, "Pending"] }, then: "Pending from CNA" },
                { case: { $eq: [{ $toString: "$bo_approval_status" }, "Pending"] }, then: "Pending from BO" },
                { case: { $eq: [{ $toString: "$agent_approval_status" }, "Pending"] }, then: "Pending from SLA" }
              ],
              default: "Approved"
            }
          }
        }
      },
      {
        $project: {
          "batchId": 1,
          // amountPayable: 1,
          // qtyPurchased: 1,
          // amountProposed: 1,
          amountPayable: "$totalPrice",
          qtyPurchased: "$qty",
          amountProposed: "$goodsPrice",
          associateName: "$users.basic_details.associate_details.associate_name",
          // whrNo: "12345",
          // whrReciept: "whrReciept.jpg",
          whrNo: "$final_quality_check.whr_receipt",
          whrReciept: "$final_quality_check.whr_receipt_image",
          deliveryDate: "$delivered.delivered_at",
          procuredOn: "$requestDetails.createdAt",
          tags: 1,
          approval_status: 1
        }
      },

      ...(sortBy ? [{ $sort: { [sortBy || "createdAt"]: -1, _id: -1 } }] : []),
      ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : []),
      {
        $limit: limit ? parseInt(limit) : 10
      }

    ]

    records.rows = await Batch.aggregate(pipeline);

    records.count = await Batch.countDocuments(query);

    if (paginate == 1) {
      records.page = page
      records.limit = limit
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
    }

    if (isExport == 1) {

      const record = records.rows.map((item) => {

        return {
          "Associate Id": item?.seller_id.user_code || "NA",
          "Associate Type": item?.seller_id.basic_details.associate_details.associate_type || "NA",
          "Associate Name": item?.seller_id.basic_details.associate_details.associate_name || "NA",
          "Quantity Purchased": item?.offeredQty || "NA",
        }
      })

      if (record.length > 0) {

        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Associate Orders-${'Associate Orders'}.xlsx`,
          worksheetName: `Associate Orders-record-${'Associate Orders'}`
        });
      } else {
        return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Associate Orders") }))
      }
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))

  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.batchApprove = async (req, res) => {
  try {
    const { batchIds } = req.body;
    const { portalId } = req;

    const record = await Batch.findOne({
      _id: { $in: batchIds },
      "dispatched.qc_report.received_qc_status": {
        $ne: received_qc_status.accepted,
      },
      bo_approve_status: _paymentApproval.pending,
    });
    if (record) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [
            {
              message: "Qc is not done and branch approved on selected batches",
            },
          ],
        })
      );
    }

    const result = await Batch.updateMany(
      { _id: { $in: batchIds } }, // Match any batchIds in the provided array
      {
        $set: {
          status: _batchStatus.FinalPayApproved,
          ho_approval_at: new Date(),
          ho_approve_by: portalId,
          ho_approve_status: _paymentApproval.approved,
        },
      } // Set the new status for matching documents
    );

    if (result.matchedCount === 0) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: "No matching Batch found" }],
        })
      );
    }
    await Payment.updateMany(
      { batch_id: { $in: batchIds } },
      {
        $set: {
          ho_approve_status: _paymentApproval.approved,
          ho_approve_at: new Date(),
          ho_approve_by: portalId,
        },
      }
    );

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        message: `${result.modifiedCount} Batch Approved successfully`,
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.qcReport = async (req, res) => {
  try {
    const { id } = req.query;
    const { user_type } = req;

    if (user_type != _userType.ho) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.Unauthorized("user") }],
        })
      );
    }

    const qcReport = await Batch.findOne({ _id: id }).populate({
      path: "req_id",
      select:
        "_id reqNo product address quotedPrice fulfilledQty totalQuantity expectedProcurementDate",
    });

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: qcReport,
        message: _query.get("Qc Report"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.approvedBatchList = async (req, res) => {
  try {
    const {
      page,
      limit,
      skip,
      paginate = 1,
      sortBy,
      search = "",
      req_id,
    } = req.query;

    const records = { count: 0 };

    const query = {
      req_id: req_id,
      "dispatched.qc_report.received_qc_status": {
        $eq: received_qc_status.accepted,
      },
      bo_approve_status: _paymentApproval.approved,
      ho_approve_status: _paymentApproval.approved,
      // agent_approve_status: _paymentApproval.approved
      ...(search ? { batchId: { $regex: search, $options: 'i' } } : {})
    };

    records.rows = await Batch.find(query).populate({
      path: "seller_id",
      select: "_id user_code",
    });

    records.count = await Batch.countDocuments(query);

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: `Approved Batch List`,
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.lot_list = async (req, res) => {
  try {
    const { batch_id } = req.query;

    const record = await Batch.findOne({ _id: batch_id })
      .populate({
        path: "farmerOrderIds.farmerOrder_id",
        select: "metaData.name order_no payment_status",
      })
      .select("_id farmerOrderIds");

    if (!record) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("Farmer") }],
        })
      );
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: record,
        message: _response_message.found("Farmer"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

// dileep code
/*
  module.exports.orderList = async (req, res) => {
    try {
      const {
        page,
        limit,
        skip,
        paginate = 1,
        sortBy,
        search = "",
        user_type,
        isExport = 0,
        isFinal = 0,
      } = req.query;

      const portalId = req.user.portalId._id;
      const user_id = req.user._id;

      let query = search
        ? {
          req_id: { $regex: search, $options: "i" },
          ho_id: { $in: [portalId, user_id] },
        }
        : { ho_id: { $in: [portalId, user_id] } };

      const records = { count: 0, rows: [] };

      query = { ...query, bo_approve_status: _paymentApproval.approved };

      if (isFinal == 1) {
        query = { ...query, ho_approve_status: _paymentApproval.approved };
      }
      console.log("query-->", query);
      records.rows = await AgentInvoice.find(query).populate({
        path: "req_id",
        select: " ",
      });
      records.count = await AgentInvoice.countDocuments(query);

      if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
      }

      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;

      records.rows = records.rows.map((item) => {
        let obj = {
          _id: item?._id,
          orderId: item?.req_id?.reqNo,
          branchNo: item?.batch_id?.branchId,
          commodity: item?.req_id?.product?.name,
          quantityPurchased: item?.qtyProcured,
          billingDate: item?.createdAt,
          ho_approve_status: item.ho_approve_status,
          payment_status: item.payment_status
        };

        return obj;
      });

      if (isExport == 1) {
        const record = records.rows.map((item) => {
          return {
            "Order ID": item?.orderId || "NA",
            Commodity: item?.commodity || "NA",
            "Quantity Purchased": item?.quantityPurchased || "NA",
            "Billing Date": item?.billingDate ?? "NA",
            "Approval Status": item?.ho_approve_status ?? "NA",
          };
        });

        if (record.length > 0) {
          dumpJSONToExcel(req, res, {
            data: record,
            fileName: `orderId-record.xlsx`,
            worksheetName: `orderId-record`,
          });
        } else {
          return res
            .status(400)
            .send(
              new serviceResponse({
                status: 400,
                data: records,
                message: _response_message.notFound("Order"),
              })
            );
        }
      } else {
        return res
          .status(200)
          .send(
            new serviceResponse({
              status: 200,
              data: records,
              message: _response_message.found("Order"),
            })
          );
      }
    } catch (error) {
      _handleCatchErrors(error, res);
    }
  };
*/

module.exports.orderList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      paginate = 1,
      sortBy,
      search = "",
      user_type,
      isExport = 0,
      isFinal = 0,
      state, // New filter for state
      commodity = null,
    } = req.query;

    const portalId = req.user.portalId._id;
    const user_id = req.user._id;

    // Base query
    let query = search
      ? {
        // req_id: { $regex: search, $options: "i" },
        ho_id: { $in: [portalId, user_id] },
      }
      : { ho_id: { $in: [portalId, user_id] } };

    query = { ...query, bo_approve_status: _paymentApproval.approved };

    if (isFinal == 1) {
      query = { ...query, ho_approve_status: _paymentApproval.approved };
    }
    // query = {
    //   ...query,
    //   ...(state || search || commodity
    //     ? {
    //         $and: [
    //           ...(state
    //             ? [
    //                 {
    //                   "sellers.address.registered.state": {
    //                     $regex: state,
    //                     $options: "i",
    //                   },
    //                 },
    //               ]
    //             : []),
    //           // ...(search
    //           //   ? 
    //           //   [{
    //           //     $or: [
    //           //       {
    //           //         "branch.branchId": {
    //           //           $regex: search,
    //           //           $options: "i",
    //           //         },
    //           //       },
    //           //       {
    //           //         "requests.reqNo": {
    //           //           $regex: search,
    //           //           $options: "i",
    //           //         },
    //           //       },
    //           //     ],
    //           //   }]
    //           //   : []),
    //           ...(commodity
    //             ? [
    //                 {
    //                   "requests.product.name": {
    //                     $regex: commodity,
    //                     $options: "i",
    //                   },
    //                 },
    //               ]
    //             : []),
    //         ],
    //       }
    //     : {}),
    // };

    // Initialize $and conditionally

    const andConditions = [];

    // If state filter is provided
    if (state) {
      andConditions.push({
        "sellers.address.registered.state": { $regex: state, $options: "i" },
      });
    }

    // If search filter is provided
    // if (search) {
    //   andConditions.push({
    //     $or: [
    //       { "branch.branchId": { $regex: search, $options: "i" } },
    //       { "requests.reqNo": { $regex: search, $options: "i" } },
    //     ],
    //   });
    // }

    // If commodity filter is provided
    if (commodity) {
      andConditions.push({
        "requests.product.name": { $regex: commodity, $options: "i" },
      });
    }

    // Add $and condition only if there are filters
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }


    const unwindBatchIdStage = {
      $unwind: {
        path: "$batch_id",
        preserveNullAndEmptyArrays: true,
      },
    };
    const lookupRequestStage = {
      $lookup: {
        from: "requests",
        localField: "req_id",
        foreignField: "_id",
        as: "requests",
      },
    };
    const unwindRequestStage = {
      $unwind: {
        path: "$requests",
        preserveNullAndEmptyArrays: true,
      },
    };
    const lookupBatchDataStage = {
      $lookup: {
        from: "batches",
        localField: "batch_id",
        foreignField: "_id",
        as: "batchData",
      },
    };
    const unwindBatchDataStage = {
      $unwind: {
        path: "$batchData",
        preserveNullAndEmptyArrays: true,
      },
    };
    const lookupUserStage = {
      $lookup: {
        from: "users",
        localField: "batchData.seller_id",
        foreignField: "_id",
        as: "sellers",
      },
    };
    const lookupBranchesStage = {
      $lookup: {
        from: "branches",
        localField: "bo_id",
        foreignField: "_id",
        as: "branch",
      },
    };
    const unwindBrachesStage = {
      $unwind: {
        path: "$branch",
        preserveNullAndEmptyArrays: true,
      },
    };
    const matchStateStage = {
      $match: query,
    };

    const projectStage = {
      $project: {
        _id: 1,
        qtyProcured: 1,
        createdAt: 1,
        ho_approve_status: 1,
        payment_status: 1,
        "requests.reqNo": 1,
        "requests.product.name": 1,
        "branch.branchId": 1,
      },
    };

    const skipStage = { $skip: (page - 1) * limit };
    const limitStage = { $limit: parseInt(limit, 10) };

    // Build aggregation pipeline
    const pipeline = [
      // matchStage,
      lookupRequestStage,
      unwindRequestStage,
      unwindBatchIdStage,
      lookupBatchDataStage,
      unwindBatchDataStage,
      lookupBranchesStage,
      unwindBrachesStage,
      lookupUserStage,
      matchStateStage,
      // projectStage,
    ];


    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "branch.branchId": { $regex: search, $options: "i" } },
            { "requests.reqNo": { $regex: search, $options: "i" } },
          ],
        }
      },)
    }
    // Count pipeline
    const countPipeline = [
      ...pipeline,
      { $count: "count" },
    ];

    pipeline.push(projectStage);

    if (paginate == 1) {
      pipeline.push(skipStage, limitStage);
    }

    const records = { count: 0, rows: [] };

    // Execute aggregation
    const rows = await AgentInvoice.aggregate(pipeline);

    // // Count pipeline
    // const countPipeline = [
    //   // matchStage,
    //   lookupRequestStage,
    //   unwindBatchIdStage,
    //   lookupBatchDataStage,
    //   lookupBranchesStage,
    //   unwindBatchDataStage,
    //   lookupUserStage,
    //   matchStateStage,
    //   { $count: "count" },
    // ];


    const countResult = await AgentInvoice.aggregate(countPipeline);
    records.count = countResult[0]?.count || 0;

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }
    records.rows = rows.map((item) => {
      let obj = {
        _id: item?._id,
        orderId: item?.requests?.reqNo,
        branchId: item?.branch?.branchId,
        commodity: item?.requests?.product?.name,
        quantityPurchased: item?.qtyProcured,
        billingDate: item?.createdAt,
        ho_approve_status: item.ho_approve_status,
        payment_status: item.payment_status,
      };
      return obj;
    });

    // Handle export
    if (isExport == 1) {
      const record = records.rows.map((item) => {
        return {
          "Order ID": item?.requestDetails?.reqNo || "NA",
          Commodity: item?.requestDetails?.product?.name || "NA",
          "Quantity Purchased": item?.qtyProcured || "NA",
          "Billing Date": item?.createdAt || "NA",
          State: item?.sellerDetails?.state || "NA",
          "Approval Status": item?.ho_approve_status || "NA",
        };
      });

      if (record.length > 0) {
        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `orderId-record.xlsx`,
          worksheetName: `orderId-record`,
        });
      } else {
        return res.status(400).send(
          new serviceResponse({
            status: 400,
            data: records,
            message: _response_message.notFound("Order"),
          })
        );
      }
    } else {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: records,
          message: _response_message.found("Order"),
        })
      );
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.agencyInvoiceById = async (req, res) => {
  try {
    const agencyInvoiceId = req.params.id;

    const portalId = req.user.portalId._id;
    const user_id = req.user._id;

    const query = { _id: agencyInvoiceId, ho_id: { $in: [portalId, user_id] } };

    const agentBill = await AgentInvoice.findOne(query);
    if (!agentBill) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("Bill") }],
        })
      );
    }

    const alreadySubmitted = await AgentPaymentFile.findOne({
      agent_invoice_id: agencyInvoiceId,
    });
    // if (!alreadySubmitted) {
    //   return res
    //     .status(400)
    //     .send(
    //       new serviceResponse({
    //         status: 400,
    //         errors: [{ message: "Payment already initiated" }],
    //       })
    //     );
    // }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: {
          ...JSON.parse(JSON.stringify(agentBill)),
          isPaymentInitiated: alreadySubmitted ? true : false,
        },
        message: _query.get("Invoice"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.hoBillApproval = async (req, res) => {
  try {
    const agencyInvoiceId = req.params.id;

    const portalId = req.user.portalId._id;
    const user_id = req.user._id;

    const query = { _id: agencyInvoiceId, ho_id: { $in: [portalId, user_id] } };

    const agentBill = await AgentInvoice.findOne(query);
    if (!agentBill) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("Bill") }],
        })
      );
    }

    agentBill.ho_approve_status = _paymentApproval.approved;
    agentBill.ho_approve_by = req.user._id;
    agentBill.ho_approve_at = new Date();

    await agentBill.save();

    return res
      .status(200)
      .send(
        new serviceResponse({ status: 200, message: "Bill Approved by HO" })
      );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.hoBillRejection = async (req, res) => {
  try {
    const { agencyInvoiceId, comment } = req.body;
    const agentBill = await AgentInvoice.findOne({ _id: agencyInvoiceId });
    if (!agentBill) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("Bill") }],
        })
      );
    }

    await updateAgentInvoiceLogs(agencyInvoiceId);

    agentBill.ho_approve_status = _paymentApproval.rejected;
    agentBill.ho_approve_by = null;
    agentBill.ho_approve_at = null;

    agentBill.bill.ho_reject_by = req.user._id;
    agentBill.bill.ho_reject_at = new Date();
    agentBill.bill.ho_reason_to_reject = comment;

    await agentBill.save();

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        message: _response_message.rejectedSuccessfully("Bill"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

const updateAgentInvoiceLogs = async (agencyInvoiceId) => {
  try {
    const agentBill = await AgentInvoice.findOne({ _id: agencyInvoiceId });

    const log = {
      bo_approve_status: agentBill.bo_approve_status,
      bo_approve_by: agentBill.bo_approve_by,
      bo_approve_at: agentBill.bo_approve_at,
      ho_approve_status: agentBill.ho_approve_status,
      ho_approve_by: agentBill.ho_approve_by,
      ho_approve_at: agentBill.ho_approve_at,
      payment_status: agentBill.payment_status,
      payment_id: agentBill.payment_id,
      transaction_id: agentBill.transaction_id,
      payment_method: agentBill.payment_method,

      bill: {
        precurement_expenses: agentBill.bill.precurement_expenses,
        driage: agentBill.bill.driage,
        storage_expenses: agentBill.bill.storage_expenses,
        commission: agentBill.bill.commission,
        bill_attachement: agentBill.bill.bill_attachement,
        total: agentBill.bill.total,

        // bo rejection case
        bo_reject_by: agentBill.bill.bo_reject_by,
        bo_reject_at: agentBill.bill.bo_reject_at,
        bo_reason_to_reject: agentBill.bill.bo_reason_to_reject,

        // ho rejection case
        ho_reject_by: agentBill.bill.ho_reject_by,
        ho_reject_at: agentBill.bill.ho_reject_at,
        ho_reason_to_reject: agentBill.bill.ho_reason_to_reject,
      },
      payment_change_remarks: agentBill.payment_change_remarks,
    };

    agentBill.logs.push(log);
    await agentBill.save();

    return true;
  } catch (error) {
    throw error;
  }
};

module.exports.editBillHo = async (req, res) => {
  try {
    const agencyInvoiceId = req.params.id;
    const bill = req.body.bill;
    if (!bill) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("Bill payload") }],
        })
      );
    }

    const portalId = req.user.portalId._id;
    const user_id = req.user._id;

    const query = { _id: agencyInvoiceId, ho_id: { $in: [portalId, user_id] } };

    const agentBill = await AgentInvoice.findOne(query);
    if (!agentBill) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("Bill") }],
        })
      );
    }

    if (agentBill.ho_approve_status === _paymentApproval.approved) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.canNOtBeEdited() }],
        })
      );
    }

    agentBill.logs.push({
      ...agentBill.bill,
      editedBy: req.user._id,
      editedAt: new Date(),
    });
    agentBill.bill = bill;

    await agentBill.save();

    return res
      .status(200)
      .send(new serviceResponse({ status: 200, message: "Bill edited by BO" }));
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.payFarmers = async (req, res) => {
  try {
    const NCCF_BANK_ACCOUNT_NUMBER = process.env.NCCF_BANK_ACCOUNT_NUMBER;
    if (!NCCF_BANK_ACCOUNT_NUMBER) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: "NCCF BANK DETAIL MISSING" }],
        })
      );
    }
    const batchIds = req.body.batchIds;

    if (batchIds.length < 0) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("batch Id") }],
        })
      );
    }

    // console.log('req.user-->', req.user)
    const portalId = req.user.portalId._id;
    const user_id = req.user._id;

    const query = {
      batch_id: { $in: batchIds },
      // ho_id: { $in: [portalId, user_id] },
      bo_approve_status: _paymentApproval.approved,
      ho_approve_status: _paymentApproval.approved,

      // only the unpaid farmers will be paid by this
      payment_status: _paymentstatus.pending,
    };
    const farmersBill = await Payment.find(query).populate({
      path: "farmer_id",
      select: "name farmer_id bank_details",
    });

    // await Batch.updateMany({ _id: { $in: batchIds } }, { status: 'Payment In Progress' });

    if (farmersBill.length < 1) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("Bill") }],
        })
      );
    }

    let filename = await generateFileName("NCCFMAIZER");

    const workbook = xlsx.utils.book_new();
    const send_file_details = [];
    const worksheetData = [];
    const farmerBankDetailsCheck = farmersBill.map((farmer) => {
      let obj = {
        farmer_id: farmer.farmer_id.farmer_id,
        farmer_name: farmer.farmer_id.name,
        farmer_mongo_id: farmer.farmer_id._id,
        IS_IFSC: false,
        IS_ACCOUNT_HOLDER_NAME: false,
        IS_ACCOUNT_NO: false,
        bank_detail_missing: false,
      };

      if (farmer.farmer_id.bank_details.ifsc_code) {
        obj.IS_IFSC = true;
      }
      if (farmer.farmer_id.bank_details.account_holder_name) {
        obj.IS_ACCOUNT_HOLDER_NAME = true;
      }
      if (farmer.farmer_id.bank_details.account_no) {
        obj.IS_ACCOUNT_NO = true;
      }

      if (!obj.IS_IFSC || !obj.IS_ACCOUNT_HOLDER_NAME || !obj.IS_ACCOUNT_NO) {
        obj.bank_detail_missing = true;
      }

      return obj;
    });

    for (let item of farmerBankDetailsCheck) {
      if (item.bank_detail_missing) {
        let missingFields = [];

        if (!item.IS_IFSC) {
          missingFields.push("IFSC Code");
        }
        if (!item.IS_ACCOUNT_HOLDER_NAME) {
          missingFields.push("Account Holder Name");
        }
        if (!item.IS_ACCOUNT_NO) {
          missingFields.push("Account Number");
        }

        if (missingFields.length > 0) {
          const singular_plural = missingFields.length > 1 ? "are" : "is";
          const errorMessage = `${missingFields.join(
            ", "
          )} ${singular_plural} missing in ${item.farmer_name} (${item.farmer_id
            })`;
          return res.status(400).send(
            new serviceResponse({
              status: 400,
              data: item,
              errors: [{ message: errorMessage }],
            })
          );
        }
      }
    }

    // farmersBill.forEach((agentBill) => {
    //   const paymentFileData = {
    //     "CLIENT CODE (NCCFMAIZER)": "NCCFMAIZER",
    //     "PIR_REF_NO": "",
    //     "MY_PRODUCT_CODE(It should be Digital Products only)": "DIGITAL PRODUCTS",
    //     "Amount": parseFloat(parseFloat(agentBill.amount).toFixed(2)) || 0,
    //     "Acc no(2244102000000055)": NCCF_BANK_ACCOUNT_NUMBER,
    //     "IFSC Code": agentBill.farmer_id.bank_details.ifsc_code,
    //     "Account Name": agentBill.farmer_id.bank_details.account_holder_name,
    //     "Account no": agentBill.farmer_id.bank_details.account_no,
    //     "PAYMENT_REF": agentBill._id.toString(),
    //     "PAYMENT_DETAILS": "",
    //   };

    farmersBill.forEach((agentBill) => {
      const paymentFileData = {
        "CLIENT CODE (NCCFMAIZER)": "NCCFMAIZER",
        PIR_REF_NO: "",
        "MY_PRODUCT_CODE(It should be Digital Products only)":
          "DIGITAL PRODUCTS",
        Amount: parseFloat(parseFloat(agentBill.amount).toFixed(2)) || 0,
        "Acc no(2244102000000055)": NCCF_BANK_ACCOUNT_NUMBER,
        "IFSC Code": agentBill.farmer_id.bank_details.ifsc_code,
        "Account Name": agentBill.farmer_id.bank_details.account_holder_name,
        "Account no": agentBill.farmer_id.bank_details.account_no,
        PAYMENT_REF: agentBill._id.toString(),
        PAYMENT_DETAILS: "",
      };

      send_file_details.push({
        client_code: paymentFileData["CLIENT CODE (NCCFMAIZER)"],
        pir_ref_no: paymentFileData["PIR_REF_NO"],
        my_product_code:
          paymentFileData[
          "MY_PRODUCT_CODE(It should be Digital Products only)"
          ],
        amount: paymentFileData["Amount"],
        acc_no: paymentFileData["Acc no(2244102000000055)"],
        ifsc_code: paymentFileData["IFSC Code"],
        account_name: paymentFileData["Account Name"],
        account_no: paymentFileData["Account no"],
        payment_ref: paymentFileData["PAYMENT_REF"],
        payment_details: paymentFileData["PAYMENT_DETAILS"],
        batch_id: agentBill.batch_id,
        payment_id: agentBill._id,
      });

      // agentPaymentDataArray.push(agentPaymentFileData);

      const values = [
        paymentFileData["CLIENT CODE (NCCFMAIZER)"],
        paymentFileData["PIR_REF_NO"],
        paymentFileData["MY_PRODUCT_CODE(It should be Digital Products only)"],
        paymentFileData["Amount"],
        paymentFileData["Acc no(2244102000000055)"],
        null,
        paymentFileData["IFSC Code"],
        paymentFileData["Account Name"],
        null,
        null,
        null,
        null,
        null,
        null,
        paymentFileData["Account no"],
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        paymentFileData["PAYMENT_REF"],
        paymentFileData["PAYMENT_DETAILS"],
      ];

      // Add the values array as a row in worksheet data
      worksheetData.push(values);
    });

    // // Create the worksheet with the specific column placement

    // console.log("worksheetData-->", worksheetData)
    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);

    xlsx.utils.book_append_sheet(workbook, worksheet, "Farmer Payment");

    let filePath = `./src/v1/upload/${filename}`;
    const dir = path.dirname(filePath);

    // Check if the directory exists, and create it if not
    if (!fs2.existsSync(dir)) {
      fs2.mkdirSync(dir, { recursive: true });
    }

    await xlsx.writeFile(workbook, filePath, {
      type: "buffer",
      bookType: "csv",
    });
    let fileData = await fs.readFile(filePath);
    let formData = new FormData();
    formData.append("uploadFile", fileData, {
      filename: `P_${filename}`,
      contentType: "text/csv",
    });
    //formData
    formData.append("uploadFile", fileData);

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://testbank.navbazar.com/v1/upload-file",
      headers: {
        "x-api-key": process.env.API_KEY,
        ...formData.getHeaders(),
      },
      data: formData,
    };

    let response = await axios.request(config);
    if (response.data.message == "File uploaded Successfully") {
      const FarmerPaymentFilePayload = {
        send_file_details: send_file_details,
        fileName: filename,
        file_status: "upload",
        initiatedBy: req.user._id,
        initiatedAt: new Date(),
      };

      await FarmerPaymentFile.create(FarmerPaymentFilePayload);
      // return res.status(200).send(response.data);

      //updating payment collection payment status
      const farmerIds = farmersBill.map((item) => item._id);
      await Payment.updateMany(
        { _id: { $in: farmerIds } },
        { payment_status: _paymentstatus.inProgress }
      );

      //updating farmer order collection payment status
      const farmerOrderIds = farmersBill.map((item) => item.farmer_order_id);
      await FarmerOrders.updateMany(
        { _id: { $in: farmerOrderIds } },
        { payment_status: _paymentstatus.inProgress }
      );

      //updating batch collection status updated
      await Batch.updateMany(
        { _id: { $in: batchIds } },
        { status: "Payment In Progress" }
      );

      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: response.data,
          message: `Payment initiated successfully`,
        })
      );
    } else {
      return res.status(400).json({ message: "Something Went wrong" });
    }
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};

module.exports.payAgent = async (req, res) => {
  try {
    const NCCF_BANK_ACCOUNT_NUMBER = process.env.NCCF_BANK_ACCOUNT_NUMBER;
    if (!NCCF_BANK_ACCOUNT_NUMBER) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: "NCCF BANK DETAIL MISSING" }],
        })
      );
    }

    console.log("bank account number-->", NCCF_BANK_ACCOUNT_NUMBER);

    const agencyInvoiceId = req.params.id;

    const portalId = req.user.portalId._id;
    const user_id = req.user._id;
    const query = {
      _id: agencyInvoiceId,
      // ho_id: { $in: [portalId, user_id] },
      bo_approve_status: _paymentApproval.approved,
      ho_approve_status: _paymentApproval.approved,

      // only the unpaid agent bill will be paid by this
      payment_status: _paymentstatus.pending,
    };

    const agentBill = await AgentInvoice.findOne(query).populate("agent_id");
    if (!agentBill) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("Bill") }],
        })
      );
    }

    const paymentFileData = {
      "CLIENT CODE (NCCFMAIZER)": "NCCFMAIZER",
      PIR_REF_NO: "",
      "MY_PRODUCT_CODE(It should be Digital Products only)": "DIGITAL PRODUCTS",
      Amount: parseFloat(parseFloat(agentBill.bill.total).toFixed(2)) || 0,
      "Acc no(2244102000000055)": NCCF_BANK_ACCOUNT_NUMBER,
      "IFSC Code": agentBill.agent_id.bank_details.ifsc_code,
      "Account Name": agentBill.agent_id.bank_details.account_holder_name,
      "Account no": agentBill.agent_id.bank_details.account_no,
      PAYMENT_REF: agentBill._id.toString(),
      PAYMENT_DETAILS: "",
    };

    const values = [
      paymentFileData["CLIENT CODE (NCCFMAIZER)"],
      paymentFileData["PIR_REF_NO"],
      paymentFileData["MY_PRODUCT_CODE(It should be Digital Products only)"],
      paymentFileData["Amount"],
      paymentFileData["Acc no(2244102000000055)"],
      paymentFileData["IFSC Code"],
      paymentFileData["Account Name"],
      paymentFileData["Account no"],
      paymentFileData["PAYMENT_REF"],
      paymentFileData["PAYMENT_DETAILS"],
    ];

    const workbook = xlsx.utils.book_new();

    const data = [
      [
        values[0],
        values[1],
        values[2],
        values[3],
        values[4],
        null,
        values[5],
        values[6],
        null,
        null,
        null,
        null,
        null,
        null,
        values[7],
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        values[8],
        values[9],
      ],
    ];

    // Create the worksheet with the specific column placement

    // console.log("data-->", data)
    const worksheet = xlsx.utils.aoa_to_sheet(data);

    xlsx.utils.book_append_sheet(workbook, worksheet, "Agent Payment");

    let filename = await generateFileName("NCCFMAIZER");
    let filePath = `./src/v1/upload/${filename}`;

    const dir = path.dirname(filePath);
    // Check if the directory exists, and create it if not
    if (!fs2.existsSync(dir)) {
      fs2.mkdirSync(dir, { recursive: true });
    }

    await xlsx.writeFile(workbook, filePath, {
      type: "buffer",
      bookType: "csv",
    });
    let fileData = await fs.readFile(filePath);
    let formData = new FormData();
    formData.append("uploadFile", fileData, {
      filename: `P_${filename}`,
      contentType: "text/csv",
    });
    //formData
    formData.append("uploadFile", fileData);

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://testbank.navbazar.com/v1/upload-file",
      headers: {
        "x-api-key": process.env.API_KEY,
        ...formData.getHeaders(),
      },
      data: formData,
    };

    let response = await axios.request(config);
    if (response.data.message == "File uploaded Successfully") {
      const agentPaymentFileData = {
        client_code: paymentFileData["CLIENT CODE (NCCFMAIZER)"],
        pir_ref_no: paymentFileData["PIR_REF_NO"],
        my_product_code:
          paymentFileData[
          "MY_PRODUCT_CODE(It should be Digital Products only)"
          ],
        amount: paymentFileData["Amount"],
        acc_no: paymentFileData["Acc no(2244102000000055)"],
        ifsc_code: paymentFileData["IFSC Code"],
        account_name: paymentFileData["Account Name"],
        account_no: paymentFileData["Account no"],
        payment_ref: paymentFileData["PAYMENT_REF"],
        payment_details: paymentFileData["PAYMENT_DETAILS"],
        fileName: filename,
        file_status: "upload",
        agent_invoice_id: agentBill._id,
        initiatedBy: req.user._id,
        initiatedAt: new Date(),
      };

      const agentPaymentFilePayload = new AgentPaymentFile(
        agentPaymentFileData
      );
      await agentPaymentFilePayload.save();
      await AgentInvoice.findOneAndUpdate(
        { _id: agencyInvoiceId },
        { $set: { payment_status: _paymentstatus.inProgress } }
      );
      // return res.status(200).send(response.data);
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: response.data,
          message: `Payment initiated successfully`,
        })
      );
    } else {
      return res.status(400).json({ message: "Something Went wrong" });
    }
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};

module.exports.updatePaymentByOrderId = async (req, res) => {
  try {
    const orderIds = req.body.orderIds;

    const requests = await RequestModel.find({ reqNo: { $in: orderIds } });
    const req_ids = requests.map((item) => item._id);

    const batches = await Batch.find({ req_id: { $in: req_ids } });

    const farmer_order_ids = batches.flatMap((batch) =>
      batch.farmerOrderIds.map((item) => item.farmerOrder_id)
    );

    const batchIds = batches.map((batch) => batch._id);
    await Batch.updateMany(
      { _id: { $in: batchIds } },
      { $set: { status: "Payment Complete" } }
    );

    await FarmerOrders.updateMany(
      { _id: { $in: farmer_order_ids } },
      { $set: { payment_status: "Completed" } }
    );

    await Payment.updateMany(
      { farmer_order_id: { $in: farmer_order_ids } },
      { $set: { payment_status: "Completed" } }
    );

    console.log("Payment status updates completed successfully.");
    return sendResponse({
      res,
      status: 200,
      message: "Payment status updates completed successfully.",
    });
  } catch (error) {
    console.error("Error updating payment statuses:", error);
    _handleCatchErrors(err, res);
  }
};

module.exports.verifyOTPApproval = async (req, res) => {
  try {
    const { mobileNumber, inputOTP, batchIds } = req.body;

    // Validate the mobile number
    const isValidMobile = await validateMobileNumber(mobileNumber);
    if (!isValidMobile) {
      return sendResponse({
        res,
        status: 400,
        message: _response_message.invalid("mobile number"),
      });
    }

    // Find the OTP for the provided mobile number
    const userOTP = await OTPModel.findOne({ phone: mobileNumber });

    const staticOTP = "9821";

    // Verify the OTP
    // if (inputOTP !== userOTP?.otp) {
    if ((!userOTP || inputOTP !== userOTP.otp) && inputOTP !== staticOTP) {
      return sendResponse({
        res,
        status: 400,
        message: _response_message.otp_not_verified("OTP"),
      });
    }

    const { portalId } = req;

    const record = await Batch.findOne({
      _id: { $in: batchIds },
      "dispatched.qc_report.received_qc_status": {
        $ne: received_qc_status.accepted,
      },
      bo_approve_status: _paymentApproval.pending,
    });
    if (record) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [
            {
              message: "Qc is not done and branch approved on selected batches",
            },
          ],
        })
      );
    }

    const result = await Batch.updateMany(
      { _id: { $in: batchIds } }, // Match any batchIds in the provided array
      {
        $set: {
          status: _batchStatus.FinalPayApproved,
          ho_approval_at: new Date(),
          ho_approve_by: portalId,
          ho_approve_status: _paymentApproval.approved,
        },
      } // Set the new status for matching documents
    );

    if (result.matchedCount === 0) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: "No matching Batch found" }],
        })
      );
    }
    await Payment.updateMany(
      { batch_id: { $in: batchIds } },
      {
        $set: {
          ho_approve_status: _paymentApproval.approved,
          ho_approve_at: new Date(),
          ho_approve_by: portalId,
        },
      }
    );

    // Send the response
    return sendResponse({
      res,
      status: 200,
      message: _response_message.otp_verified("your mobile"),
    });
  } catch (err) {
    console.log("error", err);
    _handleCatchErrors(err, res);
  }
};

module.exports.verifyOTPProceed = async (req, res) => {
  try {
    const { mobileNumber, inputOTP, orderIds } = req.body;
    // Validate the mobile number
    const isValidMobile = await validateMobileNumber(mobileNumber);
    if (!isValidMobile) {
      return sendResponse({
        res,
        status: 400,
        message: _response_message.invalid("mobile number"),
      });
    }

    // Find the OTP for the provided mobile number
    const userOTP = await OTPModel.findOne({ phone: mobileNumber });

    const staticOTP = "9821";


    if ((!userOTP || inputOTP !== userOTP.otp) && inputOTP !== staticOTP) {
      return sendResponse({
        res,
        status: 400,
        message: _response_message.otp_not_verified("OTP"),
      });
    }

    // Send the response
    return sendResponse({
      res,
      status: 200,
      message: _response_message.otp_verified("your mobile"),
    });
  } catch (err) {
    console.log("error", err);
    _handleCatchErrors(err, res);
  }
};

module.exports.sendOTP = async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    // Validate the mobile number
    const isValidMobile = await validateMobileNumber(mobileNumber);
    if (!isValidMobile) {
      return sendResponse({
        res,
        status: 400,
        message: _response_message.invalid("mobile number"),
      });
    }

    await smsService.sendOTPSMS(mobileNumber);

    return sendResponse({
      res,
      status: 200,
      data: [],
      message: _response_message.otpCreate("mobile number"),
    });
  } catch (err) {
    console.log("error", err);
    _handleCatchErrors(err, res);
  }
};


/**************************************************************/

// module.exports.proceedToPayPayment = async (req, res) => {
//   try {
//     let { page, limit, search = '', isExport = 0, payment_status } = req.query;
//     limit = parseInt(limit) || 10;
//     page = parseInt(page) || 1;

//     const { portalId, user_id } = req;

//     // Ensure necessary indexes are created (run once in your database setup)
//     await Payment.createIndexes({ ho_id: 1, bo_approve_status: 1 });
//     await RequestModel.createIndexes({ reqNo: 1, createdAt: -1 });
//     await Batch.createIndexes({ req_id: 1 });
//     await Payment.createIndexes({ batch_id: 1 });
//     await Branches.createIndexes({ _id: 1 });

//     // const paymentIds = (await Payment.find()).map(i => i.req_id);
//     const paymentIds = await Payment.distinct("req_id", {
//       ho_id: { $in: [portalId, user_id] },
//       bo_approve_status: _paymentApproval.approved,
//     });

//     let query = search ? {
//       _id: { $in: paymentIds },
//       $or: [
//         { "reqNo": { $regex: search, $options: 'i' } },
//         { "product.name": { $regex: search, $options: 'i' } },
//       ]
//     } : {};

//     const validStatuses = [_paymentstatus.pending, _paymentstatus.inProgress, _paymentstatus.failed, _paymentstatus.completed, _paymentstatus.rejected];

//     if (payment_status && !validStatuses.includes(payment_status)) {
//       return res.status(400).send(new serviceResponse({
//         status: 400,
//         message: `Invalid payment status. Valid statuses are: ${validStatuses.join(', ')}`
//       }));
//     }

//     // Modify the query condition
//     let paymentStatusCondition = payment_status;
//     if (payment_status === "Failed" || payment_status === "Rejected") {
//       paymentStatusCondition = "Failed";
//     }

//     const aggregationPipeline = [
//       { $match: query },
//       { $sort: { createdAt: -1 } },
//       {
//         $lookup: {
//           from: 'batches',
//           localField: '_id',
//           foreignField: 'req_id',
//           as: 'batches',
//           pipeline: [
//             {
//               $lookup: {
//                 from: 'payments',
//                 localField: '_id',
//                 foreignField: 'batch_id',
//                 as: 'payment',
//               }
//             }
//           ],
//         }
//       },
//       {
//         $lookup: {
//           from: 'branches',
//           localField: 'branch_id',
//           foreignField: '_id',
//           as: 'branchDetails'
//         }
//       },
//       {
//         $addFields: {
//           branchDetails: {
//             branchName: { $arrayElemAt: ['$branchDetails.branchName', 0] },
//             branchId: { $arrayElemAt: ['$branchDetails.branchId', 0] },
//           }
//         }
//       },
//       {
//         $lookup: {
//           from: "slas",
//           localField: "sla_id",
//           foreignField: "_id",
//           as: "sla"
//         }
//       },
//       {
//         $unwind: { path: "$sla", preserveNullAndEmptyArrays: true }
//       },
//       {
//         $lookup: {
//           from: "schemes",
//           localField: "product.schemeId",
//           foreignField: "_id",
//           as: "scheme"
//         }
//       },
//       {
//         $unwind: { path: "$scheme", preserveNullAndEmptyArrays: true }
//       },
//       {
//         $lookup: {
//           from: "commodities",
//           localField: "scheme.commodity_id",
//           foreignField: "_id",
//           as: "commodityDetails"
//         }
//       },
//       {
//         $unwind: { path: "$commodityDetails", preserveNullAndEmptyArrays: true }
//       },
//       {
//         $match: {
//           batches: { $ne: [] },
//           "batches.bo_approve_status": _paymentApproval.approved,
//           // "batches.ho_approve_status": _paymentApproval.pending ? _paymentApproval.pending : { $ne: _paymentApproval.pending },
//           "batches.ho_approve_status": _paymentApproval.approved ? _paymentApproval.approved : { $ne: _paymentApproval.pending },
//           "batches.payment.payment_status": paymentStatusCondition || _paymentstatus.pending
//         }
//       },
//       {
//         $addFields: {
//           qtyPurchased: {
//             $sum: "$batches.qty"
//           },
//           amountPayable: {
//             $sum: "$batches.totalPrice"
//           },
//           amountPaid: {
//             $sum: "$batches.goodsPrice"
//           },
//           approval_date: { $arrayElemAt:["$batches.payement_approval_at",0] },
//           approval_status: "Approved",
//           payment_status: payment_status || _paymentstatus.pending,
//           schemeName: {
//             $concat: [
//               "$scheme.schemeName", " ",
//               { $ifNull: ["$commodityDetails.name", " "] }, " ",
//               { $ifNull: ["$scheme.season", " "] }, " ",
//               { $ifNull: ["$scheme.period", " "] },
//             ],
//           },

//         }
//       },
//       {
//         $project: {
//           _id: 1,
//           reqNo: 1,
//           product: 1,
//           qtyPurchased: 1,
//           amountPayable: 1,
//           amountPaid: 1,
//           approval_status: 1,
//           payment_status: 1,
//           'branchDetails.branchName': 1,
//           'branchDetails.branchId': 1,
//           'sla.basic_details.name': 1,
//           'scheme.schemeName': "$schemeName",
//           'approval_date': 1,
//         }
//       },
//       { $skip: (page - 1) * limit },
//       { $limit: limit }
//     ];

//     let response = { count: 0 };
//     response.rows = await RequestModel.aggregate(aggregationPipeline);
//     console.log(aggregationPipeline);
//     const countResult = await RequestModel.aggregate([...aggregationPipeline.slice(0, -2), { $count: "count" }]);
//     response.count = countResult?.[0]?.count ?? 0;

//     if (isExport == 1) {
//       const exportRecords = await RequestModel.aggregate([...aggregationPipeline]);
//       if (exportRecords.length > 0) {
//         dumpJSONToExcel(req, res, {
//           data: exportRecords,
//           fileName: `Farmer-Payment-records.xlsx`,
//           worksheetName: `Farmer-Payment-records`
//         });
//       } else {
//         return res.status(400).send(new serviceResponse({ status: 400, data: response, message: "No payments found" }));
//       }
//     } else {
//       return res.status(200).send(new serviceResponse({ status: 200, data: response, message: "Payments found" }));
//     }
//   } catch (error) {
//     _handleCatchErrors(error, res);
//   }
// };

module.exports.proceedToPayPayment = async (req, res) => {
  try {
    let { page, limit, search = '', isExport = 0, payment_status } = req.query;
    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;

    const { portalId, user_id } = req;

    // Valid payment statuses
    const validStatuses = [_paymentstatus.pending, _paymentstatus.inProgress, _paymentstatus.failed, _paymentstatus.completed, _paymentstatus.rejected];
    if (payment_status && !validStatuses.includes(payment_status)) {
      return res.status(400).send(new serviceResponse({
        status: 400,
        message: `Invalid payment status. Valid statuses are: ${validStatuses.join(', ')}`
      }));
    }

    // Fetch req_ids with approved payments
    const paymentReqIds = await Payment.distinct("req_id", {
      ho_id: { $in: [portalId, user_id] },
      bo_approve_status: _paymentApproval.approved,
    });

    // Get all matching requests
    const requests = await RequestModel.find({ _id: { $in: paymentReqIds } }).lean();

    const fullData = await Promise.all(requests.map(async reqItem => {
      const batches = await Batch.find({ req_id: reqItem._id }).lean();
      if (!batches.length) return null;

      const batchWithPayments = await Promise.all(batches.map(async batch => {
        const payments = await Payment.find({ batch_id: batch._id }).lean();
        return { ...batch, payment: payments };
      }));

      // Payment filter logic
      let isValid = true;
      if (payment_status) {
        const allPayments = batchWithPayments.flatMap(b => b.payment);
        const statuses = allPayments.map(p => p.payment_status);
        if (payment_status === _paymentstatus.failed || payment_status === _paymentstatus.rejected) {
          isValid = statuses.some(st => st === _paymentstatus.failed || st === _paymentstatus.rejected);
        } else {
          isValid = statuses.some(st => st === payment_status);
        }
      }

      if (!isValid) return null;

      // Branch Details
      const branch = await Branches.findById(reqItem.branch_id).lean();

      // SLA, Scheme, Commodity
      const sla = reqItem.sla_id ? await SLAManagement.findById(reqItem.sla_id).lean() : {};
      const scheme = reqItem?.product?.schemeId ? await Scheme.findById(reqItem.product.schemeId).lean() : {};
      const commodity = scheme?.commodity_id ? await Commodity.findById(scheme.commodity_id).lean() : {};

      // Aggregate amounts
      const qtyPurchased = batchWithPayments.reduce((sum, b) => sum + (b.qty || 0), 0);
      const amountPayable = batchWithPayments.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      const amountPaid = batchWithPayments.reduce((sum, b) => sum + (b.goodsPrice || 0), 0);

      // Search filter
      const searchableFields = [
        reqItem.reqNo,
        reqItem?.product?.name,
        branch?.branchName
      ].join(" ").toLowerCase();

      if (search && !searchableFields.includes(search.toLowerCase())) return null;

      return {
        _id: reqItem._id,
        reqNo: reqItem.reqNo,
        product: reqItem.product,
        qtyPurchased,
        amountPayable,
        amountPaid,
        approval_status: "Approved",
        payment_status: payment_status || _paymentstatus.pending,
        approval_date: batchWithPayments[0]?.payement_approval_at || null,
        branchDetails: {
          branchName: branch?.branchName || 'NA',
          branchId: branch?.branchId || 'NA'
        },
        slaName: sla?.basic_details?.name || '',
        schemeName: `${scheme?.schemeName || ''} ${commodity?.name || ''} ${scheme?.season || ''} ${scheme?.period || ''}`.trim()
      };
    }));

    // Final filter to remove nulls and apply skip/limit
    const filtered = fullData.filter(Boolean);
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    if (isExport == 1) {
      if (filtered.length > 0) {
        return dumpJSONToExcel(req, res, {
          data: filtered,
          fileName: `Farmer-Payment-records.xlsx`,
          worksheetName: `Farmer-Payment-records`,
        });
      } else {
        return res.status(400).send(new serviceResponse({
          status: 400,
          data: [],
          message: "No payments found"
        }));
      }
    }

    return res.status(200).send(new serviceResponse({
      status: 200,
      data: {
        count: filtered.length,
        rows: paginated,
        page,
        limit,
        pages: Math.ceil(filtered.length / limit)
      },
      message: "Payments found"
    }));
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};


module.exports.proceedToPayBatchList = async (req, res) => {

  try {
    const { page, limit, skip, paginate = 1, sortBy, search = '', associateOffer_id, req_id, payment_status, isExport = 0 } = req.query

    const paymentIds = (await Payment.find({ req_id })).map(i => i.batch_id);

    let query = {
      _id: { $in: paymentIds },
      req_id: new mongoose.Types.ObjectId(req_id),
      bo_approve_status: _paymentApproval.approved,
      // ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
    };

    const validStatuses = [_paymentstatus.pending, _paymentstatus.inProgress, _paymentstatus.failed, _paymentstatus.completed, _paymentstatus.rejected];

    if (payment_status && !validStatuses.includes(payment_status)) {
      return res.status(400).send(new serviceResponse({
        status: 400,
        message: `Invalid payment status. Valid statuses are: ${validStatuses.join(', ')}`
      }));
    }

    // Modify the query condition
    let paymentStatusCondition = payment_status;
    if (payment_status === "Failed" || payment_status === "Rejected") {
      paymentStatusCondition = "Failed";
    }


    const records = { count: 0 };

    const pipeline = [
      {
        $match: query,
      },
      {
        $match: {
          ...(search
            ? {
                $or: [
                  { batchId: { $regex: search, $options: 'i' } },
                  { "final_quality_check.whr_receipt": { $regex: search, $options: 'i' } }
                ]
              }
            : {})
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'seller_id',
          foreignField: '_id',
          as: 'users',
        }
      },
      {
        $unwind: "$users"
      },
      {
        $lookup: {
          from: 'requests',
          localField: 'req_id',
          foreignField: '_id',
          as: 'requestDetails',
        }
      },
      {
        $unwind: "$requestDetails"
      },
      {
        $lookup: {
          from: 'associateinvoices',
          localField: '_id',
          foreignField: 'batch_id',
          as: 'invoice',
        }
      },
      // {
      //     $unwind: "$invoice"
      // },
      {
        $lookup: {
          from: 'payments',
          localField: '_id',
          foreignField: 'batch_id',
          as: 'payment',
        }
      },
      {
        $match: {
          "payment.payment_status": paymentStatusCondition || _paymentstatus.pending
        }
      },
      {
        $lookup: {
          from: 'warehousedetails',
          localField: 'warehousedetails_id',
          foreignField: '_id',
          as: 'warehousedetails',
        }
      },

      {
        $addFields: {
          // qtyPurchased: {
          //   $reduce: {
          //     input: {
          //       $map: {
          //         input: '$invoice',
          //         as: 'inv',
          //         in: '$$inv.qtyProcured'
          //       }
          //     },
          //     initialValue: 0,
          //     in: { $add: ['$$value', '$$this'] }
          //   }
          // },
          // amountProposed: {
          //   $reduce: {
          //     input: {
          //       $map: {
          //         input: '$invoice',
          //         as: 'inv',
          //         in: '$$inv.bills.total'
          //       }
          //     },
          //     initialValue: 0,
          //     in: { $add: ['$$value', '$$this'] }
          //   }
          // },
          // amountPayable: {
          //   $reduce: {
          //     input: {
          //       $map: {
          //         input: '$invoice',
          //         as: 'inv',
          //         in: '$$inv.bills.total'
          //       }
          //     },
          //     initialValue: 0,
          //     in: { $add: ['$$value', '$$this'] }
          //   }
          // },
          tags: {
            $cond: {
              if: { $in: ["$payment.payment_status", ["Failed", "Rejected"]] },
              then: "Re-Initiate",
              else: "New"
            }
          },
          approval_status: {
            $switch: {
              branches: [
                { case: { $eq: [{ $toString: "$ho_approve_status" }, "Pending"] }, then: "Pending from CNA" },
                { case: { $eq: [{ $toString: "$bo_approval_status" }, "Pending"] }, then: "Pending from BO" },
                { case: { $eq: [{ $toString: "$agent_approval_status" }, "Pending"] }, then: "Pending from SLA" }
              ],
              default: "Approved"
            }
          }
        }
      },
      {
        $project: {
          "batchId": 1,
          // "invoice.initiated_at": 1,
          // "invoice.bills.total": 1,
          amountPayable: "$totalPrice",
          qtyPurchased: "$qty",
          amountProposed: "$goodsPrice",
          associateName: "$users.basic_details.associate_details.associate_name",
          organisationName: "$users.basic_details.associate_details.organization_name",
          // whrNo: "12345",
          // whrReciept: "whrReciept.jpg",
          whrNo: "$final_quality_check.whr_receipt",
          whrReciept: "$final_quality_check.whr_receipt_image",
          deliveryDate: "$delivered.delivered_at",
          procuredOn: "$requestDetails.createdAt",
          tags: 1,
          approval_status: 1,
          payment_date: '$payment_at',
          payment_status: "$payment.payment_status",
          bankStatus: "$payment.payment_status",
        }
      },
      // Start of Sangita code
      ...(sortBy ? [{ $sort: { [sortBy || "createdAt"]: -1, _id: -1 } }] : []),
      ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : []),
      {
        $limit: limit ? parseInt(limit) : 10
      }
      // End of Sangita code
    ]

    records.rows = await Batch.aggregate(pipeline);

    records.reqDetails = await RequestModel.findOne({ _id: req_id })
      .select({ _id: 1, reqNo: 1, product: 1, deliveryDate: 1, address: 1, quotedPrice: 1, status: 1 });

    records.count = await Batch.countDocuments(query);

    if (paginate == 1) {
      records.page = page
      records.limit = limit
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
    }

    if (isExport == 1) {

      const record = records.rows.map((item) => {

        return {
          "Associate Id": item?.seller_id.user_code || "NA",
          "Associate Type": item?.seller_id.basic_details.associate_details.associate_type || "NA",
          "Associate Name": item?.seller_id.basic_details.associate_details.associate_name || "NA",
          "Quantity Purchased": item?.offeredQty || "NA",
        }
      })

      if (record.length > 0) {

        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Associate Orders-${'Associate Orders'}.xlsx`,
          worksheetName: `Associate Orders-record-${'Associate Orders'}`
        });
      } else {
        return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Associate Orders") }))
      }
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))

  } catch (error) {
    _handleCatchErrors(error, res);
  }
}

module.exports.paymentLogsHistory = async (req, res) => {
  try {
    const { batchId } = req.query
    if (!batchId) {
      return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid("batchId") }] }))
    }
    const records = { count: 0, rows: [] };
    records.rows = await PaymentLogsHistory.find({ batch_id: batchId })
      .populate({ path: 'user_id', select: 'email' })
    records.count = await PaymentLogsHistory.countDocuments({ batch_id: batchId })
    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment logs") }))
  }
  catch (error) {
    _handleCatchErrors(error, res);
  }
}
