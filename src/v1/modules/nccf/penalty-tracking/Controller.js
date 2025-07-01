const { _handleCatchErrors, dumpJSONToExcel, handleDecimal } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { _webSocketEvents, _penaltypaymentStatus, _poBatchPaymentStatus } = require('@src/v1/utils/constants');
const { _userType } = require('@src/v1/utils/constants');
const moment = require("moment");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { BatchOrderProcess } = require("@src/v1/models/app/distiller/batchOrderProcess");
const mongoose = require('mongoose');


module.exports.getPenaltyOrder = asyncErrorHandler(async (req, res) => {

    const { page = 1, limit, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;

    // Initialize matchQuery
    let matchQuery = {
        'paymentInfo.penaltyStaus': { $ne: _penaltypaymentStatus.NA },
        deletedAt: null
    };
   
    let aggregationPipeline = [
        { $match: matchQuery },
        {
            $lookup: {
                from: "distillers", // Adjust this to your actual collection name for branches
                localField: "distiller_id",
                foreignField: "_id",
                as: "distillerDetails"
            }
        },
        // Unwind batchDetails array if necessary
        { $unwind: { path: "$distillerDetails", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "batchorderprocesses", // Adjust this to your actual collection name for branches
                localField: "_id",
                foreignField: "orderId",
                as: "batchDetails"
            }
        },

        // Unwind batchDetails array if necessary
        { $unwind: { path: "$batchDetails", preserveNullAndEmptyArrays: true } },

        // Add search filter after the lookup
        ...(search
            ? [{
                $match: {
                    $or: [
                        { 'basic_details.distiller_details.organization_name': { $regex: search, $options: 'i' } },
                        { 'purchasedOrder.poNo': { $regex: search, $options: 'i' } }
                    ]
                }
            }]
            : []),

        // Unwind penaltyDetails if it's an array (assuming it is)
        {
            $unwind: {
                path: "$batchDetails.penaltyDetails",
                preserveNullAndEmptyArrays: true
            }
        },

        // Group by order ID and sum up penaltyAmount
        {
            $group: {
                _id: "$_id",
                order_id: { $first: "$purchasedOrder.poNo" },
                distillerName: { $first: "$distillerDetails.basic_details.distiller_details.organization_name" },
                commodity: { $first: "$product.name" },
                quantityRequired: { $first: "$purchasedOrder.poQuantity" },
                totalAmount: { $first: "$paymentInfo.totalAmount" },
                paymentSent: { $first: "$paymentInfo.paidAmount" },
                outstandingPayment: { $first: "$paymentInfo.balancePayment" },
                totalPenaltyAmount: {
                    $sum: {
                        $ifNull: ["$batchDetails.penaltyDetails.penaltyAmount", 0]
                    }
                },
                paymentStatus: { $first: "$poStatus" }
            }
        },

        // Final Projection
        {
            $project: {
                _id: 1,
                order_id: 1,
                distillerName: 1,
                commodity: 1,
                quantityRequired: 1,
                totalAmount: 1,
                paymentSent: 1,
                outstandingPayment: 1,
                totalPenaltyAmount: 1, // Ensure total sum is included
                paymentStatus: 1
            }
        },
        { $sort: { [sortBy || 'createdAt']: -1, _id: -1 } }, 
    ];

    
    const withoutPaginationAggregationPipeline = [...aggregationPipeline];
    if (!isExport) {
        aggregationPipeline.push(
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    } 

    withoutPaginationAggregationPipeline.push({$count: "count"})
    const rows = await PurchaseOrderModel.aggregate(aggregationPipeline);
    const countResult = await PurchaseOrderModel.aggregate(withoutPaginationAggregationPipeline);
    const count = countResult?.[0]?.count ?? 0;

    const records = { rows, count };

        records.page = parseInt(page);
        records.limit = parseInt(limit);
        records.pages = limit != 0 ? Math.ceil(count / limit) : 0;
    
    if (isExport == 1) {
        const record = rows.map((item) => {
            return {
                "Order Id": item?.order_id || "NA",
                "Distiller Name": item?.distillerName || "NA",
                "Commodity": item?.commodity || "NA",
                "Quantity": item?.quantityRequired || "NA",
                "Total Amount": item?.totalAmount || "NA",
                "Payment Received": item?.paymentSent || "NA",
                "Outstanding Payment": item?.outstandingPayment || "NA",
                "Penalty Amount": item?.totalPenaltyAmount || "NA",
                "payment Status": item?.paymentStatus || "NA"
            };

        });

        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `Penalty-record.xlsx`,
                worksheetName: `Penalty-record`
            });
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("Penalty") }));
        }
    } else {
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Penalty") }));
    }
});

