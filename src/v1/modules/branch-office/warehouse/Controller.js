const { _handleCatchErrors, dumpJSONToExcel, makeSearchQuery } = require("@src/v1/utils/helpers");
const { sendResponse, serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");


const { wareHouse } = require('@src/v1/models/app/warehouse/warehouseSchema');
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { default: mongoose } = require("mongoose");
const { BatchOrderProcess } = require("@src/v1/models/app/distiller/batchOrderProcess");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { TrackOrder } = require("@src/v1/models/app/warehouse/TrackOrder");
const { Truck } = require("@src/v1/models/app/warehouse/Truck");
const { _trackOrderStatus } = require("@src/v1/utils/constants");
const { convertToObjecId } = require("@src/v1/utils/helpers/api.helper");

module.exports.warehousedata = async (req, res) => {
    try {
        const { warehouseId, warehouseName, ownerName, authorized_personName, weight_bridge, pointOfContact, warehouseCapacity } = req.body;

        const warehousedetails = await wareHouse.create({ warehouseId, warehouseName, ownerName, authorized_personName, weight_bridge, pointOfContact, warehouseCapacity });

        return sendResponse({
            res,
            status: 200,
            data: warehousedetails,
            message: _response_message.created("warehouse")
        });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.warehouseList = async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = 'warehouseName', search = '', isExport = 0, ownerName = '', state = '',city = '' } = req.query;
        const skip = (page - 1) * limit;
        const searchFields = ['warehouseName', 'warehouseId', 'ownerName', 'authorized_personName', 'pointOfContact.name']

        const makeSearchQuery = (searchFields) => {
            let query = {}
            query['$or'] = searchFields.map(item => ({ [item]: { $regex: search, $options: 'i' } }))
            return query
        }
        const query = search ? makeSearchQuery(searchFields) : {}
        if (ownerName) {
            query.ownerName = { $regex: ownerName, $options: 'i' };
        }
        if (state) {
            query['address.state'] = { $regex: state, $options: 'i' };
        }
        if (city) {
            query['address.city'] = { $regex: city, $options: 'i' };
        }
        const records = { count: 0, rows: [] };

        //warehouse list
        records.rows.push(...await wareHouse.find(query)
            .select('warehouseId warehouseName ownerName authorized_personName pointOfContact warehouseCapacity')
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .sort(sortBy)
        )


        records.count = await wareHouse.countDocuments(query);
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;

        if (isExport == 1) {

            const record = records.rows.map((item) => {

                return {
                    "Warehouse ID": item?.warehouseId || 'NA',
                    "WareHouse Name": item?.warehouseName || 'NA',
                    "Owner Name": item?.ownerName || 'NA',
                    "Authorized Person": item?.authorized_personName ?? 'NA',
                    "POC Name": item?.pointOfContact.name ?? 'NA',
                    "POC Email": item?.pointOfContact.email ?? 'NA',
                    "POC Phone": item?.pointOfContact.phone ?? 'NA',
                    "WarehouseCapacity": item?.warehouseCapacity ?? 'NA',
                }


            })
            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `warehouse-List.xlsx`,
                    worksheetName: `warehouse-List`
                });
            }
            else {
                return sendResponse({
                    res,
                    status: 200,
                    data: records,
                    message: _response_message.found("warehouse")
                });
            }
        }
        else {
            return sendResponse({
                res,
                status: 200,
                data: records,
                message: _response_message.found("warehouse")
            });
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};



