const { _handleCatchErrors, dumpJSONToCSV, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { _userType, _paymentApproval, _batchStatus, _associateOfferStatus, _paymentstatus } = require('@src/v1/utils/constants');
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const mongoose = require("mongoose");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { PaymentLogs } = require("@src/v1/models/app/procurement/PaymentLogs");
const { AgentPayment } = require("@src/v1/models/app/procurement/AgentPayment");
const moment = require("moment");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { AssociateInvoice } = require("@src/v1/models/app/payment/associateInvoice");
const { AgentInvoice } = require("@src/v1/models/app/payment/agentInvoice");


module.exports.payment = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query

        // let query = search ? { reqNo: { $regex: search, $options: 'i' } } : {};

        const paymentIds = (await Payment.find({})).map(i => i.req_id);

        const aggregationPipeline = [
            { $match: { _id: { $in: paymentIds } } },
            {
                $lookup: {
                    from: 'batches',
                    localField: '_id',
                    foreignField: 'req_id',
                    as: 'batches',
                    pipeline: [{
                        $lookup: {
                            from: 'payments',
                            localField: '_id',
                            foreignField: 'batch_id',
                            as: 'payment',
                        }
                    }],
                }
            },
            {
                $match: {
                    batches: { $ne: [] }
                }
            },
            {
                $addFields: {
                    approval_status: {
                        $cond: {
                            if: {
                                $and: [
                                    { $eq: ['$bo_approve_status', _paymentApproval.accepted] },
                                    { $eq: ['$ho_approve_status', _paymentApproval.accepted] }
                                ]
                            },
                            then: 'Accepted',
                            else: {
                                $cond: {
                                    if: {
                                        $or: [
                                            { $eq: ['$bo_approve_status', _paymentApproval.pending] },
                                            { $eq: ['$ho_approve_status', _paymentApproval.pending] }
                                        ]
                                    },
                                    then: 'Pending',
                                    else: 'Pending' // Assuming you want a rejected state if neither is approved
                                }
                            }
                        }
                    },
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
                            else: 'Approved'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    reqNo: 1,
                    product: 1,
                    // 'batches._id': 1,
                    // 'batches.qty': 1,
                    // 'batches.goodsPrice': 1,
                    // 'batches.totalPrice': 1,
                    // 'batches.status': 1,
                    approval_status: 1,
                    qtyPurchased: 1,
                    amountPayable: 1,
                    payment_status: 1
                }
            },
            { $sort: sortBy ? { [sortBy]: 1 } : { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) }
        ];
        const records = { count: 0 }
        records.rows = await RequestModel.aggregate(aggregationPipeline);

        records.count = await RequestModel.countDocuments({ _id: { $in: paymentIds } })
        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {

                return {
                    "Order Id": item?.reqNo || "NA",
                    "Branch Id": item?.branchId || "NA",
                    "Commodity": item?.product.name || "NA",
                    "Quantity Purchased": item?.qtyPurchased || "NA",
                    "Payment Status": item?.payment_status || "NA",
                    "Approval Status": item?.approval_status || "NA",
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Request-${'Request'}.xlsx`,
                    worksheetName: `Request-record-${'Request'}`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Request") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.associateOrders = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query

        const paymentIds = (await Payment.find({ req_id })).map(i => i.associateOffers_id)

        console.log("paymentIds", paymentIds);

        let query = {
            _id: { $in: paymentIds },
            req_id,
            status: { $in: [_associateOfferStatus.partially_ordered, _associateOfferStatus.ordered] },
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };

        console.log("query", query);

        records.reqDetails = await RequestModel.findOne({ _id: req_id })
            .select({ _id: 1, reqNo: 1, product: 1, deliveryDate: 1, address: 1, quotedPrice: 1, status: 1 });

        records.rows = paginate == 1 ? await AssociateOffers.find(query)
            .populate({
                path: "seller_id",
                select: "_id user_code basic_details.associate_details.associate_type basic_details.associate_details.associate_name"
            })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await AssociateOffers.find(query)
                .populate({
                    path: "seller_id",
                    select: "_id user_code basic_details.associate_details.associate_type basic_details.associate_details.associate_name"
                })
                .sort(sortBy);

        records.count = await AssociateOffers.countDocuments(query);

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

module.exports.batchList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', associateOffer_id, isExport = 0 } = req.query

        const paymentIds = (await Payment.find({ associateOffers_id: associateOffer_id })).map(i => i.batch_id)

        let query = {
            _id: { $in: paymentIds },
            associateOffer_id,
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };

        records.rows = paginate == 1 ? await Batch.find(query)
            .sort(sortBy)
            .skip(skip)
            .select('_id batchId delivered.delivered_at qty goodsPrice totalPrice payement_approval_at payment_at payment_approve_by status')
            .limit(parseInt(limit)) : await Batch.find(query)
                .select('_id batchId delivered.delivered_at qty goodsPrice totalPrice payement_approval_at payment_at payment_approve_by status')
                .sort(sortBy);

        records.count = await Batch.countDocuments(query);


        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {

                return {
                    "Batch Id": item?.batchId || "NA",
                    "Delivery Date": item?.delivered.delivered_at || "NA",
                    "Payment Due Date": item?.payement_approval_at || "NA",
                    "Quantity Purchased": item?.qty || "NA",
                    "Amount Payable": item?.totalPrice || "NA",
                    "Payment Status": item?.status || "NA",
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Batch-${'Batch'}.xlsx`,
                    worksheetName: `Batch-record-${'Batch'}`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Batch") }))
            }

        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))
        }

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
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }))
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Farmer") }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

