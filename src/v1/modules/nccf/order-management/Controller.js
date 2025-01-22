const mongoose = require('mongoose');
const { _handleCatchErrors, dumpJSONToExcel, handleDecimal, _distillerMsp, _taxValue } = require("@src/v1/utils/helpers")
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _auth_module, _query } = require("@src/v1/utils/constants/messages");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { Auth, decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType, _poAdvancePaymentStatus, _poBatchStatus, _poBatchPaymentStatus } = require('@src/v1/utils/constants');
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { wareHousev2 } = require("@src/v1/models/app/warehouse/warehousev2Schema");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { BatchOrderProcess } = require("@src/v1/models/app/distiller/batchOrderProcess");

/*
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
                'commodity': '$product.name',
                'distillerName': '$distiller.basic_details.distiller_details.organization_name',
                'quantity': '$purchasedOrder.poQuantity',
                'totalAmount': '$paymentInfo.totalAmount',
                'advancePayment': '$paymentInfo.advancePayment',
                'remainingAmount': '$paymentInfo.balancePayment',
                createdAt: 1,
                'address': '$distiller.address.registered',
            }
        },
        
            { $sort: { [sortBy]: 1 } },
            { $skip: skip },
            { $limit: parseInt(limit, 10) },
    ];

    if (paginate == 1) {
        aggregationPipeline.push(
            { $sort: { [sortBy || 'createdAt']: -1, _id: 1 } }, // Secondary sort by _id for stability
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    } else {
        aggregationPipeline.push({ $sort: { [sortBy || 'createdAt']: -1, _id: 1 } });
    }
    const records = { count: 0 };
    records.rows = await PurchaseOrderModel.aggregate(aggregationPipeline);
    records.count = await PurchaseOrderModel.countDocuments(matchStage);

    records.page = page;
    records.limit = limit;
    records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    

    return res.status(200).send(new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("Order")
    }));
});
*/

module.exports.getOrders = asyncErrorHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        paginate = 1,
        sortBy = "_id",
        search = '',
    } = req.query;

    // Convert query parameters to integers for safety
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    let matchStage = {
        'paymentInfo.advancePaymentStatus': _poAdvancePaymentStatus.paid,
        deletedAt: null,
    };

    if (search) {
        matchStage['purchasedOrder.poNo'] = { $regex: search, $options: "i" };
    }

    let aggregationPipeline = [
        { $match: matchStage },
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
                orderId: '$purchasedOrder.poNo',
                commodity: '$product.name',
                distillerName: '$distiller.basic_details.distiller_details.organization_name',
                quantity: '$purchasedOrder.poQuantity',
                totalAmount: '$paymentInfo.totalAmount',
                advancePayment: '$paymentInfo.advancePayment',
                remainingAmount: '$paymentInfo.balancePayment',
                createdAt: 1,
                address: '$distiller.address.registered',
            }
        },
        { $sort: { [sortBy]: 1 } },
    ];

    // Add pagination if enabled
    if (paginate === 1 || paginate === '1') {
        aggregationPipeline.push(
            { $skip: skip },
            { $limit: limitNum }
        );
    }

    const records = { count: 0 };
    records.rows = await PurchaseOrderModel.aggregate(aggregationPipeline); // Fetch paginated data
    records.count = await PurchaseOrderModel.countDocuments(matchStage); // Total count of documents

    // Calculate total pages and add pagination info
    records.page = pageNum;
    records.limit = limitNum;
    records.pages = limitNum !== 0 ? Math.ceil(records.count / limitNum) : 0;

    return res.status(200).send(new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("Order")
    }));
});

