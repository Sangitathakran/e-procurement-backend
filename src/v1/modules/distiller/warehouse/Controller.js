const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { sendResponse, serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { wareHousev2 } = require("@src/v1/models/app/warehouse/warehousev2Schema");
const { WarehouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { BatchOrderProcess } = require("@src/v1/models/app/distiller/batchOrderProcess");

module.exports.warehouseList = async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy, search = '', filters = {}, order_id, isExport = 0 } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);


        if (!order_id) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order_id") }] }));
        }

        const branch = await PurchaseOrderModel.findOne({ _id: order_id }).select({ _id:0, branch_id: 1 }).lean();
        
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
                    warehouseName: '$warehouseDetails.basicDetails.warehouseName',
                    pickupLocation: '$warehouseDetails.addressDetails',
                    stock: '$warehouseDetails.inventory.stock',
                    warehouseTiming: '$warehouseDetails.inventory.warehouse_timing',
                    nodalOfficerName: '$ownerDetails.name',
                    nodalOfficerContact: '$ownerDetails.mobile',
                    nodalOfficerEmail: '$ownerDetails.email',
                    pocAtPickup: '$warehouseDetails.authorizedPerson.name',
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
};
