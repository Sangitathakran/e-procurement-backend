const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { sendResponse, serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { wareHousev2 } = require("@src/v1/models/app/warehouse/warehousev2Schema");
const { WarehouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { BatchOrderProcess } = require("@src/v1/models/app/distiller/batchOrderProcess");

module.exports.warehouseList = async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy, search = '', order_id, isExport = 0 } = req.query;
        const skip = (page - 1) * limit;

        const searchFields = ['warehouseName', 'warehouseId', 'ownerName', 'authorized_personName', 'pointOfContact.name'];

        // Create search query
        const makeSearchQuery = (searchFields) => {
            return {
                $or: searchFields.map(field => ({
                    [field]: { $regex: search, $options: 'i' }
                }))
            };
        };

        const matchQuery = search ? makeSearchQuery(searchFields) : {};

        const aggregationPipeline = [
            { $match: matchQuery },
            {
                $lookup: {
                    from: "WarehouseDetails", // Adjust this to your actual collection name for branches
                    localField: "warehouseOwnerId",
                    foreignField: "_id",
                    as: "warehousedetails"
                }
            },
            { $unwind: { path: "$warehousedetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    'ownerDetails.name': 1,
                    'ownerDetails.mobile': 1,
                    'ownerDetails.email': 1,
                    warehouseName:'$warehousedetails.basicDetails.warehouseName',
                    pickupLocation: '$warehousedetails.addressDetails',
                    poc:'$warehousedetails.authorizedPerson.name'
                }
            },
            { $sort: { [sortBy]: 1 } },
            { $skip: skip },
            { $limit: parseInt(limit) }
        ];

        // Get records
        const records = { count: 0, rows: [] };
        records.rows = await wareHousev2.aggregate(aggregationPipeline);

        records.orderDetails = await PurchaseOrderModel.findOne({ _id: order_id }).select({_id:1, 'product.name':1});

        // Get count
        const countAggregation = [
            { $match: matchQuery },
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
                    "Warehouse ID": item?.warehouseId || 'NA',
                    "WareHouse Name": item?.warehouseName || 'NA',
                    "Owner Name": item?.ownerName || 'NA',
                    "Authorized Person": item?.authorized_personName ?? 'NA',
                    "POC Name": item?.pointOfContact?.name ?? 'NA',
                    "POC Email": item?.pointOfContact?.email ?? 'NA',
                    "POC Phone": item?.pointOfContact?.phone ?? 'NA',
                    "WarehouseCapacity": item?.warehouseCapacity ?? 'NA',
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