module.exports.batchList = asyncErrorHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, paginate = 1, sortBy = "createdAt", search = '', filters = {}, order_id } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const { user_id } = req;

        if (!order_id) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order Id") }] }));
        }

        let query = {
            orderId: new mongoose.Types.ObjectId(order_id),
            status: _poBatchStatus.pending,
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
                $lookup: {
                    from: 'warehousedetails', // Collection name in MongoDB
                    localField: 'warehouseId',
                    foreignField: '_id',
                    as: 'warehouseDetails',
                },
            },
            { $unwind: { path: '$warehouseDetails', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'warehousev2', // Collection name in MongoDB
                    localField: 'warehouseOwnerId',
                    foreignField: '_id',
                    as: 'warehousev2Details',
                },
            },
            {
                $unwind: {
                    path: '$warehousev2Details',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    // warehouseId: 1,
                    purchaseId: '$purchaseId',
                    warehouseId: {
                        $cond: {
                            if: { $ifNull: ['$warehouseDetailsId', 0] },
                            then: '$warehouseDetailsId',
                            else: '$warehousev2Details.warehouseOwner_code'
                        }
                    },
                    warehouseName: '$warehouseDetails.basicDetails.warehouseName',
                    warehouseLocation: '$warehouseDetails.addressDetails',
                    quantityRequired: 1,
                    pendingAmount: "$payment.amount",
                    comment: "$comment",
                    status: "$status",
                    orderId: order_id
                }
            }
        ];

        if (paginate == 1) {
            aggregationPipeline.push(
                { $sort: { [sortBy || 'createdAt']: -1, _id: 1 } },
                { $skip: parseInt(skip) },
                { $limit: parseInt(limit) }
            );
        } else {
            aggregationPipeline.push({ $sort: { [sortBy || 'createdAt']: -1, _id: 1 } });
        }

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

        const branch = await PurchaseOrderModel.findOne({ _id: order_id }).select({ _id: 0, branch_id: 1 }).lean();

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
                    from: 'warehousev2', // Collection name in MongoDB
                    localField: 'warehouseOwnerId',
                    foreignField: '_id',
                    as: 'warehousev2Details',
                },
            },
            {
                $unwind: {
                    path: '$warehousev2Details',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    warehouseName: '$basicDetails.warehouseName',
                    pickupLocation: '$addressDetails',
                    stock: {
                        $cond: {
                            if: { $gt: [{ $ifNull: ['$inventory.requiredStock', 0] }, 0] },
                            then: '$inventory.requiredStock',
                            else: '$inventory.stock'
                        }
                    },
                    warehouseTiming: '$inventory.warehouse_timing',
                    warehouseCapacity: '$warehouseCapacity',
                    utilizedCapacity: {
                        $cond: {
                            if: { $gt: [{ $ifNull: ['$inventory.stock', 0] }, 0] },
                            then: '$inventory.requiredStock',
                            else: '$inventory.stock'
                        }
                    },
                    requiredStock:{
                        $cond: {
                            if: { $gt: [{ $ifNull: ['$inventory.requiredStock', 0] }, 0] },
                            then: '$inventory.stock',
                            else: '$inventory.requiredStock'
                        }
                    },
                    nodalOfficerName: '$warehousev2Details.ownerDetails.name',
                    nodalOfficerContact: '$warehousev2Details.ownerDetails.mobile',
                    nodalOfficerEmail: '$warehousev2Details.ownerDetails.email',
                    pocAtPickup: '$authorizedPerson.name',
                    warehouseOwnerId: '$warehouseOwnerId',
                    warehouseId: {
                        $cond: {
                            if: { $ifNull: ['$warehouseDetailsId', 0] },
                            then: '$warehouseDetailsId',
                            else: '$warehousev2Details.warehouseOwner_code'
                        }
                    },
                    orderId: order_id,
                    // branch_id: branch.branch_id                    
                }
            },

            { $sort: { [sortBy]: 1 } },
            { $skip: skip },
            { $limit: parseInt(limit, 10) }
        ];

        const records = { count: 0, rows: [] };
        records.rows = await wareHouseDetails.aggregate(aggregationPipeline);

        const countAggregation = [
            { $match: query },
            { $count: 'total' }
        ];
        const countResult = await wareHouseDetails.aggregate(countAggregation);
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

