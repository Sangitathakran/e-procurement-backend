const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { sendMail } = require("@src/v1/utils/helpers/node_mailer");



module.exports.getBatchesByWarehouse = asyncErrorHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = "createdAt", search = '', warehouseIds = [], isExport = 0 } = req.query;

        const warehouseFilter = Array.isArray(warehouseIds) && warehouseIds.length > 0
            ? { wareHouse_id: { $in: warehouseIds } }
            : {};

        const searchFilter = search ? {
            $or: [
                { batchId: { $regex: search, $options: 'i' } },
                { "seller_id.basic_details.associate_details.associate_name": { $regex: search, $options: 'i' } },
                { "procurementCenter_id.center_name": { $regex: search, $options: 'i' } },
            ]
        } : {};

        const query = {
            ...warehouseFilter,
            ...searchFilter
        };

        const records = {};
        records.rows = await Batch.find(query)
            .populate([
                { path: "seller_id", select: "basic_details.associate_details.associate_name basic_details.associate_details.organization_name" },
                { path: "procurementCenter_id", select: "center_name" },
                { path: "wareHouse_id", select: "warehouse_name" },
            ])
            .sort(sortBy)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        records.count = await Batch.countDocuments(query);

        records.page = page;
        records.limit = limit;
        records.pages = Math.ceil(records.count / limit);

        const totalBatches = await Batch.countDocuments(warehouseFilter);
        const approvedBatches = await Batch.countDocuments({ ...warehouseFilter, wareHouse_approve_status: "approved" });
        const rejectedBatches = await Batch.countDocuments({ ...warehouseFilter, wareHouse_approve_status: "rejected" });
        const pendingQCBatches = await Batch.countDocuments({ ...warehouseFilter, wareHouse_approve_status: "pending" });

        const widgetData = {
            totalBatches,
            approvedBatches,
            rejectedBatches,
            pendingQCBatches
        };

        if (isExport == 1) {
            const exportData = records.rows.map(item => {
                return {
                    "Batch ID": item.batchId || 'NA',
                    "Associate Name": item.seller_id?.basic_details?.associate_details?.associate_name || 'NA',
                    "Procurement Center": item.procurementCenter_id?.center_name || 'NA',
                    "Warehouse": item.wareHouse_id?.warehouse_name || 'NA',
                    "Quantity": item.qty || 'NA',
                    "Status": item.wareHouse_approve_status || 'NA'
                };
            });

            if (exportData.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: exportData,
                    fileName: `Warehouse-Batches.xlsx`,
                    worksheetName: `Batches`
                });
                return;
            } else {
                return res.status(200).send(new serviceResponse({ status: 200, message: "No data available for export" }));
            }
        }

        return res.status(200).send(new serviceResponse({
            status: 200,
            data: { records, widgetData },
            message: "Batches fetched successfully"
        }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
});


module.exports.batchApproveOrReject = async (req, res) => {
    try {
        const { batchId, status, product_images = [], qc_images = [] } = req.body;
        const { portalId } = req;

        // Find the batch that is not already approved
        const record = await Batch.findOne({
            _id: batchId,
            wareHouse_approve_status: { $ne: "approved" }
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
        record.wareHouse_approve_status = status === "approved" ? "approved" : "rejected";
        record.wareHouse_approve_at = new Date();
        record.wareHouse_approve_by = portalId;

        // Send email notification
        const subject = status === "approved"
            ? `Batch Approved: Notification for Batch ID ${record._id}`
            : `Batch Rejected: Notification for Batch ID ${record._id}`;

        const body = status === "approved"
            ? `<p>Dear User,</p>
               <p>The batch with ID <strong>${record._id}</strong> has been <strong>approved</strong>.</p>
               ${product_images.length > 0 ? `<p>Product Images: ${product_images.map(img => `<a href='${img}'>View</a>`).join(', ')}</p>` : ''}
               ${qc_images.length > 0 ? `<p>QC Images: ${qc_images.map(img => `<a href='${img}'>View</a>`).join(', ')}</p>` : ''}
               <p>Warm regards,</p>
               <p>Team</p>`
            : `<p>Dear User,</p>
               <p>The batch with ID <strong>${record._id}</strong> has been <strong>rejected</strong>.</p>
               ${product_images.length > 0 ? `<p>Product Images: ${product_images.map(img => `<a href='${img}'>View</a>`).join(', ')}</p>` : ''}
               ${qc_images.length > 0 ? `<p>QC Images: ${qc_images.map(img => `<a href='${img}'>View</a>`).join(', ')}</p>` : ''}
               <p>Warm regards,</p>
               <p>Team</p>`;

        await sendMail("ashita@navankur.org", "", subject, body);

        // Save the updated batch record
        await record.save();

        return res.status(200).send(new serviceResponse({
            status: 200,
            message: `Batch successfully ${status}`
        }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.viewBatchDetails = async (req, res) => {
    try {
        const { batchId } = req.query;

        if (!batchId) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                errors: [{ message: "Batch ID is required" }]
            }));
        }

        const batch = await Batch.findById(batchId)
            .populate([
                { path: "procurementCenter_id", select: "center_name" },
                { path: "warehouse_id", select: "basicDetails.warehouseName basicDetails.addressDetails" },
                { path: "farmerOrderIds.farmerOrder_id", select: "metaData.name order_no" }
            ])
            .select("-__v");

        if (!batch) {
            return res.status(404).send(new serviceResponse({
                status: 404,
                errors: [{ message: "Batch not found" }]
            }));
        }

        const response = {
            batchId: batch.batchId,
            fpoName: batch.fpoName,
            commodity: batch.commodity,
            quantityInTransit: batch.quantityInTransit,
            receivingDate: batch.receivingDate,
            procurementDate: batch.procurementDate,
            procurementCenter: batch.procurementCenter_id?.center_name || "NA",
            warehouse: batch.warehouse_id?.basicDetails?.warehouseName || "NA",
            warehouseAddress: batch.warehouse_id?.basicDetails?.addressDetails || "NA",
            msp: batch.msp,
            truckDetails: {
                truckNumber: batch.truckNumber,
                loadedWeight: batch.loadedVehicleWeight,
                tareWeight: batch.truckTareWeight,
                bagWeight: batch.bagWeight
            },
            driverDetails: {
                driverName: batch.driverName,
                driverPhone: batch.driverPhoneNumber,
                driverLicense: batch.driverLicense,
                driverAadhar: batch.driverAadhar
            },
            lotDetails: batch.farmerOrderIds.map(order => ({
                lotId: order.farmerOrder_id?.order_no || "NA",
                farmerName: order.farmerOrder_id?.metaData?.name || "NA",
                quantityPurchased: order.qty || "NA"
            }))
        };

        return res.status(200).send(new serviceResponse({
            status: 200,
            data: response,
            message: "Batch details fetched successfully"
        }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.lot_list = async (req, res) => {
    try {
        const { batch_id } = req.query;

        const record = {}
        record.rows = await Batch.findOne({ _id: batch_id }).select({ _id: 1, farmerOrderIds: 1 }).populate({ path: "farmerOrderIds.farmerOrder_id", select: "metaData.name qtyProcured" });

        if (!record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }))
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Farmer") }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

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


