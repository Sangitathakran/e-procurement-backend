const mongoose = require('mongoose');
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { _query, _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { _batchStatus, received_qc_status, _paymentstatus, _paymentmethod, _userType } = require("@src/v1/utils/constants");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { ExternalBatch } = require("@src/v1/models/app/procurement/ExternalBatch");
const { sendMail } = require("@src/v1/utils/helpers/node_mailer");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { decryptJwtToken } = require('@src/v1/utils/helpers/jwt');


// module.exports.getReceivedBatchesByWarehouse = asyncErrorHandler(async (req, res) => {
//     const { page = 1, limit = 10, sortBy = "createdAt", search = '', isExport = 0 } = req.query;
//     const { warehouseIds = [] } = req.body; // Updated to use warehouseIds

//     try {
//         const getToken = req.headers.token || req.cookies.token;
//         if (!getToken) {
//             return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
//         }

//         const decode = await decryptJwtToken(getToken);
//         const UserId = decode.data.organization_id;

//         if (!mongoose.Types.ObjectId.isValid(UserId)) {
//             return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
//         }
        
//         const warehouseDetails = await wareHouseDetails.find({ warehouseOwnerId: new mongoose.Types.ObjectId(UserId) });
//         const ownerwarehouseIds = warehouseDetails.map(warehouse => warehouse._id.toString());
        
//         const finalwarehouseIds = Array.isArray(warehouseIds) && warehouseIds.length
//             ? warehouseIds.filter(id => ownerwarehouseIds.includes(id))
//             : ownerwarehouseIds;

//         if (!finalwarehouseIds.length) {
//             return res.status(200).send(new serviceResponse({
//                 status: 200,
//                 data: { records: [], page, limit, pages: 0 },
//                 message: "No warehouses found for the user."
//             }));
//         }

//         const query = {
//             "warehousedetails_id": { $in: finalwarehouseIds },
//             wareHouse_approve_status: 'Received', 
//             ...(search && {
//                 $or: [
//                     { batchId: { $regex: search, $options: 'i' } },
//                     { "seller_id.basic_details.associate_details.associate_name": { $regex: search, $options: 'i' } },
//                     { "procurementCenter_id.center_name": { $regex: search, $options: 'i' } },
//                 ]
//             }),
//         };

//         const rows = await Batch.find(query)
//             .populate([
//                 { path: "seller_id", select: "basic_details.associate_details.associate_name basic_details.associate_details.organization_name" },
//                 { path: "procurementCenter_id", select: "center_name" },
//                 { path: "warehousedetails_id", select: "basicDetails.warehouseName basicDetails.addressDetails wareHouse_code" },
//                 { path: "req_id", select: "product.name deliveryDate" },
//             ])
//             .select("batchId warehousedetails_id commodity qty wareHouse_approve_status final_quality_check receiving_details createdAt")
//             .sort(sortBy)
//             .skip((page - 1) * limit)
//             .limit(parseInt(limit));

//         const count = await Batch.countDocuments(query);
//         const stats = {
//             totalBatches: count,
//             approvedBatches: await Batch.countDocuments({ ...query, status: 'Approved' }),
//             rejectedBatches: await Batch.countDocuments({ ...query, status: 'Rejected' }),
//             pendingBatches: await Batch.countDocuments({ ...query, status: 'Pending' }),
//             pendingReceivingBatches: await Batch.countDocuments({ ...query, "dispatched.received": { $exists: false } })
//         };

//         if (isExport == 1) {
//             const exportData = rows.map(item => ({
//                 "Batch ID": item.batchId || 'NA',
//                 "Associate Name": item.seller_id?.basic_details?.associate_details?.associate_name || 'NA',
//                 "Procurement Center": item.procurementCenter_id?.center_name || 'NA',
//                 "Warehouse": item.warehousedetails_id?.basicDetails?.warehouseName || 'NA',
//                 "Quantity": item.qty || 'NA',
//                 "Status": item.wareHouse_approve_status || 'NA'
//             }));

//             if (exportData.length) {
//                 return dumpJSONToExcel(req, res, {
//                     data: exportData,
//                     fileName: `Warehouse-Batches.xlsx`,
//                     worksheetName: `Batches`
//                 });
//             }
//             return res.status(200).send(new serviceResponse({ status: 200, message: "No data available for export" }));
//         }

//         return res.status(200).send(new serviceResponse({
//             status: 200,
//             data: { records: { rows, count, page, limit, pages: Math.ceil(count / limit), ...stats } },
//             message: "Batches fetched successfully"
//         }));
//     } catch (error) {
//         console.error(error);
//         return res.status(500).send(new serviceResponse({ status: 500, message: "Error fetching batches", error: error.message }));
//     }
// });

//using aggregate for filter and search
module.exports.getReceivedBatchesByWarehouse = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 10, sortBy = "createdAt", search = '', isExport = 0, status, productName, warehouse_name } = req.query;
    const { warehouseIds = [] } = req.body;

    try { 
        const getToken = req.headers.token || req.cookies.token;
        if (!getToken) {
            return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
        }

        const decode = await decryptJwtToken(getToken);
        const UserId = decode.data.organization_id;

        if (!mongoose.Types.ObjectId.isValid(UserId)) {
            return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
        }

        const warehouseDetails = await wareHouseDetails.find({ warehouseOwnerId: new mongoose.Types.ObjectId(UserId) });
        //const ownerwarehouseIds = warehouseDetails.map(warehouse => warehouse._id.toString());
        const ownerwarehouseIds = warehouseDetails.map(id => new mongoose.Types.ObjectId(id));
 
        const finalwarehouseIds = Array.isArray(warehouseIds) && warehouseIds.length
            ? warehouseIds.filter(id => ownerwarehouseIds.includes(id))
            : ownerwarehouseIds;

        if (!finalwarehouseIds.length) {
            return res.status(200).send(new serviceResponse({
                status: 200,
                data: { records: { rows: [], count: 0, page, limit, pages: 0 }, message: "No warehouses found for the user." }
            }));
        }

        const searchRegex = search ? new RegExp(search, 'i') : null;

        const pipeline = [
            {
                $lookup: {
                    from: 'warehousedetails',
                    localField: 'warehousedetails_id',
                    foreignField: '_id',
                    as: 'warehousedetails_id'
                }
            },
            {
                $lookup: {
                    from: 'procurementcenters',
                    localField: 'procurementCenter_id',
                    foreignField: '_id',
                    as: 'procurementCenter_id'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'seller_id',
                    foreignField: '_id',
                    as: 'seller_id'
                }
            },
            {
                $lookup: {
                    from: 'requests',
                    localField: 'req_id',
                    foreignField: '_id',
                    as: 'req_id'
                }
            },

            { $unwind: { path: "$req_id", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$warehousedetails_id", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$procurementCenter_id", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$seller_id", preserveNullAndEmptyArrays: true } },
            {
                $match: {
                   "warehousedetails_id._id": { $in: finalwarehouseIds },
                   ...(warehouse_name && { "warehousedetails_id.basicDetails.warehouseName": warehouse_name }),
                 
                    wareHouse_approve_status: 'Received',
                    ...(search && searchRegex && {
                        $or: [
                            { batchId: { $regex: searchRegex } },
                            { "seller_id.basic_details.associate_details.associate_name": { $regex: searchRegex } },
                            { "seller_id.basic_details.associate_details.organization_name": { $regex: searchRegex } },
                            { "procurementCenter_id.center_name": { $regex: searchRegex } },
                            { "warehousedetails_id.wareHouse_code": { $regex: searchRegex } },
                        ]
                    }),
                    ...(status && {
                        "final_quality_check.status": status  // This checks the status field for exact match
                    }),
                    ...(productName && { "req_id.product.name": productName})//{ $regex: new RegExp(productName, 'i') } })  // If productName is provided
                }
            },
            {
                $project: {
                    batchId: 1,
                    qty: 1,
                    received_on: 1,
                    qc_report: 1,
                    wareHouse_code: 1,
                    //status: 1,
                    commodity: 1,
                    "final_quality_check.status":1,
                    "final_quality_check.product_images":1,
                    "final_quality_check.qc_images":1,
                    "final_quality_check.rejected_reason":1,
                    "final_quality_check.whr_receipt":1,
                    "final_quality_check.whr_receipt_image":1,
                    
                    "req_id.product.name":1,
                    "req_id._id":1,
                    "req_id.deliveryDate":1,
                    "receiving_details.received_on": 1,
                    "receiving_details.vehicle_details": 1,
                    "receiving_details.document_pictures": 1,
                    "receiving_details.bag_weight_per_kg": 1,
                    "receiving_details.no_of_bags": 1,
                    "receiving_details.quantity_received": 1,
                    "receiving_details.truck_photo": 1,
                    "final_quality_check.whr_receipt": 1,
                    "warehousedetails_id.basicDetails.warehouseName": 1,
                    "warehousedetails_id.wareHouse_code": 1,
                    "warehousedetails_id._id": 1,
                    "procurementCenter_id.center_name": 1,
                    "procurementCenter_id._id": 1,
                    "seller_id.basic_details.associate_details.associate_name": 1,
                    "seller_id.basic_details.associate_details.organization_name": 1,
                    "seller_id._id": 1,
                    wareHouse_approve_status: 1,
                    createdAt: 1
                }
            },
            { $sort: { [sortBy]: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) }
        ];

       //console.log(JSON.stringify(pipeline, null, 2)) 
        const rows = await Batch.aggregate(pipeline);


        const totalCountPipeline = [
            {
                $lookup: {
                    from: 'warehousedetails',
                    localField: 'warehousedetails_id',
                    foreignField: '_id',
                    as: 'warehousedetails_id'
                }
            },
            {
                $lookup: {
                    from: 'procurementcenters',
                    localField: 'procurementCenter_id',
                    foreignField: '_id',
                    as: 'procurementCenter_id'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'seller_id',
                    foreignField: '_id',
                    as: 'seller_id'
                }
            },
            {
                $lookup: {
                    from: 'requests',
                    localField: 'req_id',
                    foreignField: '_id',
                    as: 'req_id'
                }
            },
            { $unwind: { path: "$req_id", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$warehousedetails_id", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$procurementCenter_id", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$seller_id", preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    "warehousedetails_id._id": { $in: finalwarehouseIds },
                    ...(warehouse_name && { "warehousedetails_id.basicDetails.warehouseName": warehouse_name }),
                    wareHouse_approve_status: 'Received',
                    ...(search && searchRegex && {
                        $or: [
                            { batchId: { $regex: searchRegex } },
                            { "seller_id.basic_details.associate_details.associate_name": { $regex: searchRegex } },
                            { "seller_id.basic_details.associate_details.organization_name": { $regex: searchRegex } },
                            { "procurementCenter_id.center_name": { $regex: searchRegex } },
                            { "warehousedetails_id.wareHouse_code": { $regex: searchRegex } },
                        ]
                    }),
                    ...(status && {
                        "final_quality_check.status": status  // This checks the status field for exact match
                    }),
                    ...(productName && { "req_id.product.name": productName })
                }
            },
            { $count: "totalCount" } // This will count all matching documents
        ];
        
        const totalCountResult = await Batch.aggregate(totalCountPipeline);
        const totalCount = totalCountResult.length > 0 ? totalCountResult[0].totalCount : 0;
        
       // const totalCount = rows.length;
       
        const query = {
            "warehousedetails_id._id": { $in: finalwarehouseIds },
            ...(warehouse_name && { "warehousedetails_id.basicDetails.warehouseName": warehouse_name }),
            wareHouse_approve_status: 'Received',
            ...(search && searchRegex && {
                $or: [
                    { batchId: { $regex: searchRegex } },
                    { "seller_id.basic_details.associate_details.associate_name": { $regex: searchRegex } },
                    { "seller_id.basic_details.associate_details.organization_name": { $regex: searchRegex } },
                    { "procurementCenter_id.center_name": { $regex: searchRegex } },
                    { "warehousedetails_id.wareHouse_code": { $regex: searchRegex } },
                ]
            }),
            ...(status && {
                "final_quality_check.status": status  // This checks the status field for exact match
            }),
            ...(productName && { "req_id.product.name": productName})//{ $regex: new RegExp(productName, 'i') } })  // If productName is provided
        };

            const stats = {
             totalBatches: totalCount,
             approvedBatches: await Batch.countDocuments({ ...query, status: 'Approved' }),
             rejectedBatches: await Batch.countDocuments({ ...query, status: 'Rejected' }),
             pendingBatches: await Batch.countDocuments({ ...query, status: 'Pending' }),
             pendingReceivingBatches: await Batch.countDocuments({ ...query, "dispatched.received": { $exists: false } })
         };


        // Export functionality
        if (isExport == 1) {
            const exportData = rows.map(item => ({
                "Batch ID": item.batchId || 'NA',
                "Associate Name": item.seller_id?.basic_details?.associate_details?.associate_name || 'NA',
                "Organization Name": item.seller_id?.basic_details?.associate_details?.organization_name || 'NA',
                "Procurement Center": item.procurementCenter_id?.center_name || 'NA',
                "Warehouse": item.warehousedetails_id?.basicDetails?.warehouseName || 'NA',
                "Quantity": item.qty || 'NA',
                "Status": item.wareHouse_approve_status || 'NA'
            }));

            if (exportData.length) {
                return dumpJSONToExcel(req, res, {
                    data: exportData,
                    fileName: `Warehouse-Batches.xlsx`,
                    worksheetName: `Batches`
                });
            }
            return res.status(200).send(new serviceResponse({ status: 200, message: "No data available for export" }));
        }

        return res.status(200).send(new serviceResponse({
            status: 200,
            data: {
                records: {
                    rows,
                    count: totalCount,
                    page,
                    limit,
                    pages: Math.ceil(totalCount / limit),
                    ...stats
                }
            },
            message: "Batches fetched successfully"
        }));

    } catch (error) {
        console.error(error);
        return res.status(500).send(new serviceResponse({ status: 500, message: "Error fetching batches", error: error.message }));
    }
});