module.exports.requiredStockUpdate = asyncErrorHandler(async (req, res) => {
    try {
        const { inventoryData } = req.body;

        // Validate input
        if (
            !inventoryData ||
            !Array.isArray(inventoryData) ||
            inventoryData.length === 0 ||
            inventoryData.some((item) => !item.warehouseId || typeof item.requiredQuantity !== "number")
        ) {
            return res.status(400).send(
                new serviceResponse({ status: 400, errors: [{ message: "Invalid inventoryData provided" }] })
            );
        }

        // Fetch all warehouses to validate stock
        const warehouseIds = inventoryData.map((item) => item.warehouseId);
        const warehouses = await wareHouseDetails.find({ _id: { $in: warehouseIds } });

        // Check if all warehouseIds are valid
        if (warehouses.length !== inventoryData.length) {
            return res.status(400).send(
                new serviceResponse({
                    status: 400,
                    errors: [{ message: "Warehouses were not found" }],
                })
            );
        }

        // Prepare bulk operations
        const bulkOperations = [];

        inventoryData.forEach(({ warehouseId, requiredQuantity }) => {
            // Filter to update both stock and requiredStock if stock is undefined, null, or 0
            bulkOperations.push({
                updateOne: {
                    filter: {
                        _id: warehouseId,
                        $or: [
                            { "inventory.stock": { $exists: false } }, // If stock is undefined
                            { "inventory.stock": { $eq: null } },     // If stock is null
                            { "inventory.stock": { $eq: 0 } },        // If stock is 0
                        ],
                    },
                    update: {
                        $set: {
                            "inventory.requiredStock": handleDecimal(requiredQuantity),
                            "inventory.stock": handleDecimal(requiredQuantity), // Update stock if undefined, null, or 0
                        },
                    },
                },
            });

            // Filter to update only requiredStock if stock is already defined and greater than 0
            bulkOperations.push({
                updateOne: {
                    filter: {
                        _id: warehouseId,
                        "inventory.stock": { $gt: 0 }, // Ensure stock is greater than 0
                    },
                    update: {
                        $set: {
                            "inventory.requiredStock": handleDecimal(requiredQuantity), // Only update requiredStock
                        },
                    },
                },
            });
        });

        // Execute bulk operations
        const result = await wareHouseDetails.bulkWrite(bulkOperations);

        return res.status(200).send(
            new serviceResponse({
                status: 200,
                message: `${result.modifiedCount} Required Quantity updated successfully`,
            })
        );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
});

module.exports.batchstatusUpdate = asyncErrorHandler(async (req, res) => {
    try {
        const { batchId, status, quantity, comment } = req.body;

        if (!batchId) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch/Purchase Id") }] }));
        }

        if (!status) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Status") }] }));
        }

        if (!quantity) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Quantity") }] }));
        }

        const record = await BatchOrderProcess.findOne({ _id: batchId });
        console.log(record);
        if (!record) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }));
        }

        // Validate quantity
        if (quantity !== undefined && quantity > record.quantityRequired) {
            return res.send(new serviceResponse({
                status: 400,
                errors: [{ message: "quantity cannot be more than existing batch quantity Required" }]
            }));
        }

        const msp = _distillerMsp();
        // const totalAmount = handleDecimal(record.paymentInfo.totalAmount);
        // const tokenAmount = handleDecimal(record.paymentInfo.advancePayment);
        // const remainingAmount = handleDecimal(record.paymentInfo.balancePayment);
        const amountToBePaid = handleDecimal(msp * record.quantityRequired);

        record.status = status;
        record.quantityRequired = quantity;
        record.payment.amount = amountToBePaid;
        record.comment = comment;

        await record.save();

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.updated("Batch") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
})

