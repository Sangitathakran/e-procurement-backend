const { _generateOrderNumber, dumpJSONToExcel, handleDecimal } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { _webSocketEvents, _status, _poRequestStatus, _poPaymentStatus, _poAdvancePaymentStatus } = require('@src/v1/utils/constants');
const { _userType } = require('@src/v1/utils/constants');
const moment = require("moment");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { BatchOrderProcess } = require("@src/v1/models/app/distiller/batchOrderProcess");
const { mongoose } = require("mongoose");


module.exports.getOrder = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
    const { user_id } = req;
    let query = {
        'paymentInfo.advancePaymentStatus': _poAdvancePaymentStatus.paid,
        distiller_id: new mongoose.Types.ObjectId(user_id),
        ...(search ? { orderId: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
    };

    const records = { count: 0 };

    records.rows = paginate == 1 ? await PurchaseOrderModel.find(query)
        .sort(sortBy)
        .skip(skip).populate({ path: "branch_id", select: "_id branchName branchId" })
        .limit(parseInt(limit)) : await PurchaseOrderModel.find(query).sort(sortBy);

    records.count = await PurchaseOrderModel.countDocuments(query);

    if (paginate == 1) {
        records.page = page
        records.limit = limit
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
    }

    if (isExport == 1) {

        const record = records.rows.map((item) => {

            return {
                "Order Id": item?.reqNo || "NA",
                "BO Name": item?.branch_id?.branchName || "NA",
                "Commodity": item?.product?.name || "NA",
                "Grade": item?.product?.grade || "NA",
                "Quantity": item?.product?.quantity || "NA",
                "MSP": item?.quotedPrice || "NA",
                "Delivery Location": item?.address?.deliveryLocation || "NA"
            }
        })

        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `Requirement-record.xlsx`,
                worksheetName: `Requirement-record`
            });
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("procurement") }))

        }
    } else {
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement") }))
    }

})

module.exports.getOrderById = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const record = await PurchaseOrderModel.findOne({ _id: id });

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order") }] }))
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("order") }))
})

module.exports.deleteOrder = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
    }

    const record = await PurchaseOrderModel.findOne({ _id: id });

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Requirement") }] }))
    }

    await record.deleteOne();

    return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.deleted("Requirement") }));
});

module.exports.createBatch = asyncErrorHandler(async (req, res) => {
    const { user_id, user_type } = req;
    const { warehouseId, orderId, quantityRequired } = req.body;

    if (user_type && user_type != _userType.distiller) {
        return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized() }] }));
    }

    const poRecord = await PurchaseOrderModel.findOne({ _id: orderId, deletedAt: null });

    if (!poRecord) {
        return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound("PO") }));
    }
    const { purchasedOrder, fulfilledQty, paymentInfo } = poRecord;

    if (quantityRequired > purchasedOrder.poQuantity) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Quantity should not exceed PO Qty." }] }))
    }

    const existBatch = await BatchOrderProcess.find({ distiller_id: user_id, orderId });
    if (existBatch) {
        const addedQty = existBatch.reduce((quantityRequired, existBatch) => quantityRequired + existBatch.quantityRequired, 0);

        if (addedQty >= purchasedOrder.poQuantity) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Cannot create more Batch, Qty already fulfilled." }] }))
        }

        const remainingQty = handleDecimal(purchasedOrder.poQuantity - addedQty);

        if (quantityRequired > remainingQty) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Quantity should not exceed PO Remaining Qty." }] }))
        }
    }

    const msp = 24470;
    const totalAmount = handleDecimal(paymentInfo.totalAmount);
    const tokenAmount = handleDecimal(paymentInfo.advancePayment);
    const remainingAmount = handleDecimal(paymentInfo.balancePayment);

    let amountToBePaid = ''
    if (existBatch) {
        amountToBePaid = handleDecimal(msp * quantityRequired);
    } else {
        amountToBePaid = handleDecimal((msp * quantityRequired) - tokenAmount);
    }

    let randomVal;
    let isUnique = false;

    while (!isUnique) {
        randomVal = _generateOrderNumber();
        const existingReq = await PurchaseOrderModel.findOne({ poNo: randomVal });
        if (!existingReq) {
            isUnique = true;
        }
    }

    let currentDate = new Date(); // Get the current date
         
    const record = await BatchOrderProcess.create({
        distiller_id: user_id,
        warehouseId,
        orderId,
        batchId: randomVal,
        quantityRequired: handleDecimal(quantityRequired),
        'payment.amount': amountToBePaid,
        scheduledPickupDate: currentDate.setDate(currentDate.getDate() + 7),
        createdBy: user_id
    });

    poRecord.fulfilledQty = handleDecimal(fulfilledQty + quantityRequired)

    await poRecord.save();

    eventEmitter.emit(_webSocketEvents.procurement, { ...record, method: "created" });

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.created("PO Batch") }));
});

