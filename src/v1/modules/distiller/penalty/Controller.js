const { _generateOrderNumber, dumpJSONToExcel, handleDecimal } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { _webSocketEvents, _status, _penaltypaymentStatus } = require('@src/v1/utils/constants');
const { _userType } = require('@src/v1/utils/constants');
const moment = require("moment");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { BatchOrderProcess } = require("@src/v1/models/app/distiller/batchOrderProcess");
const mongoose = require('mongoose');


module.exports.getPenaltyOrder = asyncErrorHandler(async (req, res) => {

    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;
    const { user_id } = req;

    // Initialize matchQuery
    let matchQuery = {
        'paymentInfo.penaltyStaus': { $ne: _penaltypaymentStatus.NA },
        deletedAt: null
    };

    // Validate and add distiller_id
    if (mongoose.Types.ObjectId.isValid(user_id)) {
        matchQuery.distiller_id = new mongoose.Types.ObjectId(user_id);
    } else {
        return res.status(400).send({ message: "Invalid distiller" });
    }

    if (search) {
        matchQuery["purchasedOrder.poNo"] = { $regex: search, $options: "i" };
    }

    let aggregationPipeline = [
        { $match: matchQuery },
        {
            $lookup: {
                from: "branches", // Adjust this to your actual collection name for branches
                localField: "branch_id",
                foreignField: "_id",
                as: "branch"
            }
        },
        { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
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
                branchName: { $first: "$branch.branchName" },
                commodity: { $first: "$product.name" },
                grade: { $first: "$product.grade" },
                quantityRequired: { $first: "$purchasedOrder.poQuantity" },
                totalAmount: { $first: "$paymentInfo.totalAmount" },
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
                branchName: 1,
                commodity: 1,
                grade: 1,
                quantityRequired: 1,
                totalAmount: 1,
                totalPenaltyAmount: 1, // Ensure total sum is included
                paymentStatus: 1
            }
        }
    ];

    if (paginate == 1) {
        aggregationPipeline.push(
            { $sort: { [sortBy || 'createdAt']: -1, _id: -1 } }, // Secondary sort by _id for stability
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    } else {
        aggregationPipeline.push({ $sort: { [sortBy || 'createdAt']: -1, _id: -1 } },);
    }

    const rows = await PurchaseOrderModel.aggregate(aggregationPipeline);

    const countPipeline = [
        { $match: matchQuery },
        { $count: "total" }
    ];

    const countResult = await PurchaseOrderModel.aggregate(countPipeline);
    const count = countResult[0]?.total || 0;

    const records = { rows, count };

    if (paginate == 1) {
        records.page = parseInt(page);
        records.limit = parseInt(limit);
        records.pages = limit != 0 ? Math.ceil(count / limit) : 0;
    }

    if (isExport == 1) {
        const record = rows.map((item) => {
            return {
                "Order Id": item?.order_id || "NA",
                "BO Name": item?.branchName || "NA",
                "Commodity": item?.commodity || "NA",
                "Grade": item?.grade || "NA",
                "Quantity": item?.quantityRequired || "NA",
                "Total Amount": item?.totalAmount || "NA",
                "Total Penalty Amount": item?.totalPenaltyAmount || "NA",
                "Payment Status": item?.paymentStatus || "NA"
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
        const { page = 1, limit = 10, sortBy, search = '', filters = {}, order_id } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const { user_id } = req;

        if (!order_id) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order Id") }] }));
        }

        let query = {
            orderId: new mongoose.Types.ObjectId(order_id),
            distiller_id: new mongoose.Types.ObjectId(user_id),
            'penaltyDetails.penaltypaymentStatus': { $ne: _penaltypaymentStatus.NA },
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
