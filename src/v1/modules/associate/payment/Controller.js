const { _handleCatchErrors, dumpJSONToCSV, dumpJSONToExcel, handleDecimal } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { _userType, _webSocketEvents, _paymentApproval, _paymentstatus } = require('@src/v1/utils/constants');
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const mongoose = require("mongoose");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { PaymentLogs } = require("@src/v1/models/app/procurement/PaymentLogs");
const { AssociateInvoice } = require("@src/v1/models/app/payment/associateInvoice");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
module.exports.payment = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', tab = 0, isExport = 0 } = req.query

        // let query = search ? { reqNo: { $regex: search, $options: 'i' } } : {};

        const { user_id } = req
        const calculatedSkip = (page - 1) * parseInt(limit);

        let paymentIds = tab == 0 ? (await Payment.find({ associate_id: user_id })).map(i => i.req_id) : (await AssociateInvoice.find({ associate_id: user_id })).map(i => i.req_id)

       let query = {};

if (search) {
  query = {
    $and: [
      { _id: { $in: paymentIds } },
      {
        $or: [
          { "product.name": { $regex: search, $options: "i" } },
          { "reqNo": { $regex: search, $options: "i" } },
        ],
      },
    ],
  };
} else {
  query = { _id: { $in: paymentIds } };
}



        const aggregationPipeline = [
            // { $match: { _id: { $in: paymentIds } } },
            { $match: query },
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
                    approval_status: 1,
                    qtyPurchased: 1,
                    amountPayable: 1,
                    payment_status: 1
                }
            },
            { $sort: sortBy ? { [sortBy]: 1 } : { createdAt: -1 } },
            // { $skip: skip },
            // { $limit: parseInt(limit) }
        ];
        const records = await RequestModel.aggregate([
            ...aggregationPipeline,
            {
                $facet: {
                    data: [...aggregationPipeline, { $skip: calculatedSkip }, { $limit: parseInt(limit) }],
                    totalCount: [{ $match: query },{ $count: 'count' }] // Count the documents
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
                    "Commodity": item?.product.name || 'NA',
                    "Quantity Purchased": item?.qtyPurchased || 'NA',
                    "Payment Status": item?.payment_status ?? 'NA',
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Payment-record.xlsx`,
                    worksheetName: `Payment-record`
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

module.exports.batchList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', tab = 0, req_id, isExport = 0 } = req.query
        const { user_id } = req

        const paymentIds = tab == 0 ? (await Payment.find({ associate_id: user_id, req_id })).map(i => i.batch_id) :
            (await AssociateInvoice.find({ associate_id: user_id, req_id })).map(i => i.batch_id)


        let query = {
            req_id,
            _id: { $in: paymentIds },
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };

        records.rows = paginate == 1 ? await Batch.find(query)
            .sort(sortBy)
            .skip(skip)
            .select('_id batchId delivered.delivered_at qty goodsPrice totalPrice payement_approval_at payment_at payment_approve_by bo_approve_status procurementCenter_id status')
            .populate({ path: 'procurementCenter_id', select: '_id center_name center_code' })
            .limit(parseInt(limit)) : await Batch.find(query).sort(sortBy);

        records.reqDetails = await RequestModel.findOne({ _id: req_id })
            .select({ _id: 1, reqNo: 1, product: 1, deliveryDate: 1, address: 1, quotedPrice: 1, status: 1 });

        records.count = await Batch.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        records.rows = await Promise.all(records.rows.map(async (item) => {

            let paidFarmer = 0
            let unPaidFarmer = 0
            let rejectedFarmer = 0
            let totalFarmer = 0
            const paymentData = await Payment.find({ associate_id: user_id, req_id, batch_id: item._id })

            paymentData.forEach(item => {
                if (item.payment_status === _paymentstatus.completed) {
                    paidFarmer += 1
                }
                if (item.payment_status === _paymentstatus.pending || item.payment_status === _paymentstatus.rejected) {
                    unPaidFarmer += 1
                }
                // if (item.payment_status === _paymentstatus.failed) {
                if (item.payment_status === _paymentstatus.rejected) {
                    rejectedFarmer += 1
                }

                totalFarmer += 1
            })

            return { ...JSON.parse(JSON.stringify(item)), paidFarmer, unPaidFarmer, rejectedFarmer, totalFarmer }

        }))

        if (isExport == 1) {

            const record = records.rows.map((item) => {

                return {
                    "Batch ID": item?.batchId || "NA",
                    "Delivery Date": item?.delivered?.delivered.delivered_at || "NA",
                    "Payment Due Date": item?.payement_approval_at || "NA",
                    "Quantity Purchased": item.qty || "NA",
                    "Total Price": item.totalPrice || "NA",
                    "Payment Status": item.status || "NA",
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

        }
        else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.lotList = async (req, res) => {

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

        const rows = paginate == 1 ? await FarmerOrders.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await FarmerOrders.find(query)
                .sort(sortBy);

        records.rows = rows.map((item) => {
            return {
                "lotId": item?.metaData.farmer_code || 'NA',
                "FarmerName": item?.metaData.name || 'NA',
                "qty_purchased": item?.qtyProcured ?? 'NA',
                "total_amount": item?.net_pay ?? 'NA',
                "payment_status": item?.status ?? 'NA'
            }
        });

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
            return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.farmerOrders = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', farmer_id, isExport = 0 } = req.query;

        const { user_id } = req;

        let query = {
            user_id,
            farmer_id: farmer_id,
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };
        records.rows = paginate == 1 ? await FarmerOrders.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await FarmerOrders.find(query).sort(sortBy);

        records.count = await FarmerOrders.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {
                return {
                    "Order ID": item?.order_no || 'NA',
                    "Farmer ID": item?.farmer_id || 'NA',
                    "Farmer Name": item?.metaData?.name || 'NA',
                    "Procured On": item?.createdAt ?? 'NA',
                    "Payment Due On": item?.updatedAt ?? 'NA',
                    "Quantity Purchased": item?.offeredQty ?? 'NA',
                    "Amount Payable": item?.net_pay ?? 'NA',
                    "Amount Payable": item?.net_pay ?? 'NA',
                    "Approval Status": item?.status ?? 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `FarmerOrder-${'Farmer'}.xlsx`,
                    worksheetName: `FarmerOrder-record-${'Farmer'}`
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

module.exports.associateOrders = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', user_type, isExport = 0 } = req.query

        let query = search ? { reqNo: { $regex: search, $options: 'i' } } : {};

        if (user_type == _userType.farmer) {
            query.user_type = 'farmer';

        } else if (user_type == _userType.associate) {
            query.user_type = 'associate';
        }

        const records = { count: 0 };
        records.rows = paginate == 1 ? await Payment.find(query)
            .populate({
                path: 'whomToPay', select: '_id associate_id farmer_code name'
            })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await Payment.find(query).sort(sortBy);

        records.count = await Payment.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {
                return {
                    "Request ID": item?.reqNo || 'NA',
                    "Commodity": item?.commodity || 'NA',
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

module.exports.getFarmerListById = async (req, res) => {

    try {
        const { user_type } = req; // Retrieve user_id and user_type from request
        const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = 'name', search = '', farmer_id } = req.query;

        // Ensure only `associate` users can access this API
        if (user_type !== _userType.associate) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
        }

        // Build query to find farmers associated with the current user (associate)
        let query = {
            _id: new mongoose.Types.ObjectId(farmer_id), // Match farmers under current associate
            // associate_id: user_id, // Match farmers under current associate
            ...(search && { name: { $regex: search, $options: 'i' } }) // Search functionality
        };

        // Build aggregation pipeline
        let aggregationPipeline = [
            { $match: query }, // Match by associate_id and optional search
            {
                $lookup: {
                    from: 'crops',
                    localField: '_id',
                    foreignField: 'farmer_id',
                    as: 'crops',
                    pipeline: [{
                        $project: {
                            _id: 1,
                            associate_id: 1,
                            farmer_id: 1,
                            sowing_date: 1,
                            harvesting_date: 1,
                            crops_name: 1,
                            crop_seasons: 1,
                            production_quantity: 1,
                            yield: 1,
                            insurance_worth: 1,
                            status: 1
                        }
                    }]
                }
            },
            {
                $lookup: {
                    from: 'lands',
                    localField: '_id',
                    foreignField: 'farmer_id',
                    as: 'lands',
                    pipeline: [{
                        $project: {
                            _id: 1,
                            farmer_id: 1,
                            associate_id: 1,
                            total_area: 1,
                            area_unit: 1,
                            khasra_no: 1,
                            khatauni: 1,
                            ghat_no: 1,
                            sow_area: 1,
                            land_address: 1,
                            soil_type: 1,
                            soil_tested: 1,
                            soil_health_card: 1,
                            lab_distance_unit: 1,
                            status: 1,
                        }
                    }]
                }

            },
            {
                $lookup: {
                    from: 'banks',
                    localField: '_id',
                    foreignField: 'farmer_id',
                    as: 'bankDetails',
                    pipeline: [{
                        $project: {
                            _id: 1,
                            farmer_id: 1,
                            associate_id: 1,
                            bank_name: 1,
                            branch_name: 1,
                            account_no: 1,
                            ifsc_code: 1,
                            account_holder_name: 1,
                            branch_address: 1,
                            status: 1,
                        }
                    }]
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'associate_id',
                    foreignField: '_id',
                    as: 'associateDetails',
                    pipeline: [{
                        $project: {
                            organization_name: '$basic_details.associate_details.organization_name', // Project only the required fields
                        }
                    }]
                }
            },
            {
                $match: {
                    'crops.0': { $exists: true }, // Ensure farmers have at least one crop
                    'bankDetails.0': { $exists: true } // Ensure farmers have bank details
                }
            },
            { $unwind: '$associateDetails' }, // Unwind to merge associate details
            { $unwind: '$bankDetails' }, // Unwind to merge bank details
            {
                $project: {
                    farmer_code: 1,
                    title: 1,
                    mobile_no: 1,
                    name: 1,
                    parents: 1,
                    dob: 1,
                    gender: 1,
                    address: 1,
                    crops: 1,
                    bankDetails: 1,
                    lands: 1
                }
            },
            {
                $sort: { [sortBy]: 1 } // Sort by the `sortBy` field, default to `name`
            }
        ];

        // Apply pagination if `paginate` is enabled
        if (paginate == 1) {
            aggregationPipeline.push({
                $skip: parseInt(skip) || (parseInt(page) - 1) * parseInt(limit)
            }, {
                $limit: parseInt(limit)
            });
        }

        // Fetch count of farmers
        const countPipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'crops',
                    localField: '_id',
                    foreignField: 'farmer_id',
                    as: 'crops'
                }
            },
            {
                $lookup: {
                    from: 'banks',
                    localField: '_id',
                    foreignField: 'farmer_id',
                    as: 'bankDetails'
                }
            },
            {
                $match: {
                    'crops.0': { $exists: true }, // Farmers with crops
                    'bankDetails.0': { $exists: true } // Farmers with bank details
                }
            },
            { $count: 'total' } // Count total records matching the criteria
        ];

        // Execute the count query
        const countResult = await farmer.aggregate(countPipeline);
        const totalRecords = countResult[0] ? countResult[0].total : 0;

        // Execute the main aggregation query
        const rows = await farmer.aggregate(aggregationPipeline);

        const records = {
            count: totalRecords,
            rows: rows
        };

        // If pagination is enabled, add pagination metadata
        if (paginate == 1) {
            records.page = parseInt(page);
            records.limit = parseInt(limit);
            records.pages = limit != 0 ? Math.ceil(totalRecords / limit) : 0;
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('farmer') }))
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.getBill = async (req, res) => {

    try {
        const { batchId } = req.query

        const { user_id, user_type } = req;

        if (user_type !== _userType.associate) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
        }

        const records = await Batch.findOne({ _id: batchId }).select({ _id: 1, batchId: 1, req_id: 1, dispatchedqty: 1, goodsPrice: 1, totalPrice: 1, dispatched: 1 });

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.paymentLogs = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', batch_id } = req.query

        const { user_type } = req;

        // if (user_type != _userType.associate) {
        //     return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        // }

        let query = {
            batch_id,
            ...(search ? { reqNo: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };
        const rows = paginate == 1 ? await PaymentLogs.find(query)
            .populate({
                path: 'updated_by', select: '_id user_type basic_details.associate_details'
            }).select('_id procurementExp driage storageExp total updated_by createdAt')
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await PaymentLogs.find(query).sort(sortBy);

        let role = '';
        records.rows = rows.map((item) => {

            if (item?.updated_by.user_type == 3) { role = 'BO' }
            else if (item?.updated_by.user_type == 6) { role = 'Agent' }
            else if (item?.updated_by.user_type == 2) { role = 'HO' }
            else { role = 'Admin' }

            return {
                "Log time": item?.createdAt || 'NA',
                "role": role || 'NA',
                "action_by": item?.updated_by.basic_details.associate_details.organization_name ?? 'NA',
                "procurement_expense": item?.procurementExp ?? 'NA',
                "driage": item?.driage ?? 'NA',
                "storage_expense": item?.storageExp ?? 'NA',
                "remarks": item?.notes ?? 'NA',
            }
        });

        records.count = await PaymentLogs.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (!records) {
            return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment Logs") }))
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment Logs") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}

module.exports.failedPaymentFarmer = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', batch_id } = req.query;

        const batchIds = await Batch.find({ _id: batch_id }).select({ _id: 1, farmerOrderIds: 1 });

        let farmerOrderIdsOnly = {}

        if (batchIds && batchIds.length > 0) {
            farmerOrderIdsOnly = batchIds[0].farmerOrderIds.map(order => order.farmerOrder_id);
        } else {
            console.log('No Farmer found with this batch.');
        }

        let query = {
            _id: { $in: farmerOrderIdsOnly },
            payment_status: _paymentstatus.rejected,
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };
        records.rows = paginate == 1 ? await FarmerOrders.find(query).select({ _id: 1, total_amount: 1, FarmerName: 1, farmer_id: 1, net_pay: 1 }).populate({ path: 'farmer_id', select: 'name bank_details' })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await FarmerOrders.find(query)
                .sort(sortBy);

        records.rows = records.rows.map(item => {
            return {
                batchId: batch_id,
                ...JSON.parse(JSON.stringify(item.farmer_id.bank_details)),
                farmer_id: item.farmer_id._id,
                farmerName: item.farmer_id.name,
                amount_payable: item.net_pay,
                farmer_order_id: item._id

            }
        })

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
            return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}

module.exports.updateFarmerBankDetail = async (req, res) => {
    try {
        const { user_id } = req;
        const { farmer_id, account_no, ifsc_code, batch_id, farmer_order_id } = req.body;

        const existingRecord = await farmer.findOne({ _id: farmer_id });
        console.log(existingRecord)
        if (!existingRecord) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Farmer") }] }))
        }

        const update = {
            'bank_details.ifsc_code': ifsc_code,
            'bank_details.account_no': account_no
        }

        const updatedFarmer = await farmer.findOneAndUpdate({ _id: farmer_id }, update, { new: true });

        // to update the payment status in farmer order collection 
        const farmerOrder = await FarmerOrders.findOne({ _id: farmer_order_id })
        farmerOrder.payment_status = _paymentstatus.pending
        await farmerOrder.save()


        // to update the payment status of the farmer in payment collection
        const paymentDetail = await Payment.findOne({ farmer_id: farmer_id, batch_id: batch_id, associate_id: user_id })
        paymentDetail.payment_status = _paymentstatus.pending
        await paymentDetail.save()

        eventEmitter.emit(_webSocketEvents.procurement, { ...updatedFarmer, method: "updated" })

        return res.status(200).send(new serviceResponse({ status: 200, data: updatedFarmer.bank_details, message: _response_message.updated("Bank details") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.editBill = async (req, res) => {

    const { invoiceId, procurement_expenses, driage, storage, commission, bill_attachement, remarks } = req.body;

    const record = await AssociateInvoice.findOne({ _id: invoiceId });

    if (!record) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Bill") }] }));
    }

    // const cal_procurement_expenses = parseFloat(procurement_expenses) < 0 ? 0 : parseFloat(parseFloat(procurement_expenses).toFixed(2))
    // const cal_driage = parseFloat(driage) < 0 ? 0 : parseFloat(parseFloat(driage).toFixed(2))
    // const cal_storage = parseFloat(storage) < 0 ? 0 : parseFloat(parseFloat(storage).toFixed(2))
    // const cal_commission = parseFloat(commission) < 0 ? 0 : parseFloat(parseFloat(commission).toFixed(2))

    const cal_procurement_expenses = handleDecimal(procurement_expenses)
    const cal_driage = handleDecimal(driage)
    const cal_storage = handleDecimal(storage)
    const cal_commission = handleDecimal(commission)
    const total = handleDecimal(cal_procurement_expenses + cal_driage + cal_storage + cal_commission)

    record.bills.procurementExp = cal_procurement_expenses;
    record.bills.driage = cal_driage;
    record.bills.storageExp = cal_storage;
    record.bills.commission = cal_commission;
    record.bills.total = total;
    record.payment_change_remarks = remarks;

    record.agent_approve_status = _paymentApproval.pending



    const batch = await Batch.findOne({ _id: record.batch_id });

    if (!batch) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('Batch') }] }));
    }

    await updateAssociateLogs(invoiceId)

    batch.agent_approve_status = _paymentApproval.pending
    batch.ho_approve_status = _paymentApproval.pending
    batch.bo_approve_status = _paymentApproval.pending

    await batch.save()

    await record.save()

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.updated("bill") }))

}

const updateAssociateLogs = async (invoiceId) => {

    try {
        const invoice = await AssociateInvoice.findOne({ _id: invoiceId });

        const log = {
            bills: {
                procurementExp: handleDecimal(invoice.bills.procurementExp),
                qc_survey: invoice.bills.qc_survey,
                gunny_bags: invoice.bills.gunny_bags,
                weighing_stiching: invoice.bills.weighing_stiching,
                loading_unloading: invoice.bills.loading_unloading,
                transportation: invoice.bills.transportation,
                driage: handleDecimal(invoice.bills.driage),
                storageExp: handleDecimal(invoice.bills.storageExp),
                commission: handleDecimal(invoice.bills.commission),
                total: handleDecimal(invoice.bills.total),

                // Rejection case
                agent_reject_by: invoice.bills.agent_reject_by,
                agent_reject_at: invoice.bills.agent_reject_at,
                reason_to_reject: invoice.bills.reason_to_reject
            },
            initiated_at: invoice.initiated_at,
            agent_approve_status: invoice.agent_approve_status,
            agent_approve_by: invoice.agent_approve_by,
            agent_approve_at: invoice.agent_approve_at,
            payment_status: invoice.payment_status,
            payment_id: invoice.payment_id,
            transaction_id: invoice.transaction_id,
            payment_method: invoice.payment_method,
            payment_change_remarks: invoice.payment_change_remarks || null
        };

        invoice.logs.push(log)
        await invoice.save()

        return true

    } catch (error) {
        throw error
    }

}
