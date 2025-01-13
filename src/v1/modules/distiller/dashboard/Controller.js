const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType, _userStatus, _status, _procuredStatus, _collectionName, _associateOfferStatus } = require("@src/v1/utils/constants");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { wareHousev2 } = require("@src/v1/models/app/warehouse/warehousev2Schema");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");

module.exports.getDashboardStats = async (req, res) => {

    try {
        const { user_id } = req;
        const currentDate = new Date();
       
        const wareHouseCount = (await wareHousev2.countDocuments()) ?? 0;
        const purchaseOrderCount = (await PurchaseOrderModel.countDocuments({ distiller_id: user_id })) ?? 0;
        
        const result = await wareHouseDetails.aggregate([
            {
                $project: {
                    stockToSum: {
                        $cond: {
                            if: { $gt: ["$inventory.requiredStock", 0] }, // If requiredStock > 0
                            then: "$inventory.requiredStock",
                            else: "$inventory.stock" // Otherwise, take stock
                        }
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalStock: { $sum: "$stockToSum" }
                }
            }
        ]);

        const realTimeStock = result.length > 0 ? result[0].totalStock : 0;

        const records = {
            wareHouseCount,
            purchaseOrderCount,
            realTimeStock
        };

        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Dashboard Stats") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.getOrder = asyncErrorHandler(async (req, res) => {

    const { page, limit=5, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
    const { user_id } = req;
    let query = {
        'paymentInfo.advancePaymentStatus': _poAdvancePaymentStatus.paid,
        distiller_id: user_id,
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

module.exports.warehouseList = asyncErrorHandler(async (req, res) => {
    try {
        const { page = 1, limit = 5, sortBy, search = '', filters = {}, order_id, isExport = 0 } = req.query;
        const skip = (parseInt(page, 5) - 1) * parseInt(limit, 5);

        if (!order_id) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order_id") }] }));
        }

        const branch = await PurchaseOrderModel.findOne({ _id: order_id }).select({ _id: 0, branch_id: 1, product: 1 }).lean();

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
                    warehouseOwnerId: '$warehouseDetails.warehouseOwnerId',
                    warehouseDetailsId: '$warehouseDetails._id',
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