// module.exports.getPendingBatchesByWarehouse = asyncErrorHandler(async (req, res) => {
//     const { page = 1, limit = 10, sortBy = "createdAt", search = '', isExport = 0 } = req.query;
//     const { warehouseIds = [] } = req.body; // Updated to use warehouseIds

//     try {
//         const getToken = req.headers.token || req.cookies.token;
//         if (!getToken) {
//             return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
//         }

//         const decode = await decryptJwtToken(getToken);
//         const UserId = decode.data.organization_id;

//         if (!mongoose.Types.ObjectId.isValid(UserId)) {
//             return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
//         }
        
//         const warehouseDetails = await wareHouseDetails.find({ warehouseOwnerId: new mongoose.Types.ObjectId(UserId) });
//         const ownerwarehouseIds = warehouseDetails.map(warehouse => warehouse._id.toString());
        
//         const finalwarehouseIds = Array.isArray(warehouseIds) && warehouseIds.length
//             ? warehouseIds.filter(id => ownerwarehouseIds.includes(id))
//             : ownerwarehouseIds;

//         if (!finalwarehouseIds.length) {
//             return res.status(200).send(new serviceResponse({
//                 status: 200,
//                 data: { records: [], page, limit, pages: 0 },
//                 message: "No warehouses found for the user."
//             }));
//         }
        