module.exports.getWarehouseList = asyncErrorHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        search = '',
        sortBy,
        ownerName = '',
        state = '',
        city = '',
        commodity,
        isExport = 0
    } = req.query;

    try {
        const searchFields = ['wareHouse_code', 'basicDetails.warehouseName', 'warehouseOwner.ownerDetails.name'];

        const makeSearchQuery = (searchFields) => ({
            $or: searchFields.map(item => ({
                [item]: { $regex: search, $options: 'i' }
            }))
        });
        let baseQuery = { active: true };
        if (state) baseQuery["addressDetails.state.state_id"] = convertToObjecId(state);
        if (city) baseQuery["addressDetails.district.district_id"] = { $regex: city, $options: "i" };

        const pipeline = [
            { $match: baseQuery },
            {
                $lookup: {
                    from: "warehousev2",
                    localField: "warehouseOwnerId",
                    foreignField: "_id",
                    as: "warehouseOwner"
                }
            },
            {
                $lookup: {
                    from: "batches",
                    localField: "_id",
                    foreignField: "warehousedetails_id",
                    as: "batches",
                    pipeline: [
                        {
                            $lookup: {
                                from: "requests",
                                localField: "req_id",
                                foreignField: "_id",
                                as: "requests"
                            }
                        },
                        {$unwind:{path:"$requests", preserveNullAndEmptyArrays:true}},
                        {
                            $lookup: {
                                from: "users",
                                localField: "seller_id",
                                foreignField: "_id",
                                as: "users"
                            }
                        },
                        {$unwind:{path:"$users", preserveNullAndEmptyArrays:true}},
                    ]
                }
            },
             {
                $addFields: {
                commodity: {
                    $arrayElemAt: [
                    {
                        $map: {
                        input: "$batches",
                        as: "batch",
                        in: "$$batch.requests.product.name"
                        }
                    },
                    0
                    ]
                },
                commodity_id: {
                    $arrayElemAt: [
                    {
                        $map: {
                        input: "$batches",
                        as: "batch",
                        in: "$$batch.requests.product.commodity_id"
                        }
                    },
                    0
                    ]
                },
                availableQty: {
                    $round: [{ $sum: "$batches.available_qty" }, 3]
                },
                qty: {
                    $round: [{ $sum: "$batches.qty" }, 3]
                }
                }
             },
            { $unwind: { path: "$warehouseOwner", preserveNullAndEmptyArrays: true } },
           
            {
                $match: {
                ...(search ? makeSearchQuery(searchFields) : {}),
                ...(ownerName ? { "warehouseOwner.ownerDetails.name": { $regex: ownerName, $options: "i" } } : {}),
                ...(commodity ? { commodity_id: new mongoose.Types.ObjectId(commodity) } : {})
                }
            },
            {
                $project: {
                    wareHouse_code: 1,
                    basicDetails: 1,
                    addressDetails: 1,
                    active: 1,
                    "warehouseOwner.ownerDetails.name": 1,
                    "batches.dispatched.qc_report.received_qc_status":1,
                    'batches.requests.product':1,
                    'batches.users.basic_details.associate_details.associate_name':1,
                    availableQty: {
                        $round: [{ $sum: '$batches.available_qty' }, 3]
                    },
                    commodity: 1,
                    commodity_id: 1,
                    createdAt: 1
                }
            },
        ];
       const countResult = await wareHouseDetails.aggregate([
            ...pipeline,
            { $count: "count" }
       ]);
       const count = countResult?.[0]?.count ?? 0;
       const grandTotals = await wareHouseDetails.aggregate([
            ...pipeline,
        {
            $group: {
            _id: null,
            totalAvailableQty: { $sum: "$availableQty" },
            totalCapacity: {$sum: "$basicDetails.warehouseCapacity"}
            },
           
        }
        ]);
            const totalPages = limit != 0 ? Math.ceil(count / limit) : 0;
                let currentPage = Number(page);
                if (currentPage > totalPages) currentPage = totalPages || 1;

            const dataPipeline = [
                ...pipeline,
                { $sort: sortBy || { createdAt: -1 } },
                { $skip: (currentPage - 1) * parseInt(limit) },
                { $limit: parseInt(limit) }
                ];
        if (isExport == 1) {
            const data = await wareHouseDetails.aggregate([...pipeline.slice(0, -2)]);
    
            const record = data?.map((item) => {
                const { addressDetails } = item
                const address = `${addressDetails?.addressLine1 || ""} ${addressDetails?.city || ""} ${addressDetails?.district?.district_name || ""} ${addressDetails?.pincode || ""} ${addressDetails?.state?.state_name || ""}`
                return {
                    "Warehouse ID": item?.wareHouse_code || "NA",
                    "WHR Name": item?.basicDetails?.warehouseName || "NA",
                    "Owner": item?.warehouseOwner?.ownerDetails?.name || "NA",
                    "Capacity": item?.basicDetails?.warehouseCapacity || "NA",
                    "Address": address || "NA",
                    "Status": item?.active ? "Active" : "InActive" ,
                }
            })
            if (record.length > 0) {
              return dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Warehouse-list.xlsx`,
                    worksheetName: `Warehouse-record`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("warehouse") }))

            }

        }
        const rows = await wareHouseDetails.aggregate(dataPipeline);

        const records = {
            count,
            totalAvailableQty: (grandTotals[0]?.totalAvailableQty ?? 0).toFixed(3),
            totalCapacity: (grandTotals[0]?.totalCapacity ?? 0).toFixed(3),
            rows,
            page: currentPage,
            limit: Number(limit),
            pages: totalPages
        };

        return sendResponse({
            res,
            status: 200,
            data: records,
            message: _response_message.found("warehouse")
        });
    } catch (error) {
        _handleCatchErrors(error, res);
    }
});


module.exports.getWarehouseInword = asyncErrorHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        search = '',
        sortBy,
        id,
        isExport=0,
        commodity,
        associateName,
        qcStatus
    } = req.query;

    try {
        if (!id) {
            return sendResponse({
                res,
                status: 400,
                message: _response_message.notFound("warehouse Id")
            })
        }
        const query = {
            warehousedetails_id: new mongoose.Types.ObjectId(id),
            wareHouse_approve_status: 'Received'
        }
        const searchField=['user.basic_details.associate_details.associate_name', 'batchId', 'warehouse.wareHouse_code']
        const pipeline = [
            { $match: query },
            {
                $lookup: {
                    from: "warehousedetails",
                    localField: "warehousedetails_id",
                    foreignField: "_id",
                    as: "warehouse"
                },
            },
            { $unwind: { path: "$warehouse", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "requests",
                    localField: "req_id",
                    foreignField: "_id",
                    as: "request"
                },
            },

            { $unwind: { path: "$request", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "users",
                    localField: "seller_id",
                    foreignField: "_id",
                    as: "user"
                },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            { $match: search ? makeSearchQuery(searchField, search) : {} },
            {
                $lookup: {
                    from: "procurementcenters",
                    localField: "procurementCenter_id",
                    foreignField: "_id",
                    as: "procurementcenter"
                },
            },
            { $unwind: { path: "$procurementcenter", preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    ...(commodity ? { "request.product.commodity_id": new mongoose.Types.ObjectId(commodity) } : {}),
                    ...(associateName ? { "user._id": convertToObjecId(associateName) } : {}),
                    ...(qcStatus ? { "final_quality_check.status": { $regex: qcStatus, $options: "i" } } : {})
                }
            },
            {
                $project: {
                    batchId: 1,
                    receiving_details: 1,
                    final_quality_check: 1,
                    "warehouse.wareHouse_code": 1,
                    "request.product": 1,
                    "user.basic_details.associate_details.associate_name": 1,
                    "procurementcenter.center_name": 1,
                    available_qty: 1,
                    qty: 1
                }
            },
            { $sort: sortBy },
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) },
        ]

        const sumPipeline = [
        
        ...pipeline.slice(0, -3),
        {
            $group: {
            _id: null,
            totalAvailableQty: { $sum: "$available_qty" },
            totalQty: { $sum: "$qty" }
            }
        }
        ];


        if (isExport == 1) {
            const data = await Batch.aggregate([...pipeline.slice(0, -2)]);
    
            const record = data?.map((item) => {
                return {
                    "Batch ID": item?.batchId,
                    "Warehouse Id": item?.warehouse?.wareHouse_code,
                    "WHR Receipt": item?.final_quality_check?.whr_receipt,
                    "Commodity": item?.request?.product?.name,
                    "Associate Name": item?.user?.basic_details?.associate_details?.associate_name,
                    "Procurement Center": item?.procurementcenter?.center_name,
                    "Quantity": `${item?.request?.product?.quantity} MT`,
                    "Received on": item?.receiving_details?.received_on,
                    "QC Details": item?.final_quality_check?.qc_images?"Approve":"Pending",
                    "QC Status": item?.final_quality_check?.status
                  }
            })
            if (record.length > 0) {
              return dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Inword-list.xlsx`,
                    worksheetName: `Warehouse-record`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("warehouse") }))

            }

        }
        const records = { count: 0, totalQty:0, totalAvailableQty: 0, rows: [] };
        records.rows = await Batch.aggregate(pipeline)
        const grandTotals = await Batch.aggregate(sumPipeline);
        records.totalAvailableQty = (grandTotals[0]?.totalAvailableQty ?? 0).toFixed(3);
        records.totalQty = (grandTotals[0]?.totalQty ?? 0).toFixed(3);

        const countResult = await Batch.aggregate([...pipeline.slice(0, -3), { $count: "count" }]);

        records.count = countResult?.[0]?.count ?? 0;
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;

        return sendResponse({
            res,
            status: 200,
            data: records,
            message: _response_message.found("Inword")
        });
    } catch (error) {
        _handleCatchErrors(error, res);
    }
})

