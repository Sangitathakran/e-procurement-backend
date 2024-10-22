const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { _batchStatus, received_qc_status, _paymentstatus, _paymentmethod } = require("@src/v1/utils/constants");
const { _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const moment = require("moment");

module.exports.getRequirements = asyncErrorHandler(async (req, res) => {

    const { user_id } = req;
    const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query;

    let query = search ? {
        $or: [
            { "reqNo": { $regex: search, $options: 'i' } },
            { "product.name": { $regex: search, $options: 'i' } },
        ]
    } : {};

    query.branch_id = user_id;

    const records = {};
    const selectValues = "reqNo product quotedPrice createdAt expectedProcurementDate deliveryDate address";

    records.rows = paginate == 1 ? await RequestModel.find(query).select(selectValues)
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit)) : await RequestModel.find(query).select(selectValues).sort(sortBy);

    records.count = records.rows.length;

    if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("requirement") }));

})


module.exports.getBatchByReq = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, paginate = 1, sortBy, search = '', req_id } = req.query;


    let query = search ? {
        $or: [
            { "batchId": { $regex: search, $options: 'i' } },
            { "seller_id.basic_details.associate_details.associate_name": { $regex: search, $options: 'i' } },
            { "procurementCenter_id.center_name": { $regex: search, $options: "i" } },
            { "req_id.address.deliveryLocation": { $regex: search, $options: "i" } },
        ]
    } : {};

    query.req_id = req_id;

    const records = {};

    records.rows = paginate == 1 ? await Batch.find(query)
        .populate([
            { path: "seller_id", select: "basic_details.associate_details.associate_name" },
            { path: "req_id", select: "address.deliveryLocation" },
            { path: "procurementCenter_id", select: "center_name" },
        ])
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit)) : await Batch.find(query).sort(sortBy);

    records.count = records.rows.length;

    if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("requirement") }));

})


module.exports.uploadRecevingStatus = asyncErrorHandler(async (req, res) => {

    const { id, proof_of_delivery, weigh_bridge_slip, receiving_copy, truck_photo, loaded_vehicle_weight, tare_weight, net_weight, material_image = [], weight_slip = [], qc_report = [], data, paymentIsApprove = 0 } = req.body;
    const { user_id, userType } = req;

    const record = await Batch.findOne({ _id: id }).populate("req_id");

    if (!record) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }));
    }

    if (qc_report.length > 0 && material_image.length > 0 && data) {
        record.dispatched.qc_report.received.push(...qc_report.map(i => { return { img: i, on: moment() } }));
        record.dispatched.qc_report.received_qc_status = received_qc_status.rejected;
        record.reason = { text: data, on: moment() }
    } else if (qc_report.length > 0 && material_image.length > 0) {
        record.dispatched.qc_report.received.push(...qc_report.map(i => { return { img: i, on: moment() } }));
        record.dispatched.qc_report.received_qc_status = received_qc_status.accepted;
    } else if (material_image.length > 0) {
        record.dispatched.material_img.received.push(...material_image.map(i => { return { img: i, on: moment() } }))
    } else if (weight_slip.length > 0) {
        record.dispatched.weight_slip.received.push(...weight_slip.map(i => { return { img: i, on: moment() } }))
    } else if (qc_report.length > 0) {
        record.dispatched.qc_report.received.push(...qc_report.map(i => { return { img: i, on: moment() } }));
        record.dispatched.qc_report.received_qc_status = received_qc_status.accepted;

        const { farmerOrderIds } = record;

        const paymentRecords = [];

        const request = await RequestModel.findOne({ _id: record?.req_id });

        for (let farmer of farmerOrderIds) {

            const farmerData = await FarmerOrders.findOne({ _id: farmer.farmerOrder_id });

            const paymentData = { batch_id: record?._id, payment_collect_by: "Farmer", whomToPay: farmerData.farmer_id, userType, user_id, qtyProcured: farmer.qty, reqNo: request.reqNo, req_id: request._id, commodity: record.req_id.product.name, amount: farmer.amt, date: new Date(), method: _paymentmethod.bank_transfer }

            paymentRecords.push(paymentData);
        }

        await Payment.insertMany(paymentRecords);

    } else if (proof_of_delivery && weigh_bridge_slip && receiving_copy && truck_photo && loaded_vehicle_weight && tare_weight && net_weight) {

        if (!record.dispatched) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "please dispatched it !!" }] }));
        }

        if (!record.intransit) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "please intransit it !!" }] }));
        }
        record.delivered.proof_of_delivery = proof_of_delivery;
        record.delivered.weigh_bridge_slip = weigh_bridge_slip;
        record.delivered.receiving_copy = receiving_copy;
        record.delivered.truck_photo = truck_photo;
        record.delivered.loaded_vehicle_weight = loaded_vehicle_weight;
        record.delivered.tare_weight = tare_weight;
        record.delivered.net_weight = net_weight;
        record.delivered.delivered_at = new Date();
        record.delivered.delivered_by = user_id;

        record.status = _batchStatus.delivered;

    } else if (paymentIsApprove == 1 && record.dispatched.qc_report.received.length > 0 && record.dispatched.qc_report.received_qc_status == received_qc_status.accepted) {
        record.payement_approval_at = new Date();
        record.payment_approve_by = user_id;
    }
    else {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require("field") }] }));
    }

    await record.save();

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.updated("Batch") }));

})


module.exports.getBatch = asyncErrorHandler(async (req, res) => {

    const { id } = req.params;

    let record = await Batch.findOne({ _id: id }).populate("req_id");

    if (!record) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }));
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Batch") }));
})

module.exports.getFarmerByBatchId = asyncErrorHandler(async (req, res) => {


    const { id } = req.params;

    const record = await Batch.findOne({ _id: id }).populate({ path: "farmerOrderIds.farmerOrder_id", select: "metaData.name order_no" });

    if (!record) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }))
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Farmer") }));

})


module.exports.auditTrail = asyncErrorHandler(async (req, res) => {

    const { id } = req.query;

    const record = await Batch.findOne({ _id: id });

    if (!record) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }))
    }

    const { dispatched, intransit, delivered, createdAt, payment_at, payement_approval_at } = record;

    const steps = [
        {
            name: "Batch Created",
            status: record ? "completed" : "pending",
            date: record ? createdAt : null,
        },
        {
            name: "Mark Dispatched",
            status: dispatched ? "completed" : "pending",
            date: dispatched.dispatched_at ? dispatched.dispatched_at : null,
        },
        {
            name: "In Transit",
            status: intransit ? "completed" : "pending",
            date: intransit.intransit_at ? intransit.intransit_at : null,
        },
        {
            name: "Delivery Date",
            status: delivered ? "completed" : "pending",
            date: delivered.delivered_at ? delivered.delivered_at : null,
        },
        {
            name: "Final QC Check",
            status: dispatched.qc_report.received_qc_status == received_qc_status.accepted ? "completed" : dispatched.qc_report.received_qc_status == received_qc_status.rejected ? "rejected" : "pending",
            date: dispatched.qc_report.received.on ? dispatched.qc_report.received.on : null
        },
        {
            name: "Payment Approval Date",
            status: payement_approval_at ? "completed" : "pending",
            date: payement_approval_at ? payement_approval_at : null,
        },
        {
            name: "Payment Paid",
            status: payment_at ? "completed" : "pending",
            date: payment_at ? payment_at : null,
        },
    ];


    return res.status(200).send(new serviceResponse({ status: 200, data: steps, message: _response_message.found("audit trail") }))

})