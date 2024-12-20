const { _generateOrderNumber, dumpJSONToExcel, handleDecimal } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { _webSocketEvents, _status, _poRequestStatus, _poPaymentStatus } = require('@src/v1/utils/constants');
const { _userType } = require('@src/v1/utils/constants');
const moment = require("moment");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { default: mongoose } = require("mongoose");


module.exports.createPurchaseOrder = asyncErrorHandler(async (req, res) => {
    const { user_id, user_type } = req;
    const { branch_id, name, grade, grade_remark, poQuantity, quantityDuration, manufacturingLocation, storageLocation, deliveryLocation,
        companyDetails, additionalDetails, qualitySpecificationOfProduct, termsAndConditions, comments,
    } = req.body;

    if (user_type && user_type != _userType.distiller) {
        return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized() }] }));
    }

    let randomVal;
    let isUnique = false;

    while (!isUnique) {
        randomVal = _generateOrderNumber();
        const existingReq = await PurchaseOrderModel.findOne({ poNo: randomVal });
        if (!existingReq) {
            isUnique = true;
        }
    }

    const msp = 24470;
    const totalAmount = handleDecimal(msp * poQuantity);
    const tokenAmount = handleDecimal((totalAmount * 3) / 100);
    const remainingAmount = handleDecimal(totalAmount - tokenAmount);

    const record = await PurchaseOrderModel.create({
        distiller_id: user_id,
        branch_id,
        purchasedOrder: {
            poNo: randomVal,
            poQuantity: handleDecimal(poQuantity),
            poAmount: handleDecimal(totalAmount)
        },
        product: {
            name,
            grade,
            grade_remark,
            msp: 24470,
            quantityDuration
        },
        manufacturingLocation,
        storageLocation,
        deliveryLocation,
        paymentInfo: {
            totalAmount: handleDecimal(totalAmount), // Assume this is calculated during the first step
            advancePayment: handleDecimal(tokenAmount), // Auto-calculated: 3% of totalAmount
            balancePayment: handleDecimal(remainingAmount), // Auto-calculated: 97% of totalAmount
            tax:0
        },
        companyDetails,
        additionalDetails,
        qualitySpecificationOfProduct,
        termsAndConditions,
        comments,
        comments: {
            user_id,
            comment
        },
        createdBy: user_id
    });

    eventEmitter.emit(_webSocketEvents.procurement, { ...record, method: "created" });

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.created("procurement") }));
});

module.exports.getPurchaseOrder = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
    let query = search ? {
        $or: [
            { "reqNo": { $regex: search, $options: 'i' } },
            { "product.name": { $regex: search, $options: 'i' } },
            { "product.grade": { $regex: search, $options: 'i' } },
        ]
    } : {};

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

module.exports.getPurchaseOrderById = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const record = await PurchaseOrderModel.findOne({ _id: id });

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order") }] }))
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("order") }))
})

module.exports.updatePurchaseOrder = asyncErrorHandler(async (req, res) => {

    const { id, branch_id, name, grade, grade_remark, poQuantity, quantityDuration, manufacturingLocation, storageLocation, deliveryLocation,
        companyDetails, additionalDetails, qualitySpecificationOfProduct, comments,
    } = req.body;

    const record = await PurchaseOrderModel.findOne({ _id: id }).populate("head_office_id").populate("branch_id");

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound("request") }));
    }

    const msp = 24470;
    const totalAmount = handleDecimal(msp * poQuantity);
    const tokenAmount = handleDecimal((totalAmount * 3) / 100);


    record.branch_id = branch_id || record.branch_id,
    // Update product details
    record.product.name = name || record.product.name;
    record.product.grade = grade || record.product.grade;
    record.product.grade = grade_remark || record.product.grade_remark;
    record.product.quantityDuration = quantityDuration || record.product.quantityDuration;
    // Update locations
    record.manufacturingLocation = manufacturingLocation || record.manufacturingLocation;
    record.storageLocation = storageLocation || record.storageLocation;
    record.deliveryLocation = deliveryLocation || record.deliveryLocation;
    // Update company details
    record.companyDetails.companyName = companyDetails.companyName || record.companyDetails.companyName;
    record.companyDetails.registeredAddress = companyDetails.registeredAddress || record.companyDetails.registeredAddress;
    record.companyDetails.phone = companyDetails.phone || record.companyDetails.phone;
    record.companyDetails.faxNo = companyDetails.faxNo || record.companyDetails.faxNo;
    record.companyDetails.email = companyDetails.email || record.companyDetails.email;
    record.companyDetails.pan = companyDetails.pan || record.companyDetails.pan;
    record.companyDetails.gstin = companyDetails.gstin || record.companyDetails.gstin;
    record.companyDetails.cin = companyDetails.cin || record.companyDetails.cin;
    // Update purchase order reference
    record.purchasedOrder.poQuantity = poQuantity ? handleDecimal(poQuantity) : record.purchasedOrder.poQuantity;
    record.purchasedOrder.poAmount = totalAmount ? handleDecimal(totalAmount) : record.purchasedOrder.poAmount;
    // Update additional details
    record.additionalDetails.indentNumber = additionalDetails.indentNumber || record.additionalDetails.indentNumber;
    record.additionalDetails.indentDate = additionalDetails.indentDate || record.additionalDetails.indentDate;
    record.additionalDetails.referenceDate = additionalDetails.referenceDate || record.additionalDetails.referenceDate;
    record.additionalDetails.contactPerson = additionalDetails.contactPerson || record.additionalDetails.contactPerson;
    record.additionalDetails.transportDetails = additionalDetails.transportDetails || record.additionalDetails.transportDetails;
    record.additionalDetails.termsOfDelivery = additionalDetails.termsOfDelivery || record.additionalDetails.termsOfDelivery;
    record.additionalDetails.digitalSignature = additionalDetails.digitalSignature || record.additionalDetails.digitalSignature;
    // Update quality specification
    record.qualitySpecificationOfProduct.moisture = qualitySpecificationOfProduct.moisture || record.qualitySpecificationOfProduct.moisture;
    record.qualitySpecificationOfProduct.broken = qualitySpecificationOfProduct.broken || record.qualitySpecificationOfProduct.broken;
    record.comments.comment = comments.comments || record.comments.comment;
    // Save the updated record
    await record.save();

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("request") }));
});

module.exports.deletePurchaseOrder = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
    }

    const record = await PurchaseOrderModel.findOne({ _id: id });

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Requirement") }] }))
    }

    await record.deleteOne();

    return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.deleted("Requirement") }));
});