module.exports.getInwordReceivingDetails = asyncErrorHandler(async (req, res) => {
    const { id } = req.query;
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendResponse({
                res,
                status: 400,
                message: _response_message.invalid("Invalid item ID")
            })
        }
        const batch = await Batch.findById(id)
            .populate([
                { path: "procurementCenter_id", select: "center_name" },
                { path: "seller_id", select: "basic_details.associate_details.associate_name basic_details.associate_details.organization_name" },
                { path: "farmerOrderIds.farmerOrder_id", select: "metaData.name order_no" },
                { path: "warehousedetails_id", select: "basicDetails.warehouseName basicDetails.addressDetails wareHouse_code" },
                { path: "req_id", select: "product.name deliveryDate" },
            ])
        if (!batch) {
            return sendResponse({
                res,
                status: 404,
                message: _response_message.notFound("Batch")
            })
        }

        return sendResponse({
            res,
            status: 200,
            data: batch,
            message: _response_message.found("Batch")
        })
    } catch (error) {
        return _handleCatchErrors(error, res);
    }

})
module.exports.getLotlist = async (req, res) => {
    try {
        const { batch_id } = req.query;
        const record = {}
        record.rows = await Batch.findOne({ _id: batch_id }).select({ _id: 1, farmerOrderIds: 1, batchId: 1 }).populate({ path: "farmerOrderIds.farmerOrder_id", select: "metaData.name qtyProcured order_no" });

        if (!record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }))
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Farmer") }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
module.exports.getWarehouseOutword = asyncErrorHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        search = '',
        sortBy,
        id,
        isExport=0
    } = req.query;

    try {
        if (!id) {
            return sendResponse({
                res,
                status: 400,
                message: _response_message.notFound("warehouse Id")
            })
        }
        const order_id = await BatchOrderProcess.find({ warehouseId: new mongoose.Types.ObjectId(id) }).select('orderId')
        const searchFields = ['purchasedOrder.poNo', 'distiller.basic_details.distiller_details.organization_name'];


        const query = {
            _id: { $in: order_id.map((e) => e?.orderId) }
        }
        const pipeline = [
            { $match: query },
            {
                $lookup: {
                    from: "distillers",
                    localField: "distiller_id",
                    foreignField: "_id",
                    as: "distiller"
                }
            },
            { $unwind: { path: "$distiller", preserveNullAndEmptyArrays: true } },
            { $match: search ? makeSearchQuery(searchFields, search) : {} },
            {
                $project: {
                    product: 1,
                    purchasedOrder: 1,
                    poStatus: 1,
                    "distiller.basic_details.distiller_details.organization_name": 1,
                    createdAt: 1
                }
            },

            { $sort: sortBy },
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) },
        ]
        if (isExport == 1) {
            const data = await PurchaseOrderModel.aggregate([...pipeline.slice(0, -2)]);
    
            const record = data?.map((item) => {
                return {
                    "Order ID": item?.purchasedOrder?.poNo,
                    "Commodity": item?.product?.name,
                    "Grade": item?.product?.grade,
                    "Quantity": `${item?.purchasedOrder?.poQuantity} MT`,
                    "Distiller": item?.distiller?.basic_details?.distiller_details?.organization_name,
                    "Created on": item?.createdAt,
                    "Delivery Mode": "Self Pickup",
                    "Status": item?.poStatus
                }    
            })
            if (record.length > 0) {
              return dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Outword-list.xlsx`,
                    worksheetName: `Warehouse-record`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("outword") }))

            }

        }
        const records = { count: 0, rows: [] };
        records.rows = await PurchaseOrderModel.aggregate(pipeline)
        const countResult = await PurchaseOrderModel.aggregate([...pipeline.slice(0, -3), { $count: "count" }]);
        records.count = countResult?.[0]?.count ?? 0;
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;

        return sendResponse({
            res,
            status: 200,
            data: records,
            message: _response_message.found("Outword")
        });
    } catch (error) {
        _handleCatchErrors(error, res);
    }
})

module.exports.getPurchaseOrder = asyncErrorHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        search = '',
        sortBy,
        id,
        isExport=0
    } = req.query;

    try {
        if (!id) {
            return sendResponse({
                res,
                status: 400,
                message: _response_message.notFound("Order Id")
            })
        }
        const query = {
            orderId: new mongoose.Types.ObjectId(id)
        }
        const searchFields = ["purchaseId", "warehousedetails.wareHouse_code"];
        const pipeline = [
            { $match: query },
            {
                $lookup: {
                    from: "warehousedetails",
                    localField: "warehouseId",
                    foreignField: "_id",
                    as: "warehousedetails"
                }
            },
            { $unwind: { path: "$warehousedetails", preserveNullAndEmptyArrays: true } },
            { $match: search ? makeSearchQuery(searchFields, search) : {} },
            {
                $project: {
                    purchaseId: 1,
                    quantityRequired: 1,
                    scheduledPickupDate: 1,
                    actualPickupDate: 1,
                    pickupStatus: 1,
                    status: 1,
                    "warehousedetails.wareHouse_code": 1,
                    "warehousedetails.basicDetails.warehouseName": 1,
                    "warehousedetails.addressDetails": 1,
                    createdAt: 1
                }
            },

            { $sort: sortBy },
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) },
        ]
        if (isExport == 1) {
            const data = await BatchOrderProcess.aggregate([...pipeline.slice(0, -2)]);
    
            const record = data?.map((item) => {
                return {
                    "Purchase ID": item?.purchaseId,
                    "Quantity": item?.quantityRequired ? `${item.quantityRequired} MT` : "",
                    "Warehouse ID": item?.warehousedetails?.wareHouse_code,
                    "Created on": item?.createdAt,
                    "Scheduled Pickup": item?.scheduledPickupDate,
                    "Actual Pickup": item?.actualPickupDate,
                    "Status": item?.status
                  }    
            })
            if (record.length > 0) {
              return dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Purchase-list.xlsx`,
                    worksheetName: `Warehouse-record`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("Purchase") }))

            }

        }
        const records = { count: 0, rows: [] };
        records.rows = await BatchOrderProcess.aggregate(pipeline)
        const countResult = await BatchOrderProcess.aggregate([...pipeline.slice(0, -3), { $count: "count" }]);
        records.count = countResult?.[0]?.count ?? 0;
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;

        return sendResponse({
            res,
            status: 200,
            data: records,
            message: _response_message.found("Outword")
        });
    } catch (error) {
        _handleCatchErrors(error, res);
    }
})