module.exports.batchList = asyncErrorHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy, search = '', filters = {}, order_id, isExport=0 } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const { user_id } = req;

        if (!order_id) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order Id") }] }));
        }

        let query = {
            orderId: new mongoose.Types.ObjectId(order_id),
            ...(search ? { purchaseId: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null }) // Search functionality
        };

        const aggregationPipeline = [
            { $match: query },
            {
                $lookup: {
                    from: "purchaseorders", // Adjust this to your actual collection name for branches
                    localField: "orderId",
                    foreignField: "_id",
                    as: "OrderDetails"
                }
            },
            { $unwind: { path: "$OrderDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    purchaseId: 1,
                    quantityRequired: 1,
                    scheduledPickupDate: 1,
                    actualPickupDate: 1,
                    totalAmount: '$payment.amount',
                    penaltyAmount: "$penaltyDetails.penaltyAmount",
                    penaltypaymentStatus: "$penaltyDetails.penaltypaymentStatus",
                    pickupStatus: 1,
                    orderId: order_id
                }
            },
            { $sort: { [sortBy || 'createdAt']: -1, _id: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit, 10) }
        ];

        const records = { count: 0, rows: [] };
        records.rows = await BatchOrderProcess.aggregate(aggregationPipeline);

        const countAggregation = [
            { $match: query },
            { $count: 'total' }
        ];
        const countResult = await BatchOrderProcess.aggregate(countAggregation);
        records.count = countResult.length > 0 ? countResult[0].total : 0;

        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;

        if (isExport == 1) {
            const record = records.rows.map((item) => {
                return {
                    "purchase Id": item?.purchaseId || "NA",
                    "quantity": item?.quantityRequired || "NA",
                    "scheduled Pickup Date": item?.scheduledPickupDate || "NA",
                    "actual Pickup Date": item?.actualPickupDate || "NA",
                    "total Amount": item?.totalAmount || "NA",
                    "penalty Amount": item?.penaltyAmount || "NA",
                    "penalty Payment Status": item?.penaltypaymentStatus || "NA",
                    "pickup Status": item?.pickupStatus || "NA"
                };

            });

            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Batch-record.xlsx`,
                    worksheetName: `Batch-record`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("Batch") }));
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Batch") }));
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
});

module.exports.waiveOff = asyncErrorHandler(async (req, res) => {
    try {
        const { batchIds = [] } = req.body;
        const { user_id } = req;

        if (!batchIds.length) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                errors: [{ message: "No batch IDs provided" }]
            }));
        }

        // Fetch all matching batch records along with their order IDs
        const records = await BatchOrderProcess.find({ _id: { $in: batchIds.map(b => b._id) } }, { orderId: 1 });

        if (!records.length) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                errors: [{ message: "No matching batches found" }]
            }));
        }

        // Extract order IDs from the fetched records
        const orderIds = records.map(record => record.orderId);

        // Update batches: Set penaltyAmount to 0 and update payment status
        const batchUpdateResult = await BatchOrderProcess.updateMany(
            { _id: { $in: batchIds.map(b => b._id) } },
            {
                $set: {
                    'penaltyDetails.penaltyAmount': 0,
                    'penaltyDetails.penaltypaymentStatus': _penaltypaymentStatus.waiveOff
                }
            }
        );

        // Update orders linked to the batch IDs
        const purchaseOrderModelResult = await PurchaseOrderModel.updateMany(
            { _id: { $in: orderIds } },
            {
                $set: {
                    'paymentInfo.penaltyStaus': _penaltypaymentStatus.waiveOff // Modify this as needed
                }
            }
        );

        return res.status(200).send(new serviceResponse({
            status: 200,
            message: `${batchUpdateResult.modifiedCount} batches waived off successfully, and ${purchaseOrderModelResult.modifiedCount} orders updated`
        }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
});

module.exports.updatePenaltyAmount = asyncErrorHandler(async (req, res) => {
    const { batchId } = req.params;
    const { penaltyAmount } = req.body;

    // throw error if penalty amount is not given
    if (!penaltyAmount) {
        return res.status(400).send(new serviceResponse({
            status: 400,
            errors: [{ message: "Please provide the penalty amount" }]
        }));
    }

    // penaltyAmount should be a number
    if (typeof penaltyAmount !== 'number' || isNaN(penaltyAmount)) {
        return res.status(400).send(new serviceResponse({
            status: 400,
            errors: [{ message: "Penalty Amount should be number" }]
        }));
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
        return res.status(400).json({ message: "Invalid batch ID." });
    }

    // // Validate ObjectId
    // if (!mongoose.Types.ObjectId.isValid(purchesId)) {
    //     return res.status(400).json({ message: "Invalid purches ID." });
    // }

    const order = await BatchOrderProcess.findOne({ _id: batchId }).populate("orderId");

    // no order found with given batchId or orderId
    if (!order) {
        return res.status(404).send(new serviceResponse({
            status: 404,
            errors: [{ message: "No matching order found" }]
        }));
    }

    // throw error if payment status is not pending 
    if (order.payment?.status !== _poBatchPaymentStatus.pending) {
        return res.status(400).send(new serviceResponse({
            status: 400,
            errors: [{ message: "Update not allowed. Payment status is not 'pending'." }]
        }));
    }

    await BatchOrderProcess.findOneAndUpdate({ _id: batchId }, {
        $set: {
            "penaltyDetails.penaltyAmount": penaltyAmount,
            "penaltyDetails.penaltypaymentStatus": _penaltypaymentStatus.pending,
            //   "orderId.paymentInfo.penaltyStaus": _penaltypaymentStatus.pending,
            //   "orderId.paymentInfo.penaltyAmount": penaltyAmount + Number(order.orderId.paymentInfo.penaltyAmount) ?? 0,
        }
    },
        { new: true, runValidators: true });

    await PurchaseOrderModel.findOneAndUpdate({ _id: order.orderId._id },
        {
            "paymentInfo.penaltyStaus": _penaltypaymentStatus.pending,
            "paymentInfo.penaltyAmount": penaltyAmount + Number(order.orderId.paymentInfo.penaltyAmount) ?? 0,
        },
        { new: true, runValidators: true }
    )
    return res.status(200).send(new serviceResponse({
        status: 200,
        message: "Penalty amount updated successfully"
    }));
});