//         const query = {
//             "warehousedetails_id": { $in: finalwarehouseIds },
//             wareHouse_approve_status: 'Pending', 
//             ...(search && {
//                 $or: [
//                     { batchId: { $regex: search, $options: 'i' } },
//                     { "seller_id.basic_details.associate_details.associate_name": { $regex: search, $options: 'i' } },
//                     { "procurementCenter_id.center_name": { $regex: search, $options: 'i' } },
//                 ]
//             }),
//         };

//         const rows = await Batch.find(query)
//             .populate([
//                 { path: "seller_id", select: "basic_details.associate_details.associate_name basic_details.associate_details.organization_name" },
//                 { path: "procurementCenter_id", select: "center_name" },
//                 { path: "warehousedetails_id", select: "basicDetails.warehouseName basicDetails.addressDetails wareHouse_code" },
//                 { path: "req_id", select: "product.name deliveryDate" },
//             ])
//             .select("batchId warehousedetails_id commodity qty wareHouse_approve_status final_quality_check receiving_details createdAt")
//             .sort(sortBy)
//             .skip((page - 1) * limit)
//             .limit(parseInt(limit));

//         const count = await Batch.countDocuments(query);
//         const stats = {
//             totalBatches: count,
//             approvedBatches: await Batch.countDocuments({ ...query, status: 'Approved' }),
//             rejectedBatches: await Batch.countDocuments({ ...query, status: 'Rejected' }),
//             pendingBatches: await Batch.countDocuments({ ...query, status: 'Pending' }),
//             pendingReceivingBatches: await Batch.countDocuments({ ...query, "dispatched.received": { $exists: false } })
//         };

