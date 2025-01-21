const mongoose = require('mongoose');
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { sendMail } = require("@src/v1/utils/helpers/node_mailer");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { decryptJwtToken } = require('@src/v1/utils/helpers/jwt');
const { BatchOrderProcess } = require('@src/v1/models/app/distiller/batchOrderProcess');
const { PurchaseOrderModel } = require('@src/v1/models/app/distiller/purchaseOrder');

  


//order-list 
module.exports.orderList = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
    const { user_id } = req;
    let query = {
        // 'paymentInfo.advancePaymentStatus': _poAdvancePaymentStatus.paid,
         distiller_id: new mongoose.Types.ObjectId('678dde6ca1a8099d0c11f342'),
        ...(search ? { orderId: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
    };

    const records = { count: 0 };

    records.rows = paginate == 1 ? await PurchaseOrderModel.find(query).select('product.name purchasedOrder.poQuantity purchasedOrder.poNo createdAt')
        .sort(sortBy)
        .skip(skip)
        .populate({ path: "distiller_id", select: "basic_details.distiller_details.organization_name " })
        // .populate({ path: "branch_id", select: "_id branchName branchId" })
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

});

module.exports.getPuchaseList = asyncErrorHandler(async (req, res) => {
    try {
       
        const { page = 1, limit = 10, sortBy, search = '', filters = {},order_id } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const { user_id } = req;

       
        if (!order_id) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("orderId") }] }));
        }

        let query = {
            orderId: new mongoose.Types.ObjectId(order_id),
             distiller_id: new mongoose.Types.ObjectId('6752f63d1af89e682f11084d'),//user_id
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
            { $unwind: { path: "$warehouseDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'distillers',
                    localField: 'distiller_id',
                    foreignField: '_id',
                    as: 'distellerDetails',
                },
            },
            { $unwind: { path: "$distellerDetails", preserveNullAndEmptyArrays: true } },
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
                    quantityRequired: 1,
                    amount: '$payment.amount',
                    scheduledPickupDate: 1,
                    actualPickupDate: 1,
                    OrderDetails:"$OrderDetails.product",
                    distellerDetails:"$distellerDetails.basic_details.distiller_details",
                    pickupLocation: '$warehouseDetails.addressDetails',
                    deliveryLocation: '$OrderDetails.deliveryLocation',
                    paymentStatus: '$payment.status',
                    penaltyStatus: '$penaltyDetails.penaltypaymentStatus'
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
            return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Purchase") }));
        } else {
            return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Purchase") }));
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
});