// TODO aggrigation on invoice after a record insert
module.exports.AssociateTabPaymentRequests = async (req, res) => {
    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query
        // let query = search ? { reqNo: { $regex: search, $options: 'i' } } : {};
        const paymentIds = (await AssociateInvoice.find({})).map(i => i.req_id);

        const aggregationPipeline = [
            { $match: { _id: { $in: paymentIds } } },
            {
                $lookup: {
                    from: 'associateinvoices',
                    localField: '_id',
                    foreignField: 'req_id',
                    as: 'invoice',
                }
            },
            {
                $addFields: {
                    qtyProcuredInInvoice: {
                        $reduce: {
                            input: {
                                $map: {
                                    input: '$invoice',
                                    as: 'inv',
                                    in: { $toInt: '$$inv.qtyProcured' }
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this'] }
                        }
                    },
                    paymentStatus: {
                        $cond: {
                            if: {
                                $gt: [
                                    { $size: { $filter: { input: { $map: { input: '$invoice', as: 'inv', in: '$$inv.payment_status' } }, cond: { $eq: ['$$this', 'Pending'] } } } },
                                    0
                                ]
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
                    qtyProcuredInInvoice: 1,
                    paymentStatus: 1,
                }
            },
            { $sort: sortBy ? { [sortBy]: 1 } : { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) }
        ];
        const records = { count: 0 }
        records.rows = await RequestModel.aggregate(aggregationPipeline);

        records.count = await RequestModel.countDocuments({ _id: { $in: paymentIds } })
        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.AssociateTabassociateOrders = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query

        const paymentIds = (await AssociateInvoice.find({ req_id })).map(i => i.associateOffer_id);

        let query = {
            _id: { $in: paymentIds },
            req_id: new mongoose.Types.ObjectId(req_id),
            status: { $in: [_associateOfferStatus.partially_ordered, _associateOfferStatus.ordered] },
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };

        records.reqDetails = await RequestModel.findOne({ _id: req_id })
            .select({ _id: 1, reqNo: 1, product: 1, deliveryDate: 1, address: 1, quotedPrice: 1, status: 1 });


        const pipeline = [
            {
                $match: query,
            },
            {
                $lookup: {
                    from: 'associateinvoices',
                    localField: '_id',
                    foreignField: 'associateOffer_id',
                    as: 'invoice',

                },

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
                $addFields: {
                    amountProposed: {
                        $reduce: {
                            input: {
                                $map: {
                                    input: '$invoice',
                                    as: 'inv',
                                    in: { $toDouble: '$$inv.bills.total' } // Convert to double if needed
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
                                    in: { $toDouble: '$$inv.bills.total' } // Convert to double if needed
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this'] }
                        }
                    },
                    paymentStatus: {
                        $cond: {
                            if: {
                                $gt: [
                                    { $size: { $filter: { input: { $map: { input: '$invoice', as: 'inv', in: '$$inv.payment_status' } }, cond: { $eq: ['$$this', 'Pending'] } } } },
                                    0
                                ]
                            },
                            then: 'Pending',
                            else: 'Completed'
                        }
                    }
                }
            },
            {
                $project: {
                    "users.user_code": 1,
                    "users.basic_details.associate_details.associate_name": 1,
                    "amountProposed": 1,
                    "amountPayable": 1,
                    "paymentStatus": 1,
                }
            }

        ]


        records.rows = await AssociateOffers.aggregate(pipeline);

        records.count = await AssociateOffers.countDocuments(query);

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

module.exports.AssociateTabBatchList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', associateOffer_id, req_id, isExport = 0 } = req.query

        const paymentIds = (await AssociateInvoice.find({ associateOffer_id })).map(i => i.batch_id);

        let query = {
            _id: { $in: paymentIds },
            associateOffer_id: new mongoose.Types.ObjectId(associateOffer_id),
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        console.log('query', query);

        const records = { count: 0 };

        const pipeline = [
            {
                $match: query,
            },
            {
                $lookup: {
                    from: 'procurementcenters',
                    localField: 'procurementCenter_id',
                    foreignField: '_id',
                    as: 'procurementcenters',
                }
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
                $addFields: {
                    qtyPurchased: {
                        $reduce: {
                            input: {
                                $map: {
                                    input: '$invoice',
                                    as: 'inv',
                                    in: { $toInt: '$$inv.qtyProcured' }
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
                                    in: { $toDouble: '$$inv.bills.total' } // Convert to double if needed
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
                                    in: { $toDouble: '$$inv.bills.total' } // Convert to double if needed
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this'] }
                        }
                    },
                }
            },
            {
                $unwind: "$procurementcenters"
            },
            {
                $unwind: "$invoice"
            },
            {
                $project: {
                    "batchId": 1,
                    "procurementcenters._id": 1,
                    "procurementcenters.center_name": 1,
                    "procurementcenters.center_code": 1,
                    "invoice.initiated_at": 1,
                    "invoice.bills.total": 1,
                }
            }

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

module.exports.getBill = async (req, res) => {

    try {
        const { batchId } = req.query

        const { user_id, user_type } = req;

        if (user_type !== _userType.associate) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
        }

        const records = await Batch.findOne({ batchId }).select({ _id: 1, batchId: 1, req_id: 1, dispatchedqty: 1, goodsPrice: 1, totalPrice: 1, dispatched: 1 });

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

// module.exports.AssociateTabBatchList = async (req, res) => {

//     try {
//         const { page, limit, skip, paginate = 1, sortBy, search = '', associateOffer_id, isExport = 0 } = req.query

//         const paymentIds = (await AssociateInvoice.find({ associateOffers_id: associateOffer_id })).map(i => i.batch_id)

//         let query = {
//             _id: { $in: paymentIds },
//             associateOffer_id,
//             ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
//         };

//         const records = { count: 0 };

//         records.rows = paginate == 1 ? await Batch.find(query)
//             .sort(sortBy)
//             .skip(skip)
//             .select('_id batchId delivered.delivered_at qty goodsPrice totalPrice payement_approval_at payment_at payment_approve_by status')
//             .limit(parseInt(limit)) : await Batch.find(query)
//                 .select('_id batchId delivered.delivered_at qty goodsPrice totalPrice payement_approval_at payment_at payment_approve_by status')
//                 .sort(sortBy);

//         records.count = await Batch.countDocuments(query);


//         if (paginate == 1) {
//             records.page = page
//             records.limit = limit
//             records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
//         }

//         return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))

//     } catch (error) {
//         _handleCatchErrors(error, res);
//     }
// }

module.exports.AssociateTabBatchApprove = async (req, res) => {

    try {

        const { batchIds } = req.body;
        const { portalId } = req
        const result = await Batch.updateMany(
            { _id: { $in: batchIds } },  // Match any batchIds in the provided array
            { $set: { agent_approval_at: new Date(), agent_approve_by: portalId, agent_approve_status: _paymentApproval.approved } } // Set the new status for matching documents
        );

        if (result.matchedCount === 0) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "No matching Batch found" }] }));
        }
        await AssociateInvoice.updateMany(
            { batch_id: { $in: batchIds } },
            { $set: { agent_approve_status: _paymentApproval.approved, agent_approve_at: new Date(), agent_approve_by: portalId } }
        )

        return res.status(200).send(new serviceResponse({ status: 200, message: `${result.modifiedCount} Batch Approved successfully` }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.AssociateTabGenrateBill = async (req, res) => {

    try {
        const { req_id } = req.query;

        const existingRecord = await AgentInvoice.findOne({ req_id });

        if (existingRecord) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.allReadyExist("bill") }] }))
        }
        const associateInvoice = await AssociateInvoice.find({ req_id, agent_approve_status: _paymentApproval.approved })

        const agentInvoice = associateInvoice.reduce((acc, curr) => {

            if (!acc.req_id)
                acc.req_id = curr.req_id;

            if (!acc.ho_id)
                acc.ho_id = curr.ho_id;

            if (!acc.bo_id)
                acc.bo_id = curr.bo_id;

            if (!acc.batch_id) {
                acc.batch_id = [curr.batch_id];
            } else {
                acc.batch_id.push(curr.batch_id);
            }

            acc.qtyProcured += parseInt(curr.qtyProcured);

            acc.goodsPrice += parseInt(curr.goodsPrice);

            acc.bill.precurement_expenses += parseInt(curr.bills.procurementExp);
            acc.bill.driage += parseInt(curr.bills.driage);
            acc.bill.storage_expenses += parseInt(curr.bills.storageExp);
            acc.bill.commission += parseInt(curr.bills.commission);
            acc.bill.total += parseInt(curr.bills.total);

            return acc;
        }, { qtyProcured: 0, goodsPrice: 0, initiated_at: new Date(), bill: { precurement_expenses: 0, driage: 0, storage_expenses: 0, commission: 0, total: 0 } });


        const record = await AgentInvoice.create(agentInvoice);



        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: `Bill Genrated successfully` }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.associateBillApprove = async (req, res) => {

    try {

        const { batchIds = [] } = req.body;
        const { portalId } = req;

        const query = { batch_id: { $in: batchIds } };

        const invoiceRecord = await AssociateInvoice.find(query);

        if (invoiceRecord.length != batchIds.length) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("invoice") }] }));
        }

        const record = await AssociateInvoice.updateMany(query, { $set: { agent_approve_status: _paymentApproval.approved, agent_approve_by: portalId, agent_approve_at: new Date() } });

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.updated("invoice") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}