module.exports.getPurchaseOrderDetails = asyncErrorHandler(async (req, res) => {
    const { id } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
    }

    const record = await BatchOrderProcess.findOne({ _id: id }).select('purchaseId status')
        .populate({ path: 'distiller_id', select: 'basic_details company_details.cin_number' })
        .populate({ path: 'orderId', select: 'product purchasedOrder deliveryLocation' })
        .populate({ path: 'warehouseId', select: 'basicDetails wareHouse_code addressDetails' });

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("purchase order") }] }))
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("purchase order") }))
});

module.exports.getTrackOrderStatus = asyncErrorHandler(async (req, res) => {
    const { id } = req.query;

    const record = { data: { status: "" } };

    record.data = await TrackOrder.findOne({ purchaseOrder_id: id });

    if (!record.data) {
        return res.status(200).send(new serviceResponse({ status: 200, data: record.data = { status: _trackOrderStatus.pending }, message: _response_message.found("track") }))
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: record.data, message: _response_message.found("status") }));

})

module.exports.getTrucks = asyncErrorHandler(async (req, res) => {
    const { id } = req.query;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
    }
    const record = await Truck.find({ trackOrder_id: id });
    if (!record) {
        return res.status(200).send(new serviceResponse({ status: 404, errors: [{ message: _response_message.notFound("truck") }] }))
    }

    const result = [];

    for (let data of record) {

        let totalQty = 0;
        let totalBags = 0;

        for (let batch of data.final_pickup_batch) {
            const perUnitBag = Math.floor(batch.allotedQty.count / batch.noOfBagsAlloted);
            const qtyOfEachBatch = perUnitBag * batch.no_of_bags;
            totalQty += qtyOfEachBatch;
            totalBags += batch.no_of_bags;
        }

        result.push({ truckId: data.truckNo, allotedQty: totalQty, no_of_bags: totalBags, truck_capacity: data.truck_capacity, _id: data._id })

    }

    return res.status(200).send(new serviceResponse({ status: 200, data: result, message: _response_message.found("truck") }))


})

