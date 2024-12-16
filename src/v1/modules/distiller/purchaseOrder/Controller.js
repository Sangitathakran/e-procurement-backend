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
    const { branch_id, name, grade, grade_remark, msp, poQuantity, quantityDuration, manufacturingLocation, storageLocation, deliveryLocation } = req.body;

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

    const totalAmount = handleDecimal(msp * poQuantity);
    const tokenAmount = handleDecimal((totalAmount * 3) / 100);
    const remainingAmount = handleDecimal(totalAmount - tokenAmount);

    const record = await PurchaseOrderModel.create({
        poNo: randomVal,
        branch_id,
        product: {
            name,
            grade,
            grade_remark,
            msp: handleDecimal(msp),
            poQuantity: handleDecimal(poQuantity),
            quantityDuration
        },
        manufacturingLocation,
        storageLocation,
        deliveryLocation,
        paymentInfo: {
            totalAmount: handleDecimal(totalAmount), // Assume this is calculated during the first step
            advancePayment: handleDecimal(tokenAmount), // Auto-calculated: 3% of totalAmount
            advancePaymentDate: new Date(),
            balancePayment: handleDecimal(remainingAmount) // Auto-calculated: 97% of totalAmount
        },
        purchasedOrder: {
            poNo: randomVal,
            poDate: new Date(),
            poQuantity: handleDecimal(poQuantity),
            poAmount: handleDecimal(totalAmount)
        },
        createdBy: user_id,
        distiller_id: user_id
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

    const { id, name, grade, quantity, msp, quantityDuration, manufacturingLocation, storageLocation, deliveryLocation,
        companyName, registeredAddress, phone, faxNo, email, pan, gstin, cin, indentNumber, indentDate,
        referenceDate, contactPerson, transportDetails, termsOfDelivery, digitalSignature, moisture, broken,
        acceptedTerms, comments
    } = req.body;
    
    const record = await PurchaseOrderModel.findOne({ _id: id }).populate("head_office_id").populate("branch_id");

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound("request") }));
    }

    // Update product details
    record.product.name = name || record.product.name;
    record.product.grade = grade || record.product.grade;
    record.product.poQuantity = quantity ? handleDecimal(quantity) : record.product.poQuantity;
    record.product.msp = msp ? handleDecimal(msp) : record.product.msp;
    record.product.quantityDuration = quantityDuration || record.product.quantityDuration;
    // Update locations
    record.manufacturingLocation = manufacturingLocation || record.manufacturingLocation;
    record.storageLocation = storageLocation || record.storageLocation;
    record.deliveryLocation = deliveryLocation || record.deliveryLocation;
    // Update company details
    record.companyDetails.companyName = companyName || record.companyDetails.companyName;
    record.companyDetails.registeredAddress = registeredAddress || record.companyDetails.registeredAddress;
    record.companyDetails.phone = phone || record.companyDetails.phone;
    record.companyDetails.faxNo = faxNo || record.companyDetails.faxNo;
    record.companyDetails.email = email || record.companyDetails.email;
    record.companyDetails.pan = pan || record.companyDetails.pan;
    record.companyDetails.gstin = gstin || record.companyDetails.gstin;
    record.companyDetails.cin = cin || record.companyDetails.cin;
    // Update purchase order reference
    record.purchasedOrder.poNo = record.purchasedOrder.poNo || record.purchasedOrder.poNo;
    record.purchasedOrder.poDate = record.purchasedOrder.poDate || record.purchasedOrder.poDate;
    record.purchasedOrder.poQuantity = quantity ? handleDecimal(quantity) : record.purchasedOrder.poQuantity;
    record.purchasedOrder.poAmount = totalAmount ? handleDecimal(totalAmount) : record.purchasedOrder.poAmount;
    record.purchasedOrder.poValidity = expiry_date || record.purchasedOrder.poValidity;
    // Update additional details
    record.additionalDetails.indentNumber = indentNumber || record.additionalDetails.indentNumber;
    record.additionalDetails.indentDate = indentDate || record.additionalDetails.indentDate;
    record.additionalDetails.referenceDate = referenceDate || record.additionalDetails.referenceDate;
    record.additionalDetails.contactPerson = contactPerson || record.additionalDetails.contactPerson;
    record.additionalDetails.transportDetails = transportDetails || record.additionalDetails.transportDetails;
    record.additionalDetails.termsOfDelivery = termsOfDelivery || record.additionalDetails.termsOfDelivery;
    record.additionalDetails.digitalSignature = digitalSignature || record.additionalDetails.digitalSignature;
    // Update quality specification
    record.qualitySpecificationOfProduct.moisture = moisture || record.qualitySpecificationOfProduct.moisture;
    record.qualitySpecificationOfProduct.broken = broken || record.qualitySpecificationOfProduct.broken;
    // Update terms and conditions
    record.termsAndConditions.accepted = acceptedTerms !== undefined ? acceptedTerms : record.termsAndConditions.accepted;

    // Update comments (if any)
    if (comments && Array.isArray(comments)) {
        record.comments = comments.map(comment => ({
            user_id: comment.user_id,
            comment: comment.comment
        }));
    }
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
