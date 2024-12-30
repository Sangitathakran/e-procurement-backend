const mongoose = require('mongoose');
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { sendMail } = require("@src/v1/utils/helpers/node_mailer");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { decryptJwtToken } = require('@src/v1/utils/helpers/jwt');


module.exports.getBatchesByWarehouse = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 10, sortBy = "createdAt", search = '', isExport = 0 } = req.query;
    const { warehouseIds = [] } = req.body;

    try {
        // Fetch the token from headers or cookies
        const getToken = req.headers.token || req.cookies.token;
        if (!getToken) {
            return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
        }

        // Decode the token to get the user ID
        const decode = await decryptJwtToken(getToken);
        const UserId = decode.data.user_id;

        // Validate the user ID from the token
        if (!mongoose.Types.ObjectId.isValid(UserId)) {
            return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
        }

        // Fetch warehouse details based on the decoded UserId
        const warehouseDetails = await wareHouseDetails.find({ warehouseOwnerId: new mongoose.Types.ObjectId(UserId) });
        const ownerWarehouseIds = warehouseDetails.map(warehouse => warehouse._id.toString());

        // Filter warehouse IDs from the request body against the owner's warehouses
        const finalWarehouseIds = Array.isArray(warehouseIds) && warehouseIds.length
            ? warehouseIds.filter(id => ownerWarehouseIds.includes(id))
            : ownerWarehouseIds;

        if (!finalWarehouseIds.length) {
            return res.status(200).send(new serviceResponse({
                status: 200,
                data: { records: [], page, limit, pages: 0 },
                message: "No warehouses found for the user."
            }));
        }

        // Build the query
        const query = {
            warehousedetails_id: { $in: finalWarehouseIds },
            ...(search && {
                $or: [
                    { batchId: { $regex: search, $options: 'i' } },
                    { "seller_id.basic_details.associate_details.associate_name": { $regex: search, $options: 'i' } },
                    { "procurementCenter_id.center_name": { $regex: search, $options: 'i' } },
                ]
            }),
        };

        // Fetch records
        const rows = await Batch.find(query)
            .populate([
                { path: "seller_id", select: "basic_details.associate_details.associate_name basic_details.associate_details.organization_name" },
                { path: "procurementCenter_id", select: "center_name" },
                { path: "warehousedetails_id", select: "basicDetails.warehouseName" },
            ])
            .select("batchId warehousedetails_id commodity qty received_on qc_report.received_qc_status")
            .sort({ [sortBy]: 1 })
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

        // Send email notification
        // const subject = status === "approved"
        //     ? `Batch Approved: Notification for Batch ID ${record._id}`
        //     : `Batch Rejected: Notification for Batch ID ${record._id}`;

        // const body = status === "approved"
        //     ? `<p>Dear User,</p>
        //        <p>The batch with ID <strong>${record._id}</strong> has been <strong>approved</strong>.</p>
        //        ${product_images.length > 0 ? `<p>Product Images: ${product_images.map(img => `<a href='${img}'>View</a>`).join(', ')}</p>` : ''}
        //        ${qc_images.length > 0 ? `<p>QC Images: ${qc_images.map(img => `<a href='${img}'>View</a>`).join(', ')}</p>` : ''}
        //        <p>Warm regards,</p>
        //        <p>Team</p>`
        //     : `<p>Dear User,</p>
        //        <p>The batch with ID <strong>${record._id}</strong> has been <strong>rejected</strong>.</p>
        //        ${product_images.length > 0 ? `<p>Product Images: ${product_images.map(img => `<a href='${img}'>View</a>`).join(', ')}</p>` : ''}
        //        ${qc_images.length > 0 ? `<p>QC Images: ${qc_images.map(img => `<a href='${img}'>View</a>`).join(', ')}</p>` : ''}
        //        <p>Warm regards,</p>
        //        <p>Team</p>`;

        // await sendMail("nagma@navankur.org", "", subject, body);

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
                { path: "warehousedetails_id", select: "basicDetails.warehouseName basicDetails.addressDetails" },
                { path: "farmerOrderIds.farmerOrder_id", select: "metaData.name order_no" }
            ])

        if (!batch) {
            return res.status(404).send(new serviceResponse({
                status: 404,
                errors: [{ message: "Batch not found" }]
            }));
        }

        const response = {
            batch_id: batch.batch_id,
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


