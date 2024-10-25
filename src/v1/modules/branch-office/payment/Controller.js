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

module.exports.payment = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', user_type, isExport = 0 } = req.query

        let query = search ? { reqNo: { $regex: search, $options: 'i' } } : {};

        const { portalId, user_id } = req


        const paymentIds = (await Payment.find({ bo_id: { $in: [portalId, user_id] } })).map(i => i.req_id)

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
                                $anyElementTrue: {
                                    $map: {
                                        input: '$batches',
                                        as: 'batch',
                                        in: {
                                            $or: [
                                                { $not: { $ifNull: ['$$batch.bo_approval_at', true] } },  // Check if the field is missing
                                                { $eq: ['$$batch.bo_approval_at', null] },  // Check for null value
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
            {
                $project: {
                    _id: 1,
                    reqNo: 1,
                    product: 1,
                    'batches._id': 1,
                    'batches.qty': 1,
                    'batches.goodsPrice': 1,
                    'batches.totalPrice': 1,
                    'batches.status': 1,
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

        if (isExport == 1) {

            const record = response.rows.map((item) => {
                return {
                    "Order ID": item?.reqNo || 'NA',
                    "Batch ID": item?.batchId || 'NA',
                    "Commodity": item?.commodity || 'NA',
                    "Quantity Purchased": item?.qtyProcured || 'NA',
                    "Payment Status": item?.payment_status ?? 'NA',
                    "Approval Status": item?.status ?? 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Payment-record.xlsx`,
                    worksheetName: `Payment-record`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 400, data: response, message: _response_message.notFound("Payment") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: response, message: _response_message.found("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.associateOrders = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query

        const { user_type, portalId, user_id } = req;

        if (user_type != _userType.bo) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        const paymentIds = (await Payment.find({ bo_id: { $in: [portalId, user_id] }, req_id })).map(i => i.associateOffers_id)

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

        if (isExport == 1) {

            const record = records.rows.map((item) => {
                return {
                    "Associate ID": item?.user_id.user_code || 'NA',
                    "Associate Type": item?.user_id.basic_details.associate_details.associate_name || 'NA',
                    "Associate Name": item?.user_id.basic_details.associate_details.associate_type || 'NA',
                    "Quantity Purchased": item?.qtyProcured || 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Associate-orders.xlsx`,
                    worksheetName: `Associate-orders`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.batchList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', associateOffer_id, isExport = 0 } = req.query
        const { user_type, portalId, user_id } = req

        const paymentIds = (await Payment.find({ bo_id: { $in: [portalId, user_id] }, associateOffers_id: associateOffer_id })).map(i => i.batch_id)
        let query = {
            _id: { $in: paymentIds },
            associateOffer_id,
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };

        records.rows = paginate == 1 ? await Batch.find(query)
            .sort(sortBy)
            .skip(skip)
            .select('_id procurementCenter_id batchId delivered.delivered_at qty goodsPrice totalPrice payement_approval_at payment_approve_by bo_approve_status')
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

module.exports.batchApprove = async (req, res) => {

    try {

        const { batchIds } = req.body;
        const { portalId } = req;

        const record = await Batch.findOne({
            _id: { $in: batchIds },
            "dispatched.qc_report.received_qc_status": { $ne: received_qc_status.accepted }
        })
        if (record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "Qc is not done on selected batches" }] }));
        }


        const result = await Batch.updateMany(
            { _id: { $in: batchIds } },  // Match any batchIds in the provided array
            { $set: { status: _batchStatus.paymentApproved, payement_approval_at: new Date(), payment_approve_by: portalId, bo_approve_status: _paymentApproval.approved } } // Set the new status for matching documents
        );

        if (result.matchedCount === 0) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "No matching Batch found" }] }));
        }
        await Payment.updateMany(
            { batch_id: { $in: batchIds } },
            { $set: { bo_approve_status: _paymentApproval.approved, bo_approve_at: new Date(), bo_approve_by: portalId } }
        )

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
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
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
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        const paymentList = await Payment.findOne({
            $and: [
                { req_id },
                // { user_id: associate_id }
            ]
        });

        if (!paymentList) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Payment") }] }))
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

        const billPayment = await Batch.findOne({ batchId }).select({ _id: 1, batchId: 1, req_id: 1, dispatchedqty: 1, goodsPrice: 1, totalPrice: 1, dispatched: 1 });

        if (billPayment) {

            const totalamount = billPayment.totalPrice;
            let mspPercentage = 1; // The percentage you want to calculate       

            const mspAmount = (mspPercentage / 100) * totalamount; // Calculate the percentage 
            const billQty = (0.8 / 1000);

            if(commission==0){
                commission = (billPayment.dispatched.bills.procurementExp + billPayment.dispatched.bills.driage + billPayment.dispatched.bills.storageExp * 0.5) / 100;
            }
           
            let records = { ...billPayment.toObject(), totalamount, mspAmount, billQty, commission }

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

module.exports.lot_list = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', batch_id } = req.query;

        const batchIds = await Batch.find({ _id: batch_id }).select({ _id: 1, farmerOrderIds: 1 });

        let farmerOrderIdsOnly = {}

        if (batchIds && batchIds.length > 0) {
            farmerOrderIdsOnly = batchIds[0].farmerOrderIds.map(order => order.farmerOrder_id);
            console.log(farmerOrderIdsOnly);
        } else {
            console.log('No Farmer found with this batch.');
        }

        let query = {
            _id: farmerOrderIdsOnly,
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };
        records.rows = paginate == 1 ? await FarmerOrders.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await FarmerOrders.find(query)
                .sort(sortBy);


        records.rows = await Promise.all(records.rows.map(async record => {

            const farmerDetails = await farmer.findOne({ '_id': record.farmer_id }).select({ name: 1, _id: 0 });

            const farmerName = farmerDetails ? farmerDetails.name : null;
            return { ...record.toObject(), farmerName }
        }));

        records.count = await FarmerOrders.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (records) {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))
        }
        else {
            return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment") }))
        }

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
                    "Order ID": item?.reqNo || 'NA',
                    "Batch ID": item?.batchId || 'NA',
                    "Commodity": item?.commodity || 'NA',
                    "Quantity Purchased": item?.qtyProcured || 'NA',
                    "Payment Status": item?.payment_status ?? 'NA',
                    "Approval Status": item?.status ?? 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Payment-record.xlsx`,
                    worksheetName: `Payment-record`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment") }))
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