//         if (isExport == 1) {
//             const exportData = rows.map(item => ({
//                 "Batch ID": item.batchId || 'NA',
//                 "Associate Name": item.seller_id?.basic_details?.associate_details?.associate_name || 'NA',
//                 "Procurement Center": item.procurementCenter_id?.center_name || 'NA',
//                 "Warehouse": item.warehousedetails_id?.basicDetails?.warehouseName || 'NA',
//                 "Quantity": item.qty || 'NA',
//                 "Status": item.wareHouse_approve_status || 'NA'
//             }));

//             if (exportData.length) {
//                 return dumpJSONToExcel(req, res, {
//                     data: exportData,
//                     fileName: `Warehouse-Batches.xlsx`,
//                     worksheetName: `Batches`
//                 });
//             }
//             return res.status(200).send(new serviceResponse({ status: 200, message: "No data available for export" }));
//         }

//         return res.status(200).send(new serviceResponse({
//             status: 200,
//             data: { records: { rows, count, page, limit, pages: Math.ceil(count / limit), ...stats } },
//             message: "Batches fetched successfully"
//         }));
//     } catch (error) {
//         console.error(error);
//         return res.status(500).send(new serviceResponse({ status: 500, message: "Error fetching batches", error: error.message }));
//     }
// });


//using aggregate for search and filter getPendingBatchesByWarehouse
module.exports.getPendingBatchesByWarehouse = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 10, sortBy = "createdAt", search = '', isExport = 0, status, productName,warehouse_name } = req.query;
    const { warehouseIds = [] } = req.body;

    try {
        const getToken = req.headers.token || req.cookies.token;
        if (!getToken) {
            return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
        }

        const decode = await decryptJwtToken(getToken);
        const UserId = decode.data.organization_id;

        if (!mongoose.Types.ObjectId.isValid(UserId)) {
            return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
        }

        const warehouseDetails = await wareHouseDetails.find({ warehouseOwnerId: new mongoose.Types.ObjectId(UserId) });
        //const ownerwarehouseIds = warehouseDetails.map(warehouse => warehouse._id.toString());
        const ownerwarehouseIds = warehouseDetails.map(id => new mongoose.Types.ObjectId(id));

        const finalwarehouseIds = Array.isArray(warehouseIds) && warehouseIds.length
            ? warehouseIds.filter(id => ownerwarehouseIds.includes(id))
            : ownerwarehouseIds;
        
        if (!finalwarehouseIds.length) {
            return res.status(200).send(new serviceResponse({
                status: 200,
                data: { records: { rows: [], count: 0, page, limit, pages: 0 }, message: "No warehouses found for the user." }
            }));
        }

        const searchRegex = search ? new RegExp(search, 'i') : null;

        const pipeline = [
            {
                $lookup: {
                    from: 'warehousedetails',
                    localField: 'warehousedetails_id',
                    foreignField: '_id',
                    as: 'warehousedetails_id'
                }
            },
            {
                $lookup: {
                    from: 'procurementcenters',
                    localField: 'procurementCenter_id',
                    foreignField: '_id',
                    as: 'procurementCenter_id'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'seller_id',
                    foreignField: '_id',
                    as: 'seller_id'
                }
            },
            {
                $lookup: {
                    from: 'requests',
                    localField: 'req_id',
                    foreignField: '_id',
                    as: 'req_id'
                }
            },

            { $unwind: { path: "$req_id", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$warehousedetails_id", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$procurementCenter_id", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$seller_id", preserveNullAndEmptyArrays: true } },
            {
                $match: {
                   "warehousedetails_id._id": { $in: finalwarehouseIds },
                   ...(warehouse_name && { "warehousedetails_id.basicDetails.warehouseName": warehouse_name }),
                 
                    wareHouse_approve_status: 'Pending',
                    ...(search && searchRegex && {
                        $or: [
                            { batchId: { $regex: searchRegex } },
                            { "seller_id.basic_details.associate_details.associate_name": { $regex: searchRegex } },
                            { "seller_id.basic_details.associate_details.organization_name": { $regex: searchRegex } },
                            { "procurementCenter_id.center_name": { $regex: searchRegex } },
                            { "warehousedetails_id.wareHouse_code": { $regex: searchRegex } },
                        ]
                    }),
                    ...(status && {
                        "final_quality_check.status": status  // This checks the status field for exact match
                    }),
                    ...(productName && { "req_id.product.name": productName})//{ $regex: new RegExp(productName, 'i') } })  // If productName is provided
                }
            },
            {
                $project: {
                    batchId: 1,
                    qty: 1,
                    received_on: 1,
                    qc_report: 1,
                    wareHouse_code: 1,
                    //status: 1,
                    commodity: 1,
                    "final_quality_check.status":1,
                    "final_quality_check.product_images":1,
                    "final_quality_check.qc_images":1,
                    "final_quality_check.rejected_reason":1,
                    "final_quality_check.whr_receipt":1,
                    "final_quality_check.whr_receipt_image":1,
                    
                    "req_id.product.name":1,
                    "req_id._id":1,
                    "req_id.deliveryDate":1,
                    "receiving_details.received_on": 1,
                    "receiving_details.vehicle_details": 1,
                    "receiving_details.document_pictures": 1,
                    "receiving_details.bag_weight_per_kg": 1,
                    "receiving_details.no_of_bags": 1,
                    "receiving_details.quantity_received": 1,
                    "receiving_details.truck_photo": 1,
                    "final_quality_check.whr_receipt": 1,
                    "warehousedetails_id.basicDetails.warehouseName": 1,
                    "warehousedetails_id.wareHouse_code": 1,
                    "warehousedetails_id._id": 1,
                    "procurementCenter_id.center_name": 1,
                    "procurementCenter_id._id": 1,
                    "seller_id.basic_details.associate_details.associate_name": 1,
                    "seller_id.basic_details.associate_details.organization_name": 1,
                    "seller_id._id": 1,
                    wareHouse_approve_status: 1,
                    createdAt: 1
                }
            },
            { $sort: { [sortBy]: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) }
        ];
        
        const rows = await Batch.aggregate(pipeline);

        
        const totalCountPipeline = [
            {
                $lookup: {
                    from: 'warehousedetails',
                    localField: 'warehousedetails_id',
                    foreignField: '_id',
                    as: 'warehousedetails_id'
                }
            },
            {
                $lookup: {
                    from: 'procurementcenters',
                    localField: 'procurementCenter_id',
                    foreignField: '_id',
                    as: 'procurementCenter_id'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'seller_id',
                    foreignField: '_id',
                    as: 'seller_id'
                }
            },
            {
                $lookup: {
                    from: 'requests',
                    localField: 'req_id',
                    foreignField: '_id',
                    as: 'req_id'
                }
            },
            { $unwind: { path: "$req_id", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$warehousedetails_id", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$procurementCenter_id", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$seller_id", preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    "warehousedetails_id._id": { $in: finalwarehouseIds },
                    ...(warehouse_name && { "warehousedetails_id.basicDetails.warehouseName": warehouse_name }),
                    wareHouse_approve_status: 'Pending',
                    ...(search && searchRegex && {
                        $or: [
                            { batchId: { $regex: searchRegex } },
                            { "seller_id.basic_details.associate_details.associate_name": { $regex: searchRegex } },
                            { "seller_id.basic_details.associate_details.organization_name": { $regex: searchRegex } },
                            { "procurementCenter_id.center_name": { $regex: searchRegex } },
                            { "warehousedetails_id.wareHouse_code": { $regex: searchRegex } },
                        ]
                    }),
                    ...(status && {
                        "final_quality_check.status": status  // This checks the status field for exact match
                    }),
                    ...(productName && { "req_id.product.name": productName })
                }
            },
            { $count: "totalCount" } // This will count all matching documents
        ];
        
        const totalCountResult = await Batch.aggregate(totalCountPipeline);
        const totalCount = totalCountResult.length > 0 ? totalCountResult[0].totalCount : 0;

       // const totalCount = rows.length;

        // Modify the query object for consistent filters
const baseQuery = {
    "warehousedetails_id._id": { $in: finalwarehouseIds },
    ...(warehouse_name && { "warehousedetails_id.basicDetails.warehouseName": warehouse_name }),
    wareHouse_approve_status: 'Pending',
    ...(search && searchRegex && {
        $or: [
            { batchId: { $regex: searchRegex } },
            { "seller_id.basic_details.associate_details.associate_name": { $regex: searchRegex } },
            { "seller_id.basic_details.associate_details.organization_name": { $regex: searchRegex } },
            { "procurementCenter_id.center_name": { $regex: searchRegex } },
            { "warehousedetails_id.wareHouse_code": { $regex: searchRegex } },
        ]
    }),
    ...(productName && { "req_id.product.name": productName }),
};


        const statsPipeline = [
            { $match: baseQuery }, // Apply common filters
            {
                $facet: {
                    totalBatches: [{ $count: "count" }],
                    approvedBatches: [{ $match: { status: 'Approved' } }, { $count: "count" }],
                    rejectedBatches: [{ $match: { status: 'Rejected' } }, { $count: "count" }],
                    pendingBatches: [{ $match: { status: 'Pending' } }, { $count: "count" }],
                    pendingReceivingBatches: [{ $match: { "dispatched.received": { $exists: false } } }, { $count: "count" }],
                },
            },
        ];
        
        const [result] = await Batch.aggregate(statsPipeline);
        
        const stats = {
            totalBatches: totalCount || 0,//result.totalBatches?.[0]?.count || 0,
            approvedBatches: result.approvedBatches?.[0]?.count || 0,
            rejectedBatches: result.rejectedBatches?.[0]?.count || 0,
            pendingBatches: result.pendingBatches?.[0]?.count || 0,
            pendingReceivingBatches: result.pendingReceivingBatches?.[0]?.count || 0,
        };
        
        

        // Export functionality
        if (isExport == 1) {
            const exportData = rows.map(item => ({
                "Batch ID": item.batchId || 'NA',
                "Associate Name": item.seller_id?.basic_details?.associate_details?.associate_name || 'NA',
                //"Organization Name": item.seller?.basic_details?.associate_details?.organization_name || 'NA',
                "Procurement Center": item.procurementCenter_id?.center_name || 'NA',
                "Warehouse": item.warehousedetails_id?.basicDetails?.warehouseName || 'NA',
                "Quantity": item.qty || 'NA',
                "Status": item.wareHouse_approve_status || 'NA'
            }));

            if (exportData.length) {
                return dumpJSONToExcel(req, res, {
                    data: exportData,
                    fileName: `Warehouse-Batches.xlsx`,
                    worksheetName: `Batches`
                });
            }
            return res.status(200).send(new serviceResponse({ status: 200, message: "No data available for export" }));
        }

        return res.status(200).send(new serviceResponse({
            status: 200,
            data: {
                records: {
                    rows,
                    count: totalCount,
                    page,
                    limit,
                    pages: Math.ceil(totalCount / limit),
                    ...stats
                }
            },
            message: "Batches fetched successfully"
        }));

    } catch (error) {
        console.error(error);
        return res.status(500).send(new serviceResponse({ status: 500, message: "Error fetching batches", error: error.message }));
    }
});

