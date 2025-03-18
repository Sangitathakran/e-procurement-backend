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


module.exports.payment = async (req, res) => {
  try {
    let { page = 1, limit = 50, search = "", isExport = 0 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

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
      ...(search ? { reqNo: { $regex: search, $options: "i" } } : {}),
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
      { $match: { "batches.0": { $exists: true } } }, // Ensure there are batches
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
          overall_payment_status: 1
        },
      },
      { $sort: { payment_status: -1, createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    const records = await RequestModel.aggregate(aggregationPipeline);

    // Step 5: Prepare Response
    const response = {
      count: totalCount,
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

module.exports.batchList = async (req, res) => {
  try {
    const {
      page,
      limit,
      skip,
      paginate = 1,
      sortBy,
      search = "",
      associateOffer_id,
    } = req.query;
    const { user_type, portalId, user_id } = req;

    const paymentIds = (
      await Payment.find({
        ho_id: { $in: [portalId, user_id] },
        associateOffers_id: associateOffer_id,
        bo_approve_status: _paymentApproval.approved,
      })
    ).map((i) => i.batch_id);
    let query = {
      _id: { $in: paymentIds },
      associateOffer_id,
      ...(search ? { order_no: { $regex: search, $options: "i" } } : {}), // Search functionality
    };
    const records = { count: 0 };

    records.rows =
      paginate == 1
        ? await Batch.find(query)
          .sort(sortBy)
          .skip(skip)
          .select(
            "_id procurementCenter_id batchId delivered.delivered_at qty goodsPrice totalPrice payement_approval_at payment_approve_by bo_approve_status ho_approve_status"
          )
          .limit(parseInt(limit))
        : await Batch.find(query).sort(sortBy);

    records.count = await Batch.countDocuments(query);

    records.rows = await Promise.all(
      records.rows.map(async (item) => {
        let paidFarmer = 0;
        let unPaidFarmer = 0;
        let rejectedFarmer = 0;
        let totalFarmer = 0;
        const paymentData = await Payment.find({
          ho_id: { $in: [portalId, user_id] },
          associateOffers_id: associateOffer_id,
          bo_approve_status: _paymentApproval.approved,
        });

        paymentData.forEach((item) => {
          if (item.payment_status === _paymentstatus.completed) {
            paidFarmer += 1;
          }
          if (
            item.payment_status === _paymentstatus.pending ||
            item.payment_status === _paymentstatus.rejected
          ) {
            unPaidFarmer += 1;
          }
          if (item.payment_status === _paymentstatus.rejected) {
            rejectedFarmer += 1;
          }

          totalFarmer += 1;
        });

        return {
          ...JSON.parse(JSON.stringify(item)),
          paidFarmer,
          unPaidFarmer,
          rejectedFarmer,
          totalFarmer,
        };
      })
    );

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _query.get("Payment"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};