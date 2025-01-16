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
const mongoose = require('mongoose');


module.exports.getOrders = asyncErrorHandler(async (req, res) => {

    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = "_id", search = '', isExport = 0 } = req.query;

    let matchStage = {
        'paymentInfo.advancePaymentStatus': _poAdvancePaymentStatus.paid,
        deletedAt: null,
    };

    if (search) {
        matchStage.$purchasedOrder.poNo = { $regex: search, $options: "i" };
    }

    let aggregationPipeline = [
        { $match: matchStage },
        { $sort: { [sortBy]: 1 } },
        {
            $lookup: {
                from: "distillers", // Adjust this to your actual collection name for branches
                localField: "distiller_id",
                foreignField: "_id",
                as: "distiller"
            }
        },
        { $unwind: { path: "$distiller", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                'orderId': '$purchasedOrder.poNo',
                'distillerName': '$distiller.basic_details.distiller_details.organization_name',
                'quantity': '$purchasedOrder.poQuantity',
                'totalAmount': '$paymentInfo.totalAmount',
                'advancePayment': '$paymentInfo.advancePayment',
                'remainingAmount': '$paymentInfo.balancePayment',
                createdAt: 1,
                'address': '$distiller.address.registered',
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
    records.count = await PurchaseOrderModel.countDocuments(matchStage);

    if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("Order")
    }));
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
            ...(search ? { batchId: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null }) // Search functionality
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
                    batchId: 1,
                    quantityRequired: 1,
                    scheduledPickupDate: 1,
                    actualPickupDate: 1,
                    totalAmount: '$payment.amount',
                    penaltyAmount: "$penaltyDetails.penaltyAmount",
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