module.exports.batchApproveOrReject = async (req, res) => {
    try {
        const { batchId, status, product_images = [], qc_images = [] } = req.body;
        const getToken = req.headers.token || req.cookies.token;
        if (!getToken) {
            return res.status(200).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
        }
        const decode = await decryptJwtToken(getToken);
        const UserId = decode.data.organization_id;

        // Find the batch that is not already approved
        const record = await Batch.findOne({
            _id: batchId,
            wareHouse_approve_status: { $ne: "Approved" }
        });

        if (!record) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                errors: [{ message: "Batch not found or already approved/rejected" }]
            }));
        }

        // Update product images and QC images in the batch
        if (product_images.length > 0) {
            record.dispatched.product_images = record.dispatched.product_images || [];
            record.dispatched.product_images.push(...product_images.map(img => ({ img, on: new Date() })));
        }

        if (qc_images.length > 0) {
            record.dispatched.qc_images = record.dispatched.qc_images || [];
            record.dispatched.qc_images.push(...qc_images.map(img => ({ img, on: new Date() })));
        }

        // Update the approval or rejection status
        record.wareHouse_approve_status = status === "Approved" ? "Approved" : "Rejected";
        record.wareHouse_approve_at = new Date();
        record.wareHouse_approve_by = UserId;

        // Save the updated batch record
        await record.save();

        return res.status(200).send(new serviceResponse({
            status: 200,
            message: `Batch successfully ${status}`,
            data: record,
        }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.viewBatchDetails = async (req, res) => {
    try {
        const { batch_id } = req.query;

        if (!batch_id) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                errors: [{ message: "Batch ID is required" }]
            }));
        }

        const batch = await Batch.findById(batch_id)
            .populate([
                { path: "procurementCenter_id", select: "center_name" },
                { path: "seller_id", select: "basic_details.associate_details.associate_name basic_details.associate_details.organization_name" },
                { path: "farmerOrderIds.farmerOrder_id", select: "metaData.name order_no" },
                { path: "warehousedetails_id", select: "basicDetails.warehouseName basicDetails.addressDetails wareHouse_code" },
                { path: "req_id", select: "product.name deliveryDate" },
            ])

        if (!batch) {
            return res.status(404).send(new serviceResponse({
                status: 404,
                errors: [{ message: "Batch not found" }]
            }));
        }
        console.log('batch',batch)
        const response = {
            basic_details : {
                batch_id: batch.batchId,
                fpoName: batch.seller_id,
                commodity: batch.req_id || "NA",
                intransit: batch.intransit || "NA",
                receivingDetails: batch.receiving_details || "NA",
                procurementDate: batch.procurementDate,
                procurementCenter: batch.procurementCenter_id?.center_name || "NA",
                warehouse: batch.warehousedetails_id,
                msp: batch.msp || "NA",
                final_quality_check : batch.final_quality_check,
                dispatched : batch.dispatched, 
                delivered : batch.delivered
            },
            
            lotDetails: batch.farmerOrderIds.map(order => ({
                lotId: order.farmerOrder_id?.order_no || "NA",
                farmerName: order.farmerOrder_id?.metaData?.name || "NA",
                quantityPurchased: order.qty || "NA"
            })),
            
            document_pictures : {
                document_pictures : batch.document_pictures
            },
            
        };

        return res.status(200).send(new serviceResponse({
            status: 200,
            data: response,
            batch: batch,
            message: "Batch details fetched successfully"
        }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.lot_list = async (req, res) => {
    try {
        const { batch_id } = req.query;
        console.log('batch_id',batch_id)
        const record = {}
        record.rows = await Batch.findOne({ _id: batch_id }).select({ _id: 1, farmerOrderIds: 1 }).populate({ path: "farmerOrderIds.farmerOrder_id", select: "metaData.name qtyProcured order_no" });

        if (!record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }))
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Farmer") }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.editBatchDetails = async (req, res) => {
    try {
        const { batchId, ...updateFields } = req.body;

        if (!batchId) {
            return res.status(400).json({ status: 400, message: "Batch ID is required" });
        }

        const updatedBatch = await Batch.findByIdAndUpdate(
            batchId,
            { $set: updateFields },
            { new: true }
        );

        if (!updatedBatch) {
            return res.status(404).json({ status: 404, message: "Batch not found" });
        }

        return res.status(200).json({ status: 200, message: "Batch updated successfully", data: updatedBatch });
    } catch (error) {
        return res.status(500).json({ status: 500, message: error.message });
    }
};

module.exports.batchStatusUpdate = async (req, res) => {
    try {
        const {batchId, product_images, qc_images, whr_receipt,whr_receipt_image, status, rejected_reason } = req.body;
        
        const requiredFields = ['batchId', 'product_images', 'qc_images', 'status'];
        if (status !== 'Rejected') {
            requiredFields.push('whr_receipt', 'whr_receipt_image');
        }

        const missingFields = requiredFields.filter((field) => !req.body[field]);

        if (missingFields.length > 0) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                message: `Missing required fields: ${missingFields.join(', ')}`,
            }));
        }

        if (status === 'Rejected' && !rejected_reason) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                message: 'rejected_reason'
            }));
        }


        const batchData = await Batch.findById(batchId);
        if (!batchData) {
            return res.status(404).send(new serviceResponse({
                status: 404,
                message: _response_message.notFound('Batch')
            }));
        }

        const updateFields = {
            'final_quality_check.status': status,
            'final_quality_check.product_images': product_images,
            'final_quality_check.qc_images': qc_images,
            'final_quality_check.whr_receipt': whr_receipt,
            'final_quality_check.whr_receipt_image': whr_receipt_image,
            'final_quality_check.rejected_reason': status === 'Rejected' ? rejected_reason : null
        };

        const updatedBatch = await Batch.findByIdAndUpdate(batchId, { $set: updateFields }, { new: true });
        if (!updatedBatch) {
            return res.status(404).send(new serviceResponse({
                status: 404,
                message: _response_message.notFound('Batch')
            }));
        }

        return res.status(200).send(new serviceResponse({
            status: 200,
            message: 'Batch status updated successfully.',
            data: updatedBatch
        }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.batchMarkDelivered = async (req, res) => {
    try {
        const {
            batchId,
            quantity_received,
            no_of_bags,
            bag_weight_per_kg,
            truck_photo,
            vehicle_details,
            document_pictures,
            weight_slip = [], qc_report = [], data, paymentIsApprove = 0 
        } = req.body;
        const { user_id, user_type } = req;
        const requiredFields = [
            'quantity_received',
            'no_of_bags',
            'bag_weight_per_kg',
            'truck_photo',
            'vehicle_details.loaded_vehicle_weight',
            'vehicle_details.tare_weight',
            'vehicle_details.net_weight',
            'document_pictures.product_images',
            'document_pictures.weigh_bridge_slip',
            'document_pictures.receiving_copy',
            'document_pictures.proof_of_delivery',
            'document_pictures.truck_photo',
        ];
        const missingFields = requiredFields.filter((field) => {
            const fieldParts = field.split('.');
            let value = req.body;
            for (const part of fieldParts) {
                if (value && value[part] !== undefined) {
                    value = value[part];
                } else {
                    return true;
                }
            }
            return false;
        });

        if (missingFields.length > 0) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                message: `Missing required fields: ${missingFields.join(', ')}`,
            }));
        }

        const record = await Batch.findOne({ _id: batchId }).populate("req_id").populate("seller_id");
   
        if (!record) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }));
        }

        // if (document_pictures.product_images.length > 0) {
        //     record.dispatched.material_img.received.push(...document_pictures.product_images.map(i => { return { img: i, on: moment() } }))
        // }
        // if (qc_report.length > 0) {
            record.dispatched.qc_report.received.push(...qc_report.map(i => { return { img: i, on: moment() } }));
            record.dispatched.qc_report.received_qc_status = received_qc_status.accepted;

            const { farmerOrderIds } = record;

            const paymentRecords = [];

            const request = await RequestModel.findOne({ _id: record?.req_id });
            // console.log('req_id',record.req_id);return false;
            for (let farmer of farmerOrderIds) {

                const farmerData = await FarmerOrders.findOne({ _id: farmer?.farmerOrder_id });

                const paymentData = {
                    req_id: request?._id,
                    farmer_id: farmerData.farmer_id,
                    farmer_order_id: farmer.farmerOrder_id,
                    associate_id: record?.seller_id,
                    ho_id: request?.head_office_id,
                    bo_id: request?.branch_id,
                    associateOffers_id: farmerData?.associateOffers_id,
                    batch_id: record?._id,
                    qtyProcured: farmer.qty,
                    amount: farmer.amt,
                    initiated_at: new Date(),
                    payment_method: _paymentmethod.bank_transfer
                }

                paymentRecords.push(paymentData);
            }

            await Payment.insertMany(paymentRecords);

            record.delivered.proof_of_delivery = document_pictures.proof_of_delivery;
            record.delivered.weigh_bridge_slip = document_pictures.weigh_bridge_slip;
            record.delivered.receiving_copy = document_pictures.receiving_copy;
            record.delivered.truck_photo = truck_photo;
            record.delivered.loaded_vehicle_weight = vehicle_details.loaded_vehicle_weight;
            record.delivered.tare_weight = vehicle_details.tare_weight;
            record.delivered.net_weight = vehicle_details.net_weight;
            record.delivered.delivered_at = new Date();
            record.delivered.delivered_by = user_id;
    
            record.status = _batchStatus.delivered;
        // }

        // if (weight_slip.length > 0) {
            record.dispatched.weight_slip.received.push(...weight_slip.map(i => { return { img: i, on: moment() } }))
        // }
        
        
        // record.payement_approval_at = new Date();
        // record.payment_approve_by = user_id;
        await record.save();









        const batchData = await Batch.findById(batchId);
        if (!batchData) {
            return res.status(404).send(new serviceResponse({
                status: 404,
                message: _response_message.notFound('Batch')
            }));
        }

        const updateFields = {
            'receiving_details.quantity_received': quantity_received,
            'receiving_details.no_of_bags': no_of_bags,
            'receiving_details.bag_weight_per_kg': bag_weight_per_kg,
            'receiving_details.truck_photo': truck_photo,
            'receiving_details.vehicle_details': vehicle_details,
            'receiving_details.document_pictures': document_pictures,
            wareHouse_approve_status: 'Received',
        };

        const updatedBatch = await Batch.findByIdAndUpdate(batchId, { $set: updateFields }, { new: true });
        if (!updatedBatch) {
            return res.status(404).send(new serviceResponse({
                status: 404,
                message: _response_message.notFound('Batch')
            }));
        }

        return res.status(200).send(new serviceResponse({
            status: 200,
            message: 'Batch receiving details updated successfully.',
            data: updatedBatch
        })); 
        
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};