module.exports.getBatchesByTrucks = asyncErrorHandler(async (req, res) => {
    const { id } = req.query;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
    }
    const record = await Truck.findOne({ _id: id });
    if (!record) {
        return res.status(200).send(new serviceResponse({ status: 404, errors: [{ message: _response_message.notFound("truck") }] }))
    }

    const result = {
        batches: [],
        logistics_details: record.logistics_details,
        driver_details: record.driver_details,
        vehicle_details: record.vehicle_details,
        warehouse: record.warehouse,
        truckNo: record.truckNo,
        truck_capacity: record.truck_capacity,

    };

    for (let batch of record.final_pickup_batch) {

        const batchData = {
            associate_batch_id: batch.associate_batch_id,
            batchId: batch.batchId,
            allotedQty: batch.allotedQty,
            receving_date: batch.receving_date,
            noOfBagsAlloted: batch.noOfBagsAlloted,
            no_of_bags: batch.no_of_bags,
        }
        result.batches.push(batchData);
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: result, message: _response_message.found("truck") }))
})
module.exports.getBatches = asyncErrorHandler(async (req, res) => {

    const { id } = req.query;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
    }
    const record = await TrackOrder.findOne({ _id: new mongoose.Types.ObjectId(id) });
    const orderDetails = await BatchOrderProcess.findOne({ _id: record?.purchaseOrder_id }).select("quantityRequired").populate([
        {
            path: "orderId",
            select: { "product.name": 1, "purchasedOrder.poNo": 1 }
        }
    ])

    const batches = record.ready_to_ship.pickup_batch;

    const data = [];

    for (let batch of batches) {

        const batchData = {
            associate_batch_id: batch.associate_batch_id,
            batchId: batch.batchId,
            allotedQty: {
                count: batch.qtyAllotment,
                unit: batch.availableQty.unit,
            },
            receving_date: batch.receving_date,
            noOfBagsAlloted: batch.no_of_bags,
            remaining_bag: batch.remaining_bag,
        }

        data.push(batchData);
    }
    const result = {
        orderDetails: { orderId: orderDetails?.orderId, quantityRequired: orderDetails.quantityRequired, noOfBags: data?.reduce((acc, cur) => acc + cur.noOfBagsAlloted, 0) },
        data
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: result, message: _response_message.found("batches") }));
})