module.exports.deliveryScheduledBatchList = asyncErrorHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy, search = '', filters = {}, order_id, warehouse_id } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const { user_id } = req;

        if (!order_id) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("orderId") }] }));
        }

        if (!warehouse_id) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("warehouseId") }] }));
        }

        let query = {
            orderId: new mongoose.Types.ObjectId(order_id),
            warehouseId: new mongoose.Types.ObjectId(warehouse_id),
            distiller_id: new mongoose.Types.ObjectId(user_id),
            ...(search ? { batchId: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null }) // Search functionality
        };

        const aggregationPipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'warehousedetails', // Collection name in MongoDB
                    localField: 'warehouseOwnerId',
                    foreignField: 'warehouseId',
                    as: 'warehouseDetails',
                },
            },
            { $unwind: { path: '$warehouseDetails', preserveNullAndEmptyArrays: true } },
            // {
            //     $lookup: {
            //         from: "branches", // Adjust this to your actual collection name for branches
            //         localField: "branch_id",
            //         foreignField: "_id",
            //         as: "branch"
            //     }
            // },
            // { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
            // {
            //     $lookup: {
            //         from: "purchaseorders", // Adjust this to your actual collection name for branches
            //         localField: "orderId",
            //         foreignField: "_id",
            //         as: "OrderDetails"
            //     }
            // },
            // { $unwind: { path: "$OrderDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    batchId: 1,
                    warehouseName: '$warehouseDetails.basicDetails.warehouseName',
                    // branchName: "$branch.branchName",
                    // commodity: "$OrderDetails.product.name",
                    // grade: "$OrderDetails.product.grade",
                    pickupLocation: '$warehouseDetails.addressDetails',
                    quantityRequired: 1,
                    amount: '$payment.amount',
                    // penaltyAmount: "$penaltyDetails.penaltyAmount",
                    scheduledPickupDate: 1,
                    actualPickupDate: 1,
                    max_lifting_period: "7 days from scheduled pick-up date",
                    pickupStatus: 1,
                    // distiller_id: 1,
                    // warehouseId: 1,
                    orderId: order_id
                }
            },
            { $sort: { [sortBy || 'createdAt']: 1 } },
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

        if (!records) {
            return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("batch") }));
        } else {
            return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("batch") }));
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
});

module.exports.orderDetails = asyncErrorHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy, search = '', filters = {}, order_id } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const { user_id } = req;

        if (!order_id) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("orderId") }] }));
        }

        let query = {
            orderId: new mongoose.Types.ObjectId(order_id),
            distiller_id: new mongoose.Types.ObjectId(user_id),
            ...(search ? { batchId: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null }) // Search functionality
        };

        const aggregationPipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'warehousedetails',
                    localField: '_id',
                    foreignField: 'warehouseId',
                    as: 'warehouseDetails',
                },
            },
            { $unwind: { path: '$warehouseDetails', preserveNullAndEmptyArrays: true } },
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
                    purchaseId: '$batchId',
                    // warehouseName: '$warehouseDetails.basicDetails.warehouseName',                    
                    quantityRequired: 1,
                    amount: '$payment.amount',
                    scheduledPickupDate: 1,
                    actualPickupDate: 1,
                    pickupLocation: '$warehouseDetails.addressDetails',
                    deliveryLocation: '$OrderDetails.deliveryLocation',
                    paymentStatus:'$payment.status',
                    penaltyStatus: '$penaltyDetails.penaltypaymentStatus',                    
                    orderId: order_id
                }
            },
            { $sort: { [sortBy || 'createdAt']: 1 } },
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

        if (!records) {
            return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("batch") }));
        } else {
            return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("batch") }));
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
});
