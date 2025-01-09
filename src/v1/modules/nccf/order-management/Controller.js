const mongoose = require('mongoose');
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _auth_module, _query } = require("@src/v1/utils/constants/messages");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { Auth, decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType, _userStatus, _poAdvancePaymentStatus } = require('@src/v1/utils/constants');
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { wareHousev2 } = require("@src/v1/models/app/warehouse/warehousev2Schema");


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

module.exports.getOrderById = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;

    let matchStage = {
        _id: new mongoose.Types.ObjectId(id),
        deletedAt: null,
    };

    let aggregationPipeline = [
        { $match: matchStage }
    ];

    const record = await PurchaseOrderModel.aggregate(aggregationPipeline);

    if (!record || record.length === 0) {
        return res.status(404).send(new serviceResponse({
            status: 404,
            message: _response_message.notFound("Order")
        }));
    }

    return res.status(200).send(new serviceResponse({
        status: 200,
        data: record[0],
        message: _response_message.found("Order")
    }));
});

module.exports.warehouseList = asyncErrorHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy, search = '', filters = {}, order_id, isExport = 0 } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        if (!order_id) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order_id") }] }));
        }

        const branch = await PurchaseOrderModel.findOne({ _id: order_id }).select({ _id: 0, branch_id: 1, product:1 }).lean();

        let query = search ? {
            $or: [
                { 'companyDetails.name': { $regex: search, $options: 'i' } },
                { 'ownerDetails.name': { $regex: search, $options: 'i' } },
                { 'warehouseDetails.basicDetails.warehouseName': { $regex: search, $options: 'i' } },
            ],
            ...filters, // Additional filters
        } : {};

        const aggregationPipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'warehousedetails', // Collection name in MongoDB
                    localField: '_id',
                    foreignField: 'warehouseOwnerId',
                    as: 'warehouseDetails',
                },
            },
            {
                $unwind: {
                    path: '$warehouseDetails',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    warehouseId: '$warehouseOwner_code',
                    warehouseName: '$warehouseDetails.basicDetails.warehouseName',
                    address: '$warehouseDetails.addressDetails',
                    totalCapicity: "$warehouseDetails.basicDetails.warehouseCapacity",
                    utilizedCapicity: {
                        $cond: {
                            if: { $gt: [{ $ifNull: ['$warehouseDetails.inventory.requiredStock', 0] }, 0] },
                            then: '$warehouseDetails.inventory.requiredStock',
                            else: '$warehouseDetails.inventory.stock'
                        }
                    },  
                    realTimeStock: '$warehouseDetails.inventory.stock',
                    commodity: branch.product.name,
                    orderId: order_id,
                    branch_id: branch.branch_id
                }
            },

            { $sort: { [sortBy]: 1 } },
            { $skip: skip },
            { $limit: parseInt(limit, 10) }
        ];

        const records = { count: 0, rows: [] };
        records.rows = await wareHousev2.aggregate(aggregationPipeline);

        const countAggregation = [
            { $match: query },
            { $count: 'total' }
        ];
        const countResult = await wareHousev2.aggregate(countAggregation);
        records.count = countResult.length > 0 ? countResult[0].total : 0;

        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        // Export functionality
        if (isExport == 1) {
            const record = records.rows.map((item) => {
                return {
                    "WareHouse Name": item?.warehouseName || 'NA',
                    "pickup Location": item?.pickupLocation || 'NA',
                    "Inventory availalbility": item?.stock ?? 'NA',
                    "warehouse Timing": item?.warehouseTiming ?? 'NA',
                    "Nodal officer": item?.nodalOfficerName || 'NA',
                    "POC Name": item?.pointOfContact?.name ?? 'NA',
                    "POC Email": item?.pointOfContact?.email ?? 'NA',
                    "POC Phone": item?.pointOfContact?.phone ?? 'NA',

                };
            });

            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `warehouse-List.xlsx`,
                    worksheetName: `warehouse-List`
                });
            } else {
                return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("warehouse") }));
            }
        } else {
            return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("warehouse") }));
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
});

module.exports.updateMouApprovalStatus = asyncErrorHandler(async (req, res) => {
    const { id } = req.query;
    const distiller = await Distiller.findOne({ _id: id });

    if (!distiller) {
        return res.send(
            new serviceResponse({
                status: 400,
                errors: [{ message: _response_message.notFound("Distiller") }],
            })
        );
    }

    distiller.mou = true,
        distiller.mou_approval = _userStatus.approved,

        await distiller.save();

    return res.send(
        new serviceResponse({
            status: 200,
            message: [{ message: _response_message.updated("Distiller MOU") }],
        })
    );
});
