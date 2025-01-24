const mongoose = require('mongoose');
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _auth_module, _query } = require("@src/v1/utils/constants/messages");
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { Auth, decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType, _userStatus, _poAdvancePaymentStatus } = require('@src/v1/utils/constants');
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { BatchOrderProcess } = require("@src/v1/models/app/distiller/batchOrderProcess");


module.exports.getOrders = asyncErrorHandler(async (req, res) => {

    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = "_id", search = '', isExport = 0 } = req.query;

    let matchStage = {
        'paymentInfo.advancePaymentStatus': _poAdvancePaymentStatus.paid,
        deletedAt: null,
    };

    let aggregationPipeline = [
        { $match: matchStage },
        { $sort: { [sortBy || 'createdAt']: -1, _id: 1 } },
        {
            $lookup: {
                from: "distillers",
                localField: "distiller_id",
                foreignField: "_id",
                as: "distillerDetails"
            }
        },
        { $unwind: { path: "$distillerDetails", preserveNullAndEmptyArrays: true } },

        // Add search filter after the lookup
        ...(search
            ? [{
                $match: {
                    $or: [
                        { 'purchasedOrder.poNo': { $regex: search, $options: "i" } },
                        { 'distillerDetails.basic_details.distiller_details.organization_name': { $regex: search, $options: "i" } }
                    ]
                }
            }]
            : []),

        { $unwind: { path: "$batchDetails", preserveNullAndEmptyArrays: true } },

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
                recievedPayment: { $first: "$paymentInfo.paidAmount" },
                outstandingPayment: { $first: "$paymentInfo.balancePayment" },
                totalPenaltyAmount: {
                    $sum: {
                        $ifNull: ["$batchDetails.penaltyDetails.penaltyAmount", 0]
                    }
                },
                paymentStatus: { $first: "$poStatus" },
                penaltyStatus: { $first: "$paymentInfo.penaltyStaus" }
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
                recievedPayment: 1,
                outstandingPayment: 1,
                totalPenaltyAmount: 1,
                paymentStatus: 1,
                penaltyStatus: 1
            }
        }
    ];


    if (paginate == 1) {
        aggregationPipeline.push(
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    }

    const records = { count: 0 };
    records.rows = await PurchaseOrderModel.aggregate(aggregationPipeline);
    const totalPipeline = [...aggregationPipeline];
    totalPipeline.push({ $count: "count" });
    const totalCount = await PurchaseOrderModel.aggregate(totalPipeline); // Total count of documents
    records.count = totalCount?.[0]?.count ?? 0;

    if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    // return res.status(200).send(new serviceResponse({
    //     status: 200,
    //     data: records,
    //     message: _response_message.found("Order")
    // }));


    // Export functionality
    if (isExport == 1) {
        const record = records.rows.map((item) => {

            return {
                "order Id": item?.order_id || 'NA',
                "Distiller Name": item?.distillerName || 'NA',
                "commodity": item?.commodity ?? 'NA',
                "quantity": item?.quantityRequired ?? 'NA',
                "total Amount": item?.totalAmount || 'NA',
                "recieved Payment": item?.recievedPayment ?? 'NA',
                "outstanding Payment": item?.outstandingPayment ?? 'NA',
                "total Penalty Amount": item?.totalPenaltyAmount ?? 'NA',
                "payment Status": item?.paymentStatus ?? 'NA',
                "penalty Status": item?.penaltyStatus ?? 'NA'
            };

        });

        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `Order-List.xlsx`,
                worksheetName: `Order-List`
            });
        } else {
            return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Order") }));
        }
    } else {
        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Order") }));
    }

});

module.exports.batchList = asyncErrorHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy, search = '', order_id, isExport = 0 } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const { user_id } = req;

        if (!order_id) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order Id") }] }));
        }

        let query = {
            orderId: new mongoose.Types.ObjectId(order_id),
            deletedAt: null
        };

        if (search) {
            query.purchaseId = { $regex: search, $options: "i" };
        }

        const aggregationPipeline = [
            { $match: query },
            {
                $lookup: {
                    from: "purchaseorders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "OrderDetails"
                }
            },
            { $unwind: { path: "$OrderDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "warehousedetails",
                    localField: "warehouseOwnerId",
                    foreignField: "warehouseId",
                    as: "warehouseDetails",
                },
            },
            { $unwind: { path: "$warehouseDetails", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$_id",
                    purchaseId: { $first: "$purchaseId" },
                    warehouseId: { $first: "$warehouseDetails.basicDetails.warehouseId" },
                    warehouseName: { $first: "$warehouseDetails.basicDetails.warehouseName" },
                    quantityRequired: { $first: "$quantityRequired" },
                    scheduledPickupDate: { $first: "$scheduledPickupDate" },
                    actualPickupDate: { $first: "$actualPickupDate" },
                    totalAmount: { $first: "$payment.amount" },
                    penaltyAmount: { $first: "$penaltyDetails.penaltyAmount" },
                    pickupStatus: { $first: "$pickupStatus" },
                    orderId: { $first: order_id }
                }
            },
            { $sort: { [sortBy || "createdAt"]: -1, _id: 1 } },
            { $skip: skip },
            { $limit: parseInt(limit, 10) }
        ];

        const records = { count: 0, rows: [] };
        records.rows = await BatchOrderProcess.aggregate(aggregationPipeline);

        const countAggregation = [{ $match: query }, { $count: "total" }];
        const countResult = await BatchOrderProcess.aggregate(countAggregation);
        records.count = countResult.length > 0 ? countResult[0].total : 0;

        records.page = parseInt(page, 10);
        records.limit = parseInt(limit, 10);
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;

        // Export functionality
        if (isExport == 1) {
            const record = records.rows.map((item) => {

                return {
                    "purchase Id": item?.purchaseId || 'NA',
                    "warehouse Id": item?.warehouseId || 'NA',
                    "warehouse Name": item?.warehouseName ?? 'NA',
                    "quantity": item?.quantityRequired ?? 'NA',
                    "scheduled Pickup Date": item?.scheduledPickupDate || 'NA',
                    "actual Pickup Date": item?.actualPickupDate ?? 'NA',
                    "total Amount": item?.totalAmount ?? 'NA',
                    "penalty Amount": item?.penaltyAmount ?? 'NA',
                    "pickup Status" : item?.pickupStatus ?? 'NA'
                };
            });

            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Batch-List.xlsx`,
                    worksheetName: `Batch-List`
                });
            } else {
                return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Batch") }));
            }
        } else {
            return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Batch") }));
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
});