module.exports.batchStatsData = async (req, res) => {
    try {
        const { warehouseIds = [] } = req.body;
        const getToken = req.headers.token || req.cookies.token;
        if (!getToken) {
            return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
        }

        const decode = await decryptJwtToken(getToken);
        const UserId = decode.data.organization_id;

        if (!mongoose.Types.ObjectId.isValid(UserId)) {
            return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
        }
        
        const warehouseDetails = await wareHouseDetails.find({ warehouseOwnerId: new mongoose.Types.ObjectId(UserId) });
        const ownerwarehouseIds = warehouseDetails.map(warehouse => warehouse._id.toString());
        
        const finalwarehouseIds = Array.isArray(warehouseIds) && warehouseIds.length
            ? warehouseIds.filter(id => ownerwarehouseIds.includes(id))
            : ownerwarehouseIds;

        if (!finalwarehouseIds.length) {
            return res.status(200).send(new serviceResponse({
                status: 200,
                message: "No warehouses found for the user."
            }));
        }

        const query = {"warehousedetails_id": { $in: finalwarehouseIds }};

        const rows = await Batch.find(query);

        //////// for external batches

        const externalBatchrows = await ExternalBatch.countDocuments({"warehousedetails_id": { $in: finalwarehouseIds }});
        

        let totalBatches = 0;
        let approvedQC = 0;
        let rejectedQC = 0;
        let pendingQC = 0;
        let receivedBatch = 0;
        let pendingBatch = 0;
        let rejectedBatch = 0;
        let approvedBatch = 0;
        
        rows.forEach(batch => {
            const qcStatus = batch?.final_quality_check?.status;
            const batchesStatus = batch?.wareHouse_approve_status;

            if(batchesStatus == 'Received') {
                if (qcStatus === "Approved") {
                    approvedQC++;
                } else if (qcStatus === "Rejected") {
                    rejectedQC++;
                } else if (qcStatus === "Pending") {
                    pendingQC++;
                }
            }
            

            if(batchesStatus == 'Pending') {
                pendingBatch++;
            } else if (batchesStatus == 'Received') {
                receivedBatch++;
            } else if (batchesStatus == 'Rejected') {
                rejectedBatch++;
            } else if (batchesStatus == 'Approved') {
                approvedBatch++;
            }

        });
        const response = {
            totalBatches : receivedBatch+pendingBatch,
            approvedQC,
            rejectedQC,
            pendingQC,
            receivedBatch,
            pendingBatch,
            // rejectedBatch,
            // approvedBatch
            externalBatch : externalBatchrows
        };
        return res.status(200).send(new serviceResponse({
            status: 200,
            message: 'Batch statistics fetch successfully.',
            data: response
        })); 
        
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};



// Utility function to convert a string to camelCase
function toCamelCase(str) {
    return str
        .split(/[^a-zA-Z0-9]+/)
        .map((word, index) =>
            index === 0
                ? word.toLowerCase()
                : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join('');
}

module.exports.getFilterBatchList = async (req, res) => {
    const { sortBy = "createdAt" } = req.query;
    try {
        const getToken = req.headers.token || req.cookies.token;
        if (!getToken) {
            return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
        }

        const decode = await decryptJwtToken(getToken);
        const UserId = decode.data.organization_id;

        if (!mongoose.Types.ObjectId.isValid(UserId)) {
            return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
        }

        const warehouseDetails = await wareHouseDetails.find({ warehouseOwnerId: new mongoose.Types.ObjectId(UserId) });
        const ownerwarehouseIds = warehouseDetails.map(warehouse => warehouse._id.toString());

        const query = {
            "warehousedetails_id": { $in: ownerwarehouseIds },
        };

        const rows = await Batch.find(query)
            .populate([
                { path: "req_id", select: "product.name" },
            ])
            .select("final_quality_check.status ")
            .sort(sortBy);

        // Create key-value pairs for status and name
        const statusKeyValue = {};
        const nameKeyValue = {};

        rows.forEach(row => {
            if (row.final_quality_check?.status) {
                const camelKey = toCamelCase(row.final_quality_check.status);
                statusKeyValue[camelKey] = row.final_quality_check.status;
            }
            if (row.req_id?.product?.name) {
                const camelKey = toCamelCase(row.req_id.product.name);
                nameKeyValue[camelKey] = row.req_id.product.name;
            }
        });

        // Prepare final response structure
        const result = {
            status: statusKeyValue,
            name: nameKeyValue,
        };

        return res.status(200).send(new serviceResponse({
            status: 200,
            data: result,
            message: "Batches filter list fetched successfully",
        }));
    } catch (error) {
        console.error(error);
        return res.status(500).send(new serviceResponse({ status: 500, message: "Error fetching batches", error: error.message }));
    }
};

module.exports.createExternalBatch = async (req, res) => {
    try {
        const { batchName, associate_name, procurementCenter, inward_quantity, commodity, warehousedetails_id } = req.body;
        const { user_id } = req;

        const requiredFields = { batchName, procurementCenter, commodity, warehousedetails_id, associate_name };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                return res.status(400).send(new serviceResponse({ status: 400, message: _middleware.require(key.replace(/_/g, ' ')) }));
            }
        }
        let externalBatchExist = await ExternalBatch.findOne({ batchName  })
        if (externalBatchExist) {
            return res.status(200).send(new serviceResponse({ status: 400, message: _response_message.allReadyExist('Batch Name') }));
        }

        const externalBatchData = new ExternalBatch({ 
            batchName, 
            associate_name, 
            procurementCenter, 
            inward_quantity: inward_quantity || 0,
            commodity : commodity || 'Maize',
            warehousedetails_id,
            remaining_quantity : inward_quantity
        });

        const response = await externalBatchData.save();

        return res.status(200).send(new serviceResponse({ message: _query.add('External Batch'), data: response }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.listExternalBatchList = async (req, res) => {
    try {
        const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = "_id", search = "" } = req.query;

        let query = {};
        if (search) {
            query["basicDetails.warehouseName"] = { $regex: search, $options: "i" };
        }

        const records = { count: 0, rows: [] };

        if (paginate == 1) {
            records.rows = await ExternalBatch.find(query)
                .populate({
                    path: "warehousedetails_id",
                    select: "basicDetails.warehouseName",
                })
                .sort(sortBy)
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            records.count = await ExternalBatch.countDocuments(query);
            records.page = parseInt(page);
            records.limit = parseInt(limit);
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        } else {
            records.rows = await ExternalOrder.find(query)
                .populate({
                    path: "warehousedetails_id",
                    select: "basicDetails.warehouseName",
                })
                .sort(sortBy);
        }

        return res.status(200).send(
            new serviceResponse({ status: 200, data: records, message: _response_message.found("ExternalBatch") })
        );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