module.exports.scheduleListList = asyncErrorHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy, search = '', filters = {}, order_id } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        if (!order_id) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order Id") }] }));
        }

        let query = {
            orderId: new mongoose.Types.ObjectId(order_id),
            status: { $nin: [_poBatchStatus.pending, _poBatchStatus.rejected] }, // Exclude 'pending' and 'accepted'
            'payment.status': _poBatchPaymentStatus.paid,
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
            {
                $lookup: {
                    from: 'warehousedetails', // Collection name in MongoDB
                    localField: 'warehouseId',
                    foreignField: '_id',
                    as: 'warehouseDetails',
                },
            },
            { $unwind: { path: '$warehouseDetails', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'warehousev2', // Collection name in MongoDB
                    localField: 'warehouseOwnerId',
                    foreignField: '_id',
                    as: 'warehousev2Details',
                },
            },
            {
                $unwind: {
                    path: '$warehousev2Details',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    purchaseId: '$purchaseId',
                    warehouseId: {
                        $cond: {
                            if: { $ifNull: ['$warehouseDetailsId', 0] },
                            then: '$warehouseDetailsId',
                            else: '$warehousev2Details.warehouseOwner_code'
                        }
                    },
                    warehouseName: '$warehouseDetails.basicDetails.warehouseName',
                    warehouseLocation:'$warehouseDetails.addressDetails',
                    quantityRequired: 1,
                    amount: "$payment.amount",
                    paymentStatus: "$payment.status",
                    scheduledPickupDate: "$scheduledPickupDate",
                    actualPickUp: "$actualPickupDate",
                    pickupStatus: "$pickupStatus",
                    status: 1,
                    orderId: order_id
                }
            },

            { $sort: { [sortBy || 'createdAt']: -1, _id: 1 } },
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

module.exports.batchscheduleDateUpdate = asyncErrorHandler(async (req, res) => {
    try {
        const { batchId, scheduledPickupDate } = req.body;

        if (!batchId) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch/purchase Id") }] }));
        }

        if (!scheduledPickupDate) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch schedule Date") }] }));
        }

        const record = await BatchOrderProcess.findOne({ _id: batchId });

        if (!record) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }));
        }

        record.scheduledPickupDate = scheduledPickupDate;

        await record.save();

        return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.updated("Batch") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
})

module.exports.batchRejectedList = asyncErrorHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy, search = '', filters = {}, order_id } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        if (!order_id) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order Id") }] }));
        }
        console.log(order_id);
        let query = {
            orderId: new mongoose.Types.ObjectId(order_id),
            status: _poBatchStatus.rejected,
            // 'payment.status': _poBatchPaymentStatus.paid,
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
            // { $unwind: { path: "$OrderDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'warehousedetails', // Collection name in MongoDB
                    localField: 'warehouseId',
                    foreignField: '_id',
                    as: 'warehouseDetails',
                },
            },
            { $unwind: { path: '$warehouseDetails', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'warehousev2', // Collection name in MongoDB
                    localField: 'warehouseOwnerId',
                    foreignField: '_id',
                    as: 'warehousev2Details',
                },
            },
            {
                $unwind: {
                    path: '$warehousev2Details',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    purchaseId: '$purchaseId',
                    warehouseId: {
                        $cond: {
                            if: { $ifNull: ['$warehouseDetailsId', 0] },
                            then: '$warehouseDetailsId',
                            else: '$warehousev2Details.warehouseOwner_code'
                        }
                    },
                    warehouseName: '$warehouseDetails.basicDetails.warehouseName',
                    warehouseLocation:'$warehouseDetails.addressDetails',
                    quantityRequired: 1,
                    amount: "$payment.amount",
                    paymentStatus: "$payment.status",
                    actualPickUp: "$actualPickupDate",
                    pickupStatus: "$pickupStatus",
                    orderId: order_id
                }
            },

            { $sort: { [sortBy || 'createdAt']: -1, _id: 1 } },
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