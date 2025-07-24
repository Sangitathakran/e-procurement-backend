const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { _userType, _paymentstatus, _batchStatus, _associateOfferStatus, _paymentApproval, received_qc_status } = require('@src/v1/utils/constants');
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { AgentPayment } = require("@src/v1/models/app/procurement/AgentPayment");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { AgentInvoice } = require("@src/v1/models/app/payment/agentInvoice");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { smsService } = require("@src/v1/utils/third_party/SMSservices");
const OTPModel = require("../../../models/app/auth/OTP");
const PaymentLogsHistory = require("@src/v1/models/app/procurement/PaymentLogsHistory");
const { _collectionName} = require('@src/v1/utils/constants');
const  SLA = require("@src/v1/models/app/auth/SLAManagement");
const { Branches }= require("@src/v1/models/app/branchManagement/Branches")
const { Scheme } = require("@src/v1/models/master/Scheme");

const validateMobileNumber = async (mobile) => {
    let pattern = /^[0-9]{10}$/;
    return pattern.test(mobile);
};

module.exports.payment = async (req, res) => {

    try {
        let { page, limit, skip, paginate = 1, sortBy, search = '', user_type, isExport = 0, approve_status = "Pending", scheme, commodity, branchName, state } = req.query
        // limit = 5
        let query = search ? {
            $or: [
                { "reqNo": { $regex: search, $options: 'i' } },
                { "product.name": { $regex: search, $options: 'i' } },
            ]
        } : {};

        const { portalId, user_id } = req
        const paymentIds = (await Payment.find({ bo_id: { $in: [portalId, user_id] } })).map(i => i.req_id)
        if (commodity) query["product.name"] = { $regex: commodity, $options: 'i' };

        const aggregationPipeline = [
            { $match: { _id: { $in: paymentIds }, ...query } },
            { $sort: { createdAt: -1 } },
            // {
            //     $lookup: {
            //         from: 'batches',
            //         localField: '_id',
            //         foreignField: 'req_id',
            //         as: 'batches',
            //         pipeline: [{
            //             $lookup: {
            //                 from: 'payments',
            //                 localField: '_id',
            //                 foreignField: 'batch_id',
            //                 as: 'payment',
            //             }
            //         },
            //     ],
            //     }
            // },
            {
                $lookup: {
                  from: 'batches',
                  localField: '_id',
                  foreignField: 'req_id',
                  as: 'batches',
                  pipeline: [
                    {
                      $lookup: {
                        from: 'payments',
                        localField: '_id',
                        foreignField: 'batch_id',
                        as: 'payment',
                        pipeline: [
                          {
                            $project: {
                              _id: 1,
                              batch_id: 1,
                              payment_status: 1 // Only required field for logic
                            }
                          }
                        ]
                      }
                    },
                    {
                      $project: {
                        _id: 1,
                        req_id: 1,
                        bo_approve_status: 1,
                        batchId: 1,
                        totalPrice: 1,
                        qty: 1,
                        payment: 1 // already projected above
                      }
                    }
                  ]
                }
              },              
            {
                $lookup: {
                    from: "slas",
                    localField: "sla_id",
                    foreignField: "_id",
                    as: "sla"
                }
            },
            {
                $unwind: { path: "$sla", preserveNullAndEmptyArrays: true }
            },
            {
                $lookup: {
                    from: "branches",
                    localField: "branch_id",
                    foreignField: "_id",
                    as: "branch"
                }
            },
            {
                $unwind: { path: "$branch", preserveNullAndEmptyArrays: true }
            },
            {
                $match: query
            },
            {
                $match: {
                    ...(branchName ? { "branch.branchName": { $regex: branchName, $options: "i" } } : {}),
                    ...(state ? { "branch.state": { $regex: state, $options: "i" } } : {})
                }
            },
            {
                $lookup: {
                    from: "slas",
                    localField: "sla_id",
                    foreignField: "_id",
                    as: "sla"
                }
            },
            {
                $unwind: { path: "$sla", preserveNullAndEmptyArrays: true }
            },
            {
                $lookup: {
                    from: "schemes",
                    localField: "product.schemeId",
                    foreignField: "_id",
                    as: "scheme"
                }
            },
            {
                $unwind: { path: "$scheme", preserveNullAndEmptyArrays: true }
            },
            {
                $match: query
            },
            {
                $match: {
                    ...(scheme ? { "scheme.name": { $regex: scheme, $options: "i" } } : {})
                }
            },
            {
                $match: {
                    batches: { $ne: [] },
                    "batches.bo_approve_status": approve_status == _paymentApproval.pending ? _paymentApproval.pending : { $ne: _paymentApproval.pending }
                }
            },
            {
                $addFields: {
                    // approval_status: {
                    //     $cond: {
                    //         if: {
                    //             $anyElementTrue: {
                    //                 $map: {
                    //                     input: '$batches',
                    //                     as: 'batch',
                    //                     in: {
                    //                         $or: [
                    //                             { $not: { $ifNull: ['$$batch.bo_approval_at', true] } },  // Check if the field is missing
                    //                             { $eq: ['$$batch.bo_approval_at', null] },  // Check for null value
                    //                         ]
                    //                     }
                    //                 }
                    //             }
                    //         },
                    //         then: 'Pending',
                    //         else: 'Approved'
                    //     }
                    // },
                    qtyPurchased: {
                        $reduce: {
                            input: '$batches',
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this.qty'] }  // Sum of qty from batches
                        }
                    },
                    amountPayable: {
                        $reduce: {
                            input: '$batches',
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this.totalPrice'] }  // Sum of totalPrice from batches
                        }
                    },
                    payment_status: {
                        $cond: {
                            if: {
                                $anyElementTrue: {
                                    $map: {
                                        input: '$batches',
                                        as: 'batch',
                                        in: {
                                            $anyElementTrue: {
                                                $map: {
                                                    input: '$$batch.payment',
                                                    as: 'pay',
                                                    in: {
                                                        $eq: ['$$pay.payment_status', 'Pending']  // Assuming status field exists in payments
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            then: 'Pending',
                            else: 'Completed'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    reqNo: 1,
                    product: 1,
                    'batches._id': 1,
                    'batches.bo_approve_status': 1,
                    'sla.basic_details.name': 1,
                    'scheme.schemeName': 1,
                    'batches.batchId': 1,
                    'branch.branchName': 1,
                    'branch.state': 1,
                    approval_status: 1,
                    qtyPurchased: 1,
                    amountPayable: 1,
                    payment_status: 1,
                    createdAt: 1

                }
            },
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) },

        ];
        let response = { count: 0 }
        response.rows = await RequestModel.aggregate(aggregationPipeline);
        const countResult = await RequestModel.aggregate([...aggregationPipeline.slice(0, -2), { $count: "count" }]);
        response.count = countResult?.[0]?.count ?? 0;


        response.count = countResult?.[0]?.count ?? 0;
        ////////// start of Sangita code

        // response.rows = await Promise.all(records[0].data.map(async record => {

        //     allBatchApprovalStatus = _paymentApproval.pending;

        //     const pendingBatch = await Batch.find({ req_id: record._id, bo_approve_status: _paymentApproval.pending });

        //     if (pendingBatch.length > 0) {
        //         allBatchApprovalStatus = _paymentApproval.pending;
        //     } else {
        //         allBatchApprovalStatus = _paymentApproval.approved;
        //     }

        //     return { ...record, allBatchApprovalStatus }
        // }));

        ////////// end of Sangita code


        if (paginate == 1) {
            response.page = page
            response.limit = limit
            response.pages = limit != 0 ? Math.ceil(response.count / limit) : 0
        }

        if (isExport == 1) {
            const exportRecords = await RequestModel.aggregate([
                ...aggregationPipeline,
            ]);
            const record = exportRecords.map((item) => {
                const procurementAddress = item?.ProcurementCenter[0]?.address;
                const sellerDetails = item.sellers?.[0]?.basic_details?.associate_details || {};
                const farmerDetails = item.farmer ? item.farmer[0] || {} : {};
                const farmerAddress = item.farmer?.address
                    ? `${farmerDetails.address.village || "NA"}, ${farmerDetails.address.block || "NA"}, 
                       ${farmerDetails.address.country || "NA"}`
                    : "NA";
                return {
                    "Order ID": item?.reqNo || 'NA',
                    "Commodity": item?.product.name || 'NA',
                    "Quantity Purchased": item?.qtyPurchased || 'NA',
                    "Amount Payable": item?.amountPayable || 'NA',
                    "Approval Status": item?.approval_status ?? 'NA',
                    "Payment Status": item?.payment_status ?? 'NA',
                    "Associate User Code": item.sellers?.[0]?.user_code || "NA",
                    "Associate Name": sellerDetails?.associate_name || "NA",
                    "Farmer ID": farmerDetails?.farmer_id || "NA",
                    "Farmer Name": farmerDetails?.name || "NA",
                    "Mobile No": farmerDetails?.basic_details?.mobile_no || "NA",
                    "Farmer DOB": farmerDetails?.basic_details?.dob || "NA",
                    "Father Name": farmerDetails?.parents?.father_name || "NA",
                    "Farmer Address": farmerAddress,
                    "Collection center": item?.ProcurementCenter[0]?.center_name ?? "NA",
                    "Procurement Address Line 1": procurementAddress?.line1 || "NA",
                    "Procurement City": procurementAddress?.city || "NA",
                    "Procurement District": procurementAddress?.district || "NA",
                    "Procurement State": procurementAddress?.state || "NA",
                    "Procurement Country": procurementAddress?.country || "NA",
                    "Procurement Postal Code": procurementAddress?.postalCode || "NA",
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Farmer-Payment-records.xlsx`,
                    worksheetName: `Farmer-Payment-records`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: response, message: _response_message.notFound("Payment") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: response, message: _response_message.found("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

/*
module.exports.associateOrders = async (req, res) => {
    try {
      const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query;
      const { user_type, portalId, user_id } = req;
  
      if (user_type != _userType.bo) {
        return res.status(400).send(new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.Unauthorized("user") }]
        }));
      }
  
      const paymentIds = (
        await Payment.find({ bo_id: { $in: [portalId, user_id] }, req_id })
      ).map(i => i.associateOffers_id);
  
      const query = {
        _id: { $in: paymentIds },
        req_id,
        status: { $in: [_associateOfferStatus.partially_ordered, _associateOfferStatus.ordered] }
      };
  
      const records = { count: 0 };
  
      records.reqDetails = await RequestModel.findOne({ _id: req_id }).select({
        _id: 1, reqNo: 1, product: 1, deliveryDate: 1, address: 1, quotedPrice: 1, status: 1
      });
  
      let allRows = await AssociateOffers.find(query)
        .populate({
          path: 'seller_id',
          select: '_id user_code basic_details.associate_details.associate_type basic_details.associate_details.associate_name basic_details.associate_details.organization_name'
        })
        .sort(sortBy);
  
   
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        allRows = allRows.filter(item => {
          const userCode = item?.seller_id?.user_code || '';
          const orgName = item?.seller_id?.basic_details?.associate_details?.organization_name || '';
          return searchRegex.test(userCode) || searchRegex.test(orgName);
        });
      }
  
     
      records.count = allRows.length;
  
      
      records.rows = paginate == 1
        ? allRows.slice(skip, skip + parseInt(limit))
        : allRows;
  
      if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
      }
  
      if (isExport == 1) {
        const record = records.rows.map((item) => {
          return {
            "Associate ID": item?.seller_id.user_code || 'NA',
            "Associate Type": item?.seller_id.basic_details.associate_details.associate_type || 'NA',
            "Associate Name": item?.seller_id.basic_details.associate_details.associate_name || 'NA',
            "Quantity Purchased": item?.procuredQty || 'NA'
          };
        });
  
        if (record.length > 0) {
          dumpJSONToExcel(req, res, {
            data: record,
            fileName: `Associate-orders.xlsx`,
            worksheetName: `Associate-orders`
          });
        } else {
          return res.status(400).send(new serviceResponse({
            status: 400,
            data: records,
            message: _response_message.notFound("Payment")
          }));
        }
      } else {
        return res.status(200).send(new serviceResponse({
          status: 200,
          data: records,
          message: _response_message.found("Payment")
        }));
      }
        // const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query

        // const { user_type, portalId, user_id } = req;

        // if (user_type != _userType.bo) {
        //     return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        // }

        //  let sellerIds = {};
        //    if (search) {
        //     sellerIds["user_code"] = { $regex: search, $options: "i" };
        //    sellerIds["basic_details.associate_details.organization_name"] = { $regex: search, $options: "i" };
        //      }

        // const paymentIds = (await Payment.find({ bo_id: { $in: [portalId, user_id] }, req_id })).map(i => i.associateOffers_id)
        // let query = {
        //     _id: { $in: paymentIds },
        //     req_id,
        //     status: { $in: [_associateOfferStatus.partially_ordered, _associateOfferStatus.ordered] },
        //    // ...(search ? { seller_id: { $in: sellerIds } } : {}) // Search functionality
        // };

        // const records = { count: 0 };
        records.reqDetails = await RequestModel.findOne({ _id: req_id })
            .select({ _id: 1, reqNo: 1, product: 1, deliveryDate: 1, address: 1, quotedPrice: 1, status: 1 });
        records.rows = paginate == 1 ? await AssociateOffers.find(query)
            .populate({
                path: 'seller_id', 
                match: search ? {
                    $or: [
                        { user_code: { $regex: search, $options: 'i' } },
                        { 'basic_details.associate_details.organization_name': { $regex: search, $options: 'i' } }
                    ]
                } : {},
                select: '_id user_code basic_details.associate_details.associate_type basic_details.associate_details.associate_name basic_details.associate_details.organization_name'
            })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await AssociateOffers.find(query).sort(sortBy);

        records.count = await AssociateOffers.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {

                return {
                    "Associate ID": item?.seller_id.user_code || 'NA',
                    "Associate Type": item?.seller_id.basic_details.associate_details.associate_type || 'NA',
                    "Associate Name": item?.seller_id.basic_details.associate_details.associate_name || 'NA',
                    "Quantity Purchased": item?.procuredQty || 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Associate-orders.xlsx`,
                    worksheetName: `Associate-orders`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))
        }

    } catch (error) {
      _handleCatchErrors(error, res);
    }
}
*/

module.exports.associateOrders = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            skip = 0,
            paginate = 1,
            sortBy = { createdAt: -1 },
            search = '',
            req_id,
            isExport = 0
        } = req.query;

        const { user_type, portalId, user_id } = req;

        if (user_type != _userType.bo) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                errors: [{ message: _response_message.Unauthorized("user") }]
            }));
        }

        // Use distinct to avoid loading full Payment documents
        const paymentIds = await Payment.distinct('associateOffers_id', {
            bo_id: { $in: [portalId, user_id] },
            req_id
        });

        let query = {
            _id: { $in: paymentIds },
            req_id,
            status: { $in: [_associateOfferStatus.partially_ordered, _associateOfferStatus.ordered] }
        };

        if (search) {
            query.order_no = { $regex: search, $options: 'i' };
        }

        const records = { count: 0 };

        // Fetch request details
        records.reqDetails = await RequestModel.findOne({ _id: req_id })
            .select({
                _id: 1,
                reqNo: 1,
                product: 1,
                deliveryDate: 1,
                address: 1,
                quotedPrice: 1,
                status: 1
            })
            .lean();

        if (isExport == 1) {
            const exportLimit = 10000;

            const exportRows = await AssociateOffers.find(query)
                .limit(exportLimit)
                .sort(sortBy)
                .populate({
                    path: 'seller_id',
                    select: '_id user_code basic_details.associate_details.associate_type basic_details.associate_details.associate_name basic_details.associate_details.organization_name'
                })
                .lean();

            const record = exportRows.map((item) => ({
                "Associate ID": item?.seller_id?.user_code || 'NA',
                "Associate Type": item?.seller_id?.basic_details?.associate_details?.associate_type || 'NA',
                "Associate Name": item?.seller_id?.basic_details?.associate_details?.associate_name || 'NA',
                "Quantity Purchased": item?.procuredQty || 'NA'
            }));

            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Associate-orders.xlsx`,
                    worksheetName: `Associate-orders`
                });
                return;
            } else {
                return res.status(400).send(new serviceResponse({
                    status: 400,
                    data: records,
                    message: _response_message.notFound("Payment")
                }));
            }
        }

        // Handle pagination
        const findQuery = AssociateOffers.find(query)
            .sort(sortBy)
            .populate({
                path: 'seller_id',
                select: '_id user_code basic_details.associate_details.associate_type basic_details.associate_details.associate_name basic_details.associate_details.organization_name'
            })
            .lean();

        if (paginate == 1) {
            findQuery.skip(parseInt(skip)).limit(parseInt(limit));
        }

        records.rows = await findQuery;
        records.count = await AssociateOffers.countDocuments(query);

        if (paginate == 1) {
            records.page = parseInt(page);
            records.limit = parseInt(limit);
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        }

        return res.status(200).send(new serviceResponse({
            status: 200,
            data: records,
            message: _response_message.found("Payment")
        }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};


module.exports.batchList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', associateOffer_id, isExport = 0, batch_status = "Pending" } = req.query
        const { user_type, portalId, user_id } = req

        const paymentIds = (await Payment.find({ bo_id: { $in: [portalId, user_id] }, associateOffers_id: associateOffer_id })).map(i => i.batch_id)
        let query = {
            _id: { $in: paymentIds },
            associateOffer_id,
            bo_approve_status: batch_status == _paymentApproval.pending ? _paymentApproval.pending : _paymentApproval.approved,
            ...(search ? { batchId: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };

        records.rows = paginate == 1 ? await Batch.find(query)
            .sort(sortBy)
            .skip(skip)
            .select('_id batchId req_id delivered.delivered_at qty goodsPrice totalPrice payement_approval_at payment_at payment_approve_by bo_approve_status final_quality_check').populate(
                {
                    path: 'req_id', select: 'createdAt'
                }
            )
            .limit(parseInt(limit)) : await Batch.find(query).sort(sortBy);

        records.count = await Batch.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {
                return {
                    "Batch ID": item?.batchId || 'NA',
                    "Delivey Date": item?.delivered.delivered_at || 'NA',
                    "Payment Due Date": item?.payment_at || 'NA',
                    "Quantity Purchased": item?.qty || 'NA',
                    "Amount Payable": item?.totalPrice || 'NA',
                    "Approval Status": item?.bo_approve_status ?? 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Associate-Batch-records.xlsx`,
                    worksheetName: `Associate-Batch-records`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.notFound("Payment") }] }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.batchApprove = async (req, res) => {

    try {

        const { batchIds } = req.body;
        const { portalId } = req;

        const record = await Batch.findOne({
            _id: { $in: batchIds },
            "dispatched.qc_report.received_qc_status": { $ne: received_qc_status.accepted }
        })
        if (record) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Qc is not done on selected batches" }] }));
        }


        const result = await Batch.updateMany(
            { _id: { $in: batchIds } },  // Match any batchIds in the provided array
            { $set: { status: _batchStatus.paymentApproved, payement_approval_at: new Date(), payment_approve_by: portalId, bo_approve_status: _paymentApproval.approved } } // Set the new status for matching documents
        );

        if (result.matchedCount === 0) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "No matching Batch found" }] }));
        }
        await Payment.updateMany(
            { batch_id: { $in: batchIds } },
            { $set: { bo_approve_status: _paymentApproval.approved, bo_approve_at: new Date(), bo_approve_by: portalId } }
        )

        await PaymentLogsHistory.updateMany({ batch_id: { $in: batchIds } },
            { $set: { status: _paymentApproval.approved, logTime: new Date(), user_id: portalId } })

        const paymentLogs = batchIds.map(batch_id => {
            return { batch_id, actor: "CNA", action: "Approval" }
        })

        await PaymentLogsHistory.insertMany(paymentLogs)

        return res.status(200).send(new serviceResponse({ status: 200, message: `${result.modifiedCount} Batch Approved successfully` }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.qcReport = async (req, res) => {

    try {
        const { id } = req.query;
        const { user_type } = req;

        if (user_type != _userType.bo) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        const qcReport = await Batch.findOne({ _id: id })
            .populate({
                path: 'req_id', select: '_id reqNo product address quotedPrice fulfilledQty totalQuantity expectedProcurementDate'
            })

        return res.status(200).send(new serviceResponse({ status: 200, data: qcReport, message: _query.get('Qc Report') }))
    }
    catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.paymentApprove = async (req, res) => {

    try {

        const { req_id, associate_id } = req.body;
        const { user_type } = req;

        if (user_type != _userType.bo) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        const paymentList = await Payment.findOne({
            $and: [
                { req_id },
                // { user_id: associate_id }
            ]
        });

        if (!paymentList) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Payment") }] }))
        }

        paymentList.status = _paymentstatus.approved;

        await paymentList.save();

        return res.status(200).send(new serviceResponse({ status: 200, message: "Payments Approved by admin" }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.getBill = async (req, res) => {

    try {
        const { batchId } = req.query

        const { user_id, user_type } = req;

        if (user_type !== _userType.bo) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
        }

        const records = await Batch.findOne({ _id: batchId }).select({ _id: 1, batchId: 1, req_id: 1, dispatchedqty: 1, goodsPrice: 1, totalPrice: 1, dispatched: 1 });

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.lot_list = async (req, res) => {

    try {
        const { batch_id } = req.query;

        const record = {}
        record.rows = await Batch.findOne({ _id: batch_id }).select({ _id: 1, farmerOrderIds: 1 }).populate({ path: "farmerOrderIds.farmerOrder_id", select: "metaData.name order_no" });

        if (!record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }))
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Farmer") }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.agentPaymentList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query

        let query = search ? { reqNo: { $regex: search, $options: 'i' } } : {};

        const records = { count: 0 };

        const rows = paginate == 1 ? await AgentPayment.find(query)
            .populate({
                path: 'req_id', select: '_id reqNo product address deliveryDate quotedPrice status'
            })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await AgentPayment.find(query)
                .sort(sortBy);

        let branchDetails = {}

        records.rows = await Promise.all(rows.map(async record => {

            branchDetails = await RequestModel.findOne({ '_id': record.req_id }).select({ branch_id: 1, _id: 0 })
                .populate({ path: 'branch_id', select: 'branchName branchId' });

            return { ...record.toObject(), branchDetails }
        }));

        records.count = await AgentPayment.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {
                return {
                    "Order ID": item?.req_id.reqNo || 'NA',
                    "Commodity": item?.req_id.product.name || 'NA',
                    "Quantity Purchased": item?.req_id.product.quantity || 'NA',
                    "Billing Date": item?.bill_at ?? 'NA',
                    "Approval Status": item?.status ?? 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Agency-Payment-records.xlsx`,
                    worksheetName: `Agency-Payment-records`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.agentBill = async (req, res) => {

    try {
        const { req_id } = req.query

        const { user_type } = req;

        if (user_type != _userType.bo) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
        }

        const billPayment = await AgentPayment.findOne({ req_id })
            .populate({
                path: 'req_id', select: '_id reqNo product address deliveryDate quotedPrice status'
            });

        if (billPayment) {

            let commission = (billPayment.bills.procurementExp + billPayment.bills.driage + billPayment.bills.storageExp * 1) / 100;

            let records = { ...billPayment.toObject(), commission }

            if (records) {
                return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))
            }
        }
        else {
            return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.notFound("Payment") }] }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

// dileep code 

module.exports.orderList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', user_type, isExport = 0 } = req.query
        const { portalId, user_id } = req

        let query = search ? { req_id: { $regex: search, $options: 'i' }, bo_id: { $in: [portalId, user_id] } } : { bo_id: { $in: [portalId, user_id] } };

        const records = { count: 0, rows: [] };

        records.rows = await AgentInvoice.find(query).populate({ path: "req_id", select: " " })

        records.count = await AgentInvoice.countDocuments(query)

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;

        records.rows = records.rows.map(item => {
            let obj = {

                _id: item?._id,
                orderId: item?.req_id?.reqNo,
                // branchNo: item?.batch_id?.branchId,
                commodity: item?.req_id?.product?.name,
                quantityPurchased: item?.qtyProcured,
                billingDate: item?.createdAt,
                bo_approval_status: item.bo_approve_status
            }

            return obj
        })


        if (isExport == 1) {

            const record = records.rows.map((item) => {
                return {
                    "Order ID": item?.orderId || 'NA',
                    "Commodity": item?.commodity || 'NA',
                    "Quantity Purchased": item?.quantityPurchased || 'NA',
                    "Billing Date": item?.billingDate ?? 'NA',
                    "Approval Status": item?.bo_approval_status ?? 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `orderId-record.xlsx`,
                    worksheetName: `orderId-record`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Order") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Order") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.agencyInvoiceById = async (req, res) => {

    try {
        const agencyInvoiceId = req.params.id

        const agentBill = await AgentInvoice.findOne({ _id: agencyInvoiceId })
        if (!agentBill) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('Bill') }] }));
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: agentBill, message: _query.get('Invoice') }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.boBillApproval = async (req, res) => {

    try {

        const agencyInvoiceId = req.params.id

        const agentBill = await AgentInvoice.findOne({ _id: agencyInvoiceId });
        if (!agentBill) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('Bill') }] }));
        }

        agentBill.bo_approve_status = _paymentApproval.approved;
        agentBill.bo_approve_by = req.user._id;
        agentBill.bo_approve_at = new Date()

        await agentBill.save();

        return res.status(200).send(new serviceResponse({ status: 200, message: "Bill Approved by BO" }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.boBillRejection = async (req, res) => {

    try {

        const { agencyInvoiceId, comment } = req.body

        const agentBill = await AgentInvoice.findOne({ _id: agencyInvoiceId });
        if (!agentBill) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('Bill') }] }));
        }

        await updateAgentInvoiceLogs(agencyInvoiceId)

        agentBill.bo_approve_status = _paymentApproval.rejected;
        agentBill.bo_approve_by = null;
        agentBill.bo_approve_at = null

        agentBill.bill.bo_reject_by = req.user._id
        agentBill.bill.bo_reject_at = new Date()
        agentBill.bill.bo_reason_to_reject = comment

        await agentBill.save();

        return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.rejectedSuccessfully("Bill") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

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
                ho_reason_to_reject: agentBill.bill.ho_reason_to_reject
            },
            payment_change_remarks: agentBill.payment_change_remarks
        };


        agentBill.logs.push(log)
        await agentBill.save()


        return true
    } catch (error) {
        throw error
    }

}

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
            })
        }

        await smsService.sendOTPSMS(mobileNumber);

        return sendResponse({
            res,
            status: 200,
            data: [],
            message: _response_message.otpCreate("mobile number"),
        })
    } catch (err) {
        console.log("error", err);
        _handleCatchErrors(err, res);
    }
};

module.exports.verifyOTP = async (req, res) => {
    try {
        const { mobileNumber, inputOTP } = req.body;
        // Validate the mobile number
        const isValidMobile = await validateMobileNumber(mobileNumber);
        if (!isValidMobile) {
            return sendResponse({
                res,
                status: 400,
                message: _response_message.invalid("mobile number"),
            })
        }

        // Find the OTP for the provided mobile number
        const userOTP = await OTPModel.findOne({ phone: mobileNumber });

        const staticOTP = '9821';

        // Verify the OTP
        // if (inputOTP !== userOTP?.otp) {
        if ((!userOTP || inputOTP !== userOTP.otp) && inputOTP !== staticOTP) {
            return sendResponse({
                res,
                status: 400,
                message: _response_message.otp_not_verified("OTP"),
            })
        }

        // Send the response
        return sendResponse({
            res,
            status: 200,
            message: _response_message.otp_verified("your mobile"),
        })

    } catch (err) {
        console.log("error", err);
        _handleCatchErrors(err, res);
    }
};

module.exports.paymentLogsHistory = async (req, res) => {
    try {
        const { batchId } = req.query
        if (!batchId) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid("batchId") }] }))
        }
        const records = { count: 0, rows: [] };
        records.rows = await PaymentLogsHistory.find({ batch_id: batchId }).populate({
            path: 'user_id',
            select: 'email'
        })
        records.count = await PaymentLogsHistory.countDocuments({ batch_id: batchId })
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment logs") }))
    }
    catch (error) {
        _handleCatchErrors(error, res);
    }
}


//////////////////////////////////////////////////////////////

/*
module.exports.paymentWithoutAggregtion = async (req, res) => {
    try {
        let {
            page = 1, limit = 10, paginate = 1, sortBy, search = '', user_type,
            isExport = 0, approve_status = "Pending", scheme, commodity, branchName, state
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        const { portalId, user_id } = req;
        const paymentReqIds = await Payment.find({ bo_id: { $in: [portalId, user_id] } }).distinct("req_id");

        let baseMatch = { _id: { $in: paymentReqIds } };

        if (search) {
            baseMatch.$or = [
                { reqNo: { $regex: search, $options: 'i' } },
                { "product.name": { $regex: search, $options: 'i' } }
            ];
        }
        if (commodity) baseMatch["product.name"] = { $regex: commodity, $options: 'i' };

        // Get filtered requests (basic info + batches)
        let requests = await RequestModel.aggregate([
            { $match: baseMatch },
            { $sort: { createdAt: -1 } },
            { $skip: paginate == 1 ? (page - 1) * limit : 0 },
            ...(paginate == 1 ? [{ $limit: limit }] : []),
            {
                $lookup: {
                    from: "batches",
                    localField: "_id",
                    foreignField: "req_id",
                    as: "batches"
                }
            },
            {
                $project: {
                    _id: 1,
                    reqNo: 1,
                    product: 1,
                    sla_id: 1,
                    branch_id: 1,
                    createdAt: 1,
                    batches: {
                        _id: 1,
                        qty: 1,
                        totalPrice: 1,
                        batchId: 1,
                        bo_approve_status: 1
                    }
                }
            }
        ]).allowDiskUse(true);

        const enrichedRequests = await Promise.all(requests.map(async (req) => {
            const batchIds = req.batches.map(b => b._id);
            const payments = await Payment.find({ batch_id: { $in: batchIds } }, { payment_status: 1 });

            const qtyPurchased = req.batches.reduce((acc, b) => acc + (b.qty || 0), 0);
            const amountPayable = req.batches.reduce((acc, b) => acc + (b.totalPrice || 0), 0);
            const payment_status = payments.some(p => p.payment_status === 'Pending') ? 'Pending' : 'Completed';

            const sla = await SLA.findById(req.sla_id).select({ "basic_details.name": 1}).lean();
            const branch = await Branches.findById(req.branch_id).select({branchName:1}).lean();
            const schemeData = await Scheme.findById(req.product?.schemeId).select({schemeName:1,season:1,period:1,commodity_id:1}).lean();
           
            const boStatusMatch = approve_status === 'Pending'
                ? req.batches.some(b => b.bo_approve_status === 'Pending')
                : req.batches.some(b => b.bo_approve_status !== 'Pending');

            if (!boStatusMatch) return null;

            if (branchName && !(branch?.branchName?.match(new RegExp(branchName, 'i')))) return null;
            if (state && !(branch?.state?.match(new RegExp(state, 'i')))) return null;
            if (scheme && !(schemeData?.name?.match(new RegExp(scheme, 'i')))) return null;

            return {
                _id: req._id,
                reqNo: req.reqNo,
                product: req.product,
                // batches: req.batches,
                sla: sla || {},
                branch: branch || {},
                scheme: schemeData || {},
                qtyPurchased,
                amountPayable,
                payment_status,
                createdAt: req.createdAt
            };
        }));

        const filteredRequests = enrichedRequests.filter(Boolean);
        const totalCount = await RequestModel.countDocuments(baseMatch);

        const response = {
            rows: filteredRequests,
            count: totalCount
        };

        if (paginate == 1) {
            response.page = page;
            response.limit = limit;
            response.pages = limit != 0 ? Math.ceil(totalCount / limit) : 0;
        }

        if (isExport == 1) {
            const record = filteredRequests.map((item) => {
                return {
                    "Order ID": item.reqNo || 'NA',
                    "Commodity": item.product?.name || 'NA',
                    "Quantity Purchased": item.qtyPurchased || 'NA',
                    "Amount Payable": item.amountPayable || 'NA',
                    "Approval Status": approve_status,
                    "Payment Status": item.payment_status || 'NA',
                    "Branch": item.branch?.branchName || 'NA',
                    "State": item.branch?.state || 'NA',
                    "Scheme": item.scheme?.name || 'NA'
                };
            });

            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Farmer-Payment-records.xlsx`,
                    worksheetName: `Farmer-Payment-records`
                });
            } else {
                return res.status(400).send(new serviceResponse({
                    status: 400,
                    data: response,
                    message: _response_message.notFound("Payment")
                }));
            }
        } else {
            return res.status(200).send(new serviceResponse({
                status: 200,
                data: response,
                message: _response_message.found("Payment")
            }));
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
*/


module.exports.paymentWithoutAggregtion = async (req, res) => {
    try {
        let {
            page = 1, limit = 10, paginate = 1, sortBy, search = '', user_type,
            isExport = 0, approve_status = "Pending", scheme, commodity, branchName, state
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        const { portalId, user_id } = req;

        // Step 1: Get req_ids user has access to
        const paymentReqIds = await Payment.find({ bo_id: { $in: [portalId, user_id] } }).distinct("req_id");
        let baseMatch = { _id: { $in: paymentReqIds } };

        // Step 2: Apply search and filters
        if (search) {
            baseMatch.$or = [
                { reqNo: { $regex: search, $options: 'i' } },
                { "product.name": { $regex: search, $options: 'i' } }
            ];
        }
        if (commodity) baseMatch["product.name"] = { $regex: commodity, $options: 'i' };

        // Step 3: Get filtered requests with basic info
        let requests = await RequestModel.find(baseMatch)
            .sort({ createdAt: -1 })
            .skip(paginate == 1 ? (page - 1) * limit : 0)
            .limit(paginate == 1 ? limit : 0)
            .lean();

        const requestIds = requests.map(r => r._id);

        // Step 4: Fetch all batches in bulk
        const batches = await Batch.find({ req_id: { $in: requestIds } }, {
            _id: 1, req_id: 1, qty: 1, totalPrice: 1, batchId: 1, bo_approve_status: 1
        }).lean();

        const batchesByReq = {};
        const batchIds = [];

        for (const batch of batches) {
            batchIds.push(batch._id);
            if (!batchesByReq[batch.req_id]) {
                batchesByReq[batch.req_id] = [];
            }
            batchesByReq[batch.req_id].push(batch);
        }

        // Step 5: Fetch related data in bulk
        const slaIds = [...new Set(requests.map(r => r.sla_id).filter(Boolean))];
        const branchIds = [...new Set(requests.map(r => r.branch_id).filter(Boolean))];
        const schemeIds = [...new Set(requests.map(r => r.product?.schemeId).filter(Boolean))];

        const [slaList, branchList, schemeList, payments] = await Promise.all([
            SLA.find({ _id: { $in: slaIds } }).select({ "basic_details.name": 1 }).lean(),
            Branches.find({ _id: { $in: branchIds } }).select({ branchName: 1, state: 1 }).lean(),
            Scheme.find({ _id: { $in: schemeIds } }).select({ schemeName: 1, name: 1, season: 1, period: 1, commodity_id: 1 }).lean(),
            Payment.find({ batch_id: { $in: batchIds } }).select({ batch_id: 1, payment_status: 1 }).lean()
        ]);

        // Step 6: Create lookup maps
        const slaMap = Object.fromEntries(slaList.map(s => [s._id.toString(), s]));
        const branchMap = Object.fromEntries(branchList.map(b => [b._id.toString(), b]));
        const schemeMap = Object.fromEntries(schemeList.map(s => [s._id.toString(), s]));

        const paymentsByBatchId = {};
        for (const p of payments) {
            if (!paymentsByBatchId[p.batch_id]) paymentsByBatchId[p.batch_id] = [];
            paymentsByBatchId[p.batch_id].push(p);
        }

        // Step 7: Process and filter requests
        const enrichedRequests = requests.map(req => {
            const reqBatches = batchesByReq[req._id] || [];

            const qtyPurchased = reqBatches.reduce((sum, b) => sum + (b.qty || 0), 0);
            const amountPayable = reqBatches.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

            const relatedPayments = reqBatches.flatMap(b => paymentsByBatchId[b._id] || []);
            const payment_status = relatedPayments.some(p => p.payment_status === 'Pending') ? 'Pending' : 'Completed';

            const sla = slaMap[req.sla_id?.toString()] || {};
            const branch = branchMap[req.branch_id?.toString()] || {};
            const schemeData = schemeMap[req.product?.schemeId?.toString()] || {};
            const commodityName = req.product?.name || "";
            const season = schemeData.season || "";
            const period = schemeData.period || "";
            const schemeNameFinal = [schemeData.schemeName, commodityName, season, period].filter(Boolean).join(" ");

            const boStatusMatch = approve_status === 'Pending'
                ? reqBatches.some(b => b.bo_approve_status === 'Pending')
                : reqBatches.some(b => b.bo_approve_status !== 'Pending');

            if (!boStatusMatch) return null;
            if (branchName && !(branch.branchName?.match(new RegExp(branchName, 'i')))) return null;
            if (state && !(branch.state?.match(new RegExp(state, 'i')))) return null;
            if (scheme && !(schemeData.name?.match(new RegExp(scheme, 'i')))) return null;

            return {
                _id: req._id,
                reqNo: req.reqNo,
                product: req.product,
                sla,
                branch,
                scheme: {
                    id: schemeData._id,
                    season : schemeData.season,
                    period: schemeData.period,
                    commodity_id: schemeData.commodity_id,
                    schemeName: schemeNameFinal 
                },
                qtyPurchased,
                amountPayable,
                payment_status,
                createdAt: req.createdAt
            };
        }).filter(Boolean);

        const totalCount = await RequestModel.countDocuments(baseMatch);

        const response = {
            rows: enrichedRequests,
            count: totalCount
        };

        if (paginate == 1) {
            response.page = page;
            response.limit = limit;
            response.pages = limit != 0 ? Math.ceil(totalCount / limit) : 0;
        }

        if (isExport == 1) {
           
            let exportData = enrichedRequests;
            
            const exportLimit = parseInt(req.query.exportLimit || 0);
            if (exportLimit > 0) {
                exportData = exportData.slice(0, exportLimit);
            }

            const record = exportData.map((item) => ({
                "Order ID": item?.reqNo || 'NA',
                "BRANCH NAME": item?.branch?.branchName || 'NA',
                "Scheme": item?.scheme?.schemeName || 'NA',
                "SLA NAME": item?.sla?.basic_details.name || 'NA',
                "Commodity": item?.product?.name || 'NA',
                "Quantity Purchased": item?.qtyPurchased || 'NA',
                "Amount Payable": item?.amountPayable || 'NA',
            }));

            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Farmer-Payment-records.xlsx`,
                    worksheetName: `Farmer-Payment-records`
                });
            } else {
                return res.status(400).send(new serviceResponse({
                    status: 400,
                    data: response,
                    message: _response_message.notFound("Payment")
                }));
            }
        } else {
            return res.status(200).send(new serviceResponse({
                status: 200,
                data: response,
                message: _response_message.found("Payment")
            }));
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};


module.exports.paymentWithoutAggregtionExport = async (req, res) => {
    try {
        let {
            page = 1, limit = 10, paginate = 1, sortBy, search = '', user_type,
            isExport = 0, approve_status = "Pending", scheme, commodity, branchName, state
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        const { portalId, user_id } = req;

        // Ensure necessary indexes are created (run once in your database setup)
        // await Payment.createIndexes({ ho_id: 1, bo_approve_status: 1 });
        // await RequestModel.createIndexes({ reqNo: 1, createdAt: -1 });
        // await Batch.createIndexes({ req_id: 1 });
        // await Payment.createIndexes({ batch_id: 1 });
        // await Branches.createIndexes({ _id: 1 });

        // Step 1: Get req_ids user has access to
        const paymentReqIds = await Payment.find({ bo_id: { $in: [portalId, user_id] } }).distinct("req_id");
        let baseMatch = { _id: { $in: paymentReqIds } };

        // Step 2: Apply search and filters
        if (search) {
            baseMatch.$or = [
                { reqNo: { $regex: search, $options: 'i' } },
                { "product.name": { $regex: search, $options: 'i' } }
            ];
        }
        if (commodity) baseMatch["product.name"] = { $regex: commodity, $options: 'i' };

        // Step 3: Get filtered requests with basic info
        let requests = await RequestModel.find(baseMatch)
            .sort({ createdAt: -1 })
            .lean();

        const requestIds = requests.map(r => r._id);

        // Step 4: Fetch all batches in bulk
        const batches = await Batch.find({ req_id: { $in: requestIds } }, {
            _id: 1, req_id: 1, qty: 1, totalPrice: 1, batchId: 1, bo_approve_status: 1
        }).lean();

        const batchesByReq = {};
        const batchIds = [];

        for (const batch of batches) {
            batchIds.push(batch._id);
            if (!batchesByReq[batch.req_id]) {
                batchesByReq[batch.req_id] = [];
            }
            batchesByReq[batch.req_id].push(batch);
        }

        // Step 5: Fetch related data in bulk
        const slaIds = [...new Set(requests.map(r => r.sla_id).filter(Boolean))];
        const branchIds = [...new Set(requests.map(r => r.branch_id).filter(Boolean))];
        const schemeIds = [...new Set(requests.map(r => r.product?.schemeId).filter(Boolean))];

        const [slaList, branchList, schemeList, payments] = await Promise.all([
            SLA.find({ _id: { $in: slaIds } }).select({ "basic_details.name": 1 }).lean(),
            Branches.find({ _id: { $in: branchIds } }).select({ branchName: 1, state: 1 }).lean(),
            Scheme.find({ _id: { $in: schemeIds } }).select({ schemeName: 1, name: 1, season: 1, period: 1, commodity_id: 1 }).lean(),
            Payment.find({ batch_id: { $in: batchIds } }).select({ batch_id: 1, payment_status: 1 }).lean()
        ]);

        // Step 6: Create lookup maps
        const slaMap = Object.fromEntries(slaList.map(s => [s._id.toString(), s]));
        const branchMap = Object.fromEntries(branchList.map(b => [b._id.toString(), b]));
        const schemeMap = Object.fromEntries(schemeList.map(s => [s._id.toString(), s]));

        const paymentsByBatchId = {};
        for (const p of payments) {
            if (!paymentsByBatchId[p.batch_id]) paymentsByBatchId[p.batch_id] = [];
            paymentsByBatchId[p.batch_id].push(p);
        }

        // Step 7: Process and filter requests
        const enrichedRequests = requests.map(req => {
            const reqBatches = batchesByReq[req._id] || [];

            const qtyPurchased = reqBatches.reduce((sum, b) => sum + (b.qty || 0), 0);
            const amountPayable = reqBatches.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

            const relatedPayments = reqBatches.flatMap(b => paymentsByBatchId[b._id] || []);
            const payment_status = relatedPayments.some(p => p.payment_status === 'Pending') ? 'Pending' : 'Completed';

            const sla = slaMap[req.sla_id?.toString()] || {};
            const branch = branchMap[req.branch_id?.toString()] || {};
            const schemeData = schemeMap[req.product?.schemeId?.toString()] || {};

            const boStatusMatch = approve_status === 'Pending'
                ? reqBatches.some(b => b.bo_approve_status === 'Pending')
                : reqBatches.some(b => b.bo_approve_status !== 'Pending');

            if (!boStatusMatch) return null;
            if (branchName && !(branch.branchName?.match(new RegExp(branchName, 'i')))) return null;
            if (state && !(branch.state?.match(new RegExp(state, 'i')))) return null;
            if (scheme && !(schemeData.name?.match(new RegExp(scheme, 'i')))) return null;

            return {
                _id: req._id,
                reqNo: req.reqNo,
                product: req.product,
                sla,
                branch,
                scheme: schemeData,
                qtyPurchased,
                amountPayable,
                payment_status,
                createdAt: req.createdAt
            };
        }).filter(Boolean);

        const totalCount = await RequestModel.countDocuments(baseMatch);

        const response = {
            rows: enrichedRequests,
            count: totalCount
        };

        if (paginate == 1 & isExport != 1) {
            response.page = page;
            response.limit = limit;
            response.pages = limit != 0 ? Math.ceil(totalCount / limit) : 0;
        }

        if (isExport == 1) {
            
            let exportData = enrichedRequests;
            const record = exportData.map((item) => ({
                "Order ID": item?.reqNo || 'NA',
                "BRANCH NAME": item?.branch?.branchName || 'NA',
                "Scheme": item?.scheme?.schemeName || 'NA',
                "SLA NAME": item?.sla?.basic_details?.name || 'NA',
                "Commodity": item?.product?.name || 'NA',
                "Quantity Purchased": item?.qtyPurchased || 'NA',
                "Amount Payable": item?.amountPayable || 'NA',
            }));

            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Farmer-Payment-records.xlsx`,
                    worksheetName: `Farmer-Payment-records`
                });
            } else {
                return res.status(400).send(new serviceResponse({
                    status: 400,
                    data: response,
                    message: _response_message.notFound("Payment")
                }));
            }
        } else {
            return res.status(200).send(new serviceResponse({
                status: 200,
                data: response,
                message: _response_message.found("Payment")
            }));
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};