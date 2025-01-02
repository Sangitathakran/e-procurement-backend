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
const mongoose = require('mongoose');


/*
module.exports.getPenaltyOrder = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
    const { user_id } = req;

    let query = {
        'penaltyDetails.penaltyAmount': { $ne: 0 },
        distiller_id: user_id,
        ...(search ? { orderId: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
    };

    const records = { count: 0 };

    records.rows = paginate == 1 ? await BatchOrderProcess.find(query)
        .sort(sortBy)
        .skip(skip).populate({ path: "branch_id", select: "_id branchName branchId" })
        .limit(parseInt(limit)) : await BatchOrderProcess.find(query).sort(sortBy);

    records.count = await BatchOrderProcess.countDocuments(query);

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
*/
module.exports.getPenaltyOrder = asyncErrorHandler(async (req, res) => {

    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = {}, search = '', isExport = 0 } = req.query;
    const { user_id } = req;

    // Initialize matchQuery
    let matchQuery = {
        'penaltyDetails.penaltyAmount': { $ne: 0 },
        deletedAt: null
    };

    // Validate and add distiller_id
    if (mongoose.Types.ObjectId.isValid(user_id)) {
        matchQuery.distiller_id = new mongoose.Types.ObjectId(user_id);
    } else {
        return res.status(400).send({ message: "Invalid distiller" });
    }

    if (search) {
        matchQuery.batchId = { $regex: search, $options: "i" };
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
                from: "purchaseorders", // Adjust this to your actual collection name for branches
                localField: "orderId",
                foreignField: "_id",
                as: "OrderDetails"
            }
        },
        { $unwind: { path: "$OrderDetails", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                order_id: "$OrderDetails.purchasedOrder.poNo",
                branchName: "$branch.branchName",
                commodity: "$OrderDetails.product.name",
                grade: "$OrderDetails.product.grade",
                quantityRequired: 1,   
                totalAmount: "$OrderDetails.paymentInfo.totalAmount",
                penaltyAmount: "penaltyDetails.penaltyAmount", 
                "payment.status":1,
                pickupStatus: 1,
            }
        }
    ];

    if (paginate == 1) {
        aggregationPipeline.push(
            { $sort: sortBy },
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    } else {
        aggregationPipeline.push({ $sort: sortBy });
    }

    const rows = await BatchOrderProcess.aggregate(aggregationPipeline);

    const countPipeline = [
        { $match: matchQuery },
        { $count: "total" }
    ];

    const countResult = await BatchOrderProcess.aggregate(countPipeline);
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
                "Order Id": item?.orderId || "NA",
                "BO Name": item?.branchName || "NA",
                "Commodity": item?.product?.name || "NA",
                "Grade": item?.product?.grade || "NA",
                "Quantity": item?.product?.quantity || "NA",
                "MSP": item?.quotedPrice || "NA",
                "Delivery Location": item?.address?.deliveryLocation || "NA"
            };
        });

        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `Requirement-record.xlsx`,
                worksheetName: `Requirement-record`
            });
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("procurement") }));
        }
    } else {
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement") }));
    }
});


module.exports.getPenaltyById = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const record = await BatchOrderProcess.findOne({ _id: id });

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order") }] }))
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("order") }))
})
