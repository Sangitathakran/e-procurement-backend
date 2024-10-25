const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { _userType, _paymentstatus, _batchStatus, _associateOfferStatus, _paymentApproval, received_qc_status } = require('@src/v1/utils/constants');
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
// const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
// const { AgentPayment } = require("@src/v1/models/app/procurement/AgentPayment");
// const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");

module.exports.payment = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query

        let query = search ? { reqNo: { $regex: search, $options: 'i' } } : {};

        const { portalId, user_id } = req


        const paymentIds = (await Payment.find({ ho_id: { $in: [portalId, user_id] }, bo_approve_status: _paymentApproval.approved })).map(i => i.req_id)

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
            // {
            //     $lookup: {
            //         from: 'branches',
            //         localField: 'branch_id',
            //         foreignField: '_id',
            //         as: 'branch',
            //     }
            // },
            // { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    approval_status: {
                        $cond: {
                            if: {
                                $anyElementTrue: {
                                    $map: {
                                        input: '$batches',
                                        as: 'batch',
                                        in: {
                                            $or: [
                                                { $not: { $ifNull: ['$$batch.ho_approval_at', true] } },  // Check if the field is missing
                                                { $eq: ['$$batch.ho_approval_at', null] },  // Check for null value
                                            ]
                                        }
                                    }
                                }
                            },
                            then: 'Pending',
                            else: 'Approved'
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
            // { $unwind: '$branch' },
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
                    payment_status: 1,
                    branch: 1
                }
            },
            { $sort: sortBy ? { [sortBy]: 1 } : { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) }
        ];
        const records = await RequestModel.aggregate([
            ...aggregationPipeline,
            {
                $facet: {
                    data: aggregationPipeline, // Aggregate for data
                    totalCount: [{ $count: 'count' }] // Count the documents
                }
            }
        ]);

        const response = {
            count: records[0]?.totalCount[0]?.count || 0,
            rows: records[0]?.data || []
        };
        if (paginate == 1) {
            response.page = page
            response.limit = limit
            response.pages = limit != 0 ? Math.ceil(response.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: response, message: _response_message.found("Payment") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.associateOrders = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query

        const { user_type, portalId, user_id } = req;

        if (user_type != _userType.ho) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        const paymentIds = (await Payment.find({ ho_id: { $in: [portalId, user_id] }, req_id, bo_approve_status: _paymentApproval.approved })).map(i => i.associateOffers_id)

        let query = {
            _id: { $in: paymentIds },
            req_id,
            status: { $in: [_associateOfferStatus.partially_ordered, _associateOfferStatus.ordered] },
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };
        records.reqDetails = await RequestModel.findOne({ _id: req_id })
            .select({ _id: 1, reqNo: 1, product: 1, deliveryDate: 1, address: 1, quotedPrice: 1, status: 1 });
        records.rows = paginate == 1 ? await AssociateOffers.find(query)
            .populate({
                path: 'seller_id', select: '_id user_code basic_details.associate_details.associate_type basic_details.associate_details.associate_name'
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

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.batchList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', associateOffer_id, isExport = 0 } = req.query
        const { user_type, portalId, user_id } = req

        const paymentIds = (await Payment.find({ ho_id: { $in: [portalId, user_id] }, associateOffers_id: associateOffer_id, bo_approve_status: _paymentApproval.approved })).map(i => i.batch_id)
        let query = {
            _id: { $in: paymentIds },
            associateOffer_id,
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };

        records.rows = paginate == 1 ? await Batch.find(query)
            .populate({
                path: 'procurementCenter_id', select: '_id center_name center_code center_type address'
            })
            .sort(sortBy)
            .skip(skip)
            .select('_id procurementCenter_id batchId delivered.delivered_at qty goodsPrice totalPrice payement_approval_at payment_approve_by')
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
                    "procurementCenter_id": item?.procurementCenter_id || 'NA',
                    "Quantity Purchased": item?.qtyProcured || 'NA',
                    "Status": item?.status ?? 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Payment-${user_type}.xlsx`,
                    worksheetName: `Payment-record-${user_type}`
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