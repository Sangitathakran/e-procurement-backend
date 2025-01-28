const mongoose = require('mongoose');
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { sendMail } = require("@src/v1/utils/helpers/node_mailer");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { decryptJwtToken } = require('@src/v1/utils/helpers/jwt');


module.exports.getReceivedBatchesByWarehouse = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 10, sortBy = "createdAt", search = '', isExport = 0 } = req.query;
    const { warehouseIds = [] } = req.body; // Updated to use warehouseIds

    try {
        const getToken = req.headers.token || req.cookies.token;
        if (!getToken) {
            return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
        }

        const decode = await decryptJwtToken(getToken);
        const UserId = decode.data.user_id;

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
                data: { records: [], page, limit, pages: 0 },
                message: "No warehouses found for the user."
            }));
        }

        const query = {
            "warehousedetails_id": { $in: finalwarehouseIds },
            wareHouse_approve_status: 'Received', 
            ...(search && {
                $or: [
                    { batchId: { $regex: search, $options: 'i' } },
                    { "seller_id.basic_details.associate_details.associate_name": { $regex: search, $options: 'i' } },
                    { "procurementCenter_id.center_name": { $regex: search, $options: 'i' } },
                ]
            }),
        };

        const rows = await Batch.find(query)
            .populate([
                { path: "seller_id", select: "basic_details.associate_details.associate_name basic_details.associate_details.organization_name" },
                { path: "procurementCenter_id", select: "center_name" },
                { path: "warehousedetails_id", select: "basicDetails.warehouseName basicDetails.addressDetails wareHouse_code" },
                { path: "req_id", select: "product.name deliveryDate" },
            ])
            .select("batchId warehousedetails_id commodity qty wareHouse_approve_status final_quality_check receiving_details createdAt")
            .sort(sortBy)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const count = await Batch.countDocuments(query);
        const stats = {
            totalBatches: count,
            approvedBatches: await Batch.countDocuments({ ...query, status: 'Approved' }),
            rejectedBatches: await Batch.countDocuments({ ...query, status: 'Rejected' }),
            pendingBatches: await Batch.countDocuments({ ...query, status: 'Pending' }),
            pendingReceivingBatches: await Batch.countDocuments({ ...query, "dispatched.received": { $exists: false } })
        };

        if (isExport == 1) {
            const exportData = rows.map(item => ({
                "Batch ID": item.batchId || 'NA',
                "Associate Name": item.seller_id?.basic_details?.associate_details?.associate_name || 'NA',
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
            data: { records: { rows, count, page, limit, pages: Math.ceil(count / limit), ...stats } },
            message: "Batches fetched successfully"
        }));
    } catch (error) {
        console.error(error);
        return res.status(500).send(new serviceResponse({ status: 500, message: "Error fetching batches", error: error.message }));
    }
});

module.exports.getPendingBatchesByWarehouse = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 10, sortBy = "createdAt", search = '', isExport = 0 } = req.query;
    const { warehouseIds = [] } = req.body; // Updated to use warehouseIds

    try {
        const getToken = req.headers.token || req.cookies.token;
        if (!getToken) {
            return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
        }

        const decode = await decryptJwtToken(getToken);
        const UserId = decode.data.user_id;

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
                data: { records: [], page, limit, pages: 0 },
                message: "No warehouses found for the user."
            }));
        }
        
        const query = {
            "warehousedetails_id": { $in: finalwarehouseIds },
            wareHouse_approve_status: 'Pending', 
            ...(search && {
                $or: [
                    { batchId: { $regex: search, $options: 'i' } },
                    { "seller_id.basic_details.associate_details.associate_name": { $regex: search, $options: 'i' } },
                    { "procurementCenter_id.center_name": { $regex: search, $options: 'i' } },
                ]
            }),
        };

        const rows = await Batch.find(query)
            .populate([
                { path: "seller_id", select: "basic_details.associate_details.associate_name basic_details.associate_details.organization_name" },
                { path: "procurementCenter_id", select: "center_name" },
                { path: "warehousedetails_id", select: "basicDetails.warehouseName basicDetails.addressDetails wareHouse_code" },
                { path: "req_id", select: "product.name deliveryDate" },
            ])
            .select("batchId warehousedetails_id commodity qty wareHouse_approve_status final_quality_check receiving_details createdAt")
            .sort(sortBy)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const count = await Batch.countDocuments(query);
        const stats = {
            totalBatches: count,
            approvedBatches: await Batch.countDocuments({ ...query, status: 'Approved' }),
            rejectedBatches: await Batch.countDocuments({ ...query, status: 'Rejected' }),
            pendingBatches: await Batch.countDocuments({ ...query, status: 'Pending' }),
            pendingReceivingBatches: await Batch.countDocuments({ ...query, "dispatched.received": { $exists: false } })
        };

        if (isExport == 1) {
            const exportData = rows.map(item => ({
                "Batch ID": item.batchId || 'NA',
                "Associate Name": item.seller_id?.basic_details?.associate_details?.associate_name || 'NA',
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
            data: { records: { rows, count, page, limit, pages: Math.ceil(count / limit), ...stats } },
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
        const UserId = decode.data.user_id;

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
        } = req.body;
        
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
        const UserId = decode.data.user_id;

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
                data: { records: [], page, limit, pages: 0 },
                message: "No warehouses found for the user."
            }));
        }

        const query = {"warehousedetails_id": { $in: finalwarehouseIds }};

        const rows = await Batch.find(query);
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