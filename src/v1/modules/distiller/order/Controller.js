const { _generateOrderNumber, dumpJSONToExcel, handleDecimal } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { _webSocketEvents, _status, _poRequestStatus, _poPaymentStatus, _poAdvancePaymentStatus } = require('@src/v1/utils/constants');
const { _userType } = require('@src/v1/utils/constants');
const moment = require("moment");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { BatchOrderProcess } = require("@src/v1/models/app/distiller/batchOrderProcess");

const { default: mongoose } = require("mongoose");


module.exports.getOrder = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
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

module.exports.getOrderById = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const record = await PurchaseOrderModel.findOne({ _id: id });

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order") }] }))
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("order") }))
})

module.exports.deleteOrder = asyncErrorHandler(async (req, res) => {
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


module.exports.createBatch = asyncErrorHandler(async (req, res) => {
    const { user_id, user_type } = req;
    const { warehouseId, orderId, quantityRequired } = req.body;

    if (user_type && user_type != _userType.distiller) {
        return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized() }] }));
    }

    const poRecord = await PurchaseOrderModel.findOne({ _id: orderId, deletedAt: null  });
    
    if (!poRecord) {
        return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound("PO") }));
    }
    const { purchasedOrder, fulfilledQty, paymentInfo } = poRecord;

    if (quantityRequired > purchasedOrder.poQuantity) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Quantity should not exceed PO Qty." }] }))
    }

    const existBatch = await BatchOrderProcess.find({ distiller_id: user_id, orderId });
    if (existBatch) {
        const addedQty = existBatch.reduce((quantityRequired, existBatch) => quantityRequired + existBatch.quantityRequired, 0);

        if (addedQty >= purchasedOrder.poQuantity) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Cannot create more Batch, Qty already fulfilled." }] }))
        }

        const remainingQty = handleDecimal(purchasedOrder.poQuantity - addedQty);

        if (quantityRequired > remainingQty) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Quantity should not exceed PO Remaining Qty." }] }))
        }
    }

    const msp = 24470;
    const totalAmount = handleDecimal(paymentInfo.totalAmount);
    const tokenAmount = handleDecimal(paymentInfo.advancePayment);
    const remainingAmount = handleDecimal(paymentInfo.balancePayment);

    let amountToBePaid = ''
    if (existBatch) {
        amountToBePaid = handleDecimal(msp * quantityRequired);
    } else {
        amountToBePaid = handleDecimal((msp * quantityRequired) - tokenAmount);
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

    const record = await BatchOrderProcess.create({
        distiller_id: user_id,
        warehouseId,
        orderId,
        batchId: randomVal,
        quantityRequired: handleDecimal(quantityRequired),
        'payment.amount': amountToBePaid,
        createdBy: user_id
    });

    poRecord.fulfilledQty = handleDecimal(fulfilledQty + quantityRequired)

    await poRecord.save();

    eventEmitter.emit(_webSocketEvents.procurement, { ...record, method: "created" });

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.created("PO Batch") }));
});