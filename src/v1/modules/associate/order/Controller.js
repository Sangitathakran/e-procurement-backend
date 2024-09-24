const { _handleCatchErrors, _generateOrderNumber } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { _associateOfferStatus, _procuredStatus, _batchStatus, _userType } = require('@src/v1/utils/constants');
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");


module.exports.batch = async (req, res) => {

    try {

        const { req_id } = req.body;
        const { user_id } = req;

        const procurementRecord = await RequestModel.findOne({ _id: req_id });

        if (!procurementRecord) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }))
        }

        const record = await AssociateOffers.findOne({ seller_id: user_id, req_id: req_id });

        if (!record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }));
        }

        const farmerRecords = await FarmerOrders.findOne({ status: { $ne: _procuredStatus.received }, associateOffers_id: record?._id });

        if (farmerRecords) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.pending("contribution") }] }));
        }

        const receivedRecords = await FarmerOrders.find({ status: _procuredStatus.received, associateOffers_id: record?._id });

        if (receivedRecords.length == 0) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound() }] }));
        }

        const total_qty_procured = receivedRecords.reduce((acc, cur) => acc += cur.qtyProcured, 0)
        if (total_qty_procured > record.offeredQty) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid("Quantity procured") }] }));
        }
        const myMap = new Map();
        const payment = [];

        for (let ele of receivedRecords) {
            if (myMap.has(ele.procurementCenter_id)) {
                const currElement = myMap.get(ele.procurementCenter_id);
                currElement.dispatchedqty += ele.qtyProcured;
            } else {
                let batchId;
                let isUnique = false;

                while (!isUnique) {
                    batchId = _generateOrderNumber();
                    const existingOrder = await Batch.findOne({ batchId: batchId });
                    if (!existingOrder) {
                        isUnique = true;
                    }
                }
                myMap.set(ele.procurementCenter_id, { req_id: req_id, batchId, seller_id: user_id, associateOffer_id: record._id, dispatchedqty: ele.qtyProcured });
            }

            payment.push({ whomToPay: ele.farmer_id, user_type: _userType.farmer, user_id: user_id, qtyProcured: ele.offeredQty, req_id: req_id, reqNo: procurementRecord?.reqNo, commodity: procurementRecord?.product?.name, amount: 0 });

        }

        const associateRecords = await Batch.insertMany([...myMap.values()]);

        await Payment.insertMany(payment);

        record.status = _associateOfferStatus.ordered;
        procurementRecord.associatOrder_id.push(record._id)
        await record.save();
        await procurementRecord.save()

        return res.status(200).send(new serviceResponse({ status: 200, data: associateRecords, message: _response_message.created("batch") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.editTrackDelivery = async (req, res) => {

    try {

        const { form_type, id, material_img, weight_slip, qc_report, lab_report, name, contact, license, aadhar, service_name, vehicleNo, vehicle_weight, loaded_weight, qc_charges, no_of_bags, qty, delivered } = req.body;

        const record = await Batch.findOne({ _id: id });

        if (!record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order") }] }))
        }

        switch (form_type) {
            case _batchStatus.dispatched:

                if (material_img && weight_slip && qc_report && lab_report) {
                    record.dispatched.material_img = material_img;
                    record.dispatched.weight_slip = weight_slip;
                    record.dispatched.qc_report = qc_report;
                    record.dispatched.lab_report = lab_report;
                    record.dispatched.dispatched_at = new Date();

                    record.status = _batchStatus.dispatched
                } else {
                    return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require("field") }] }));
                }
                break;

            case _batchStatus.intransit:

                if (name && contact && license && aadhar && service_name && vehicleNo && vehicle_weight && loaded_weight && qc_charges && no_of_bags && qty) {

                    record.intransit.driver.name = name;
                    record.intransit.driver.contact = contact;
                    record.intransit.driver.license = license;
                    record.intransit.driver.aadhar = aadhar;
                    record.intransit.transport.service_name = service_name;
                    record.intransit.transport.vehicleNo = vehicleNo;
                    record.intransit.transport.vehicle_weight = vehicle_weight;
                    record.intransit.transport.loaded_weight = loaded_weight;
                    record.intransit.bill.qc_charges = qc_charges;
                    record.intransit.no_of_bags = no_of_bags;
                    record.intransit.qty = qty;
                    record.intransit.intransit_at = new Date();

                    record.status = _batchStatus.intransit;
                } else {
                    return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require("field") }] }));
                }

                break;

            case _batchStatus.delivered:
                if (delivered) {
                    record.delivered = delivered;
                    record.delivered_at = new Date();
                    record.status = _batchStatus.delivered;
                } else {
                    return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require("field") }] }));
                }
                break;

            default:

                return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "enter correct form_type" }] }));
                break;
        }

        await record.save();
        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.updated("batch") }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.viewTrackDelivery = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id } = req.query

        let query = {
            req_id,
            ...(search ? { name: { $regex: search, $options: "i" } } : {})
        };
        const records = { count: 0 };
        records.rows = paginate == 1 ? await Batch.find(query).populate({
            path: 'req_id', select: 'product address',
            path: 'associateOffer_id', select: 'offeredQty procuredQty',
            path: 'procurementCenter_id', select: 'point_of_contact address'
        })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await Batch.find(query).sort(sortBy);

        records.count = await Batch.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Track order") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.trackDeliveryByBatchId = async (req, res) => {

    try {

        const { batchId } = req.query;

        const record = await Batch.findOne({ batchId })
            .select({ dispatched: 1, intransit: 1, status: 1 })
            .populate({
                path: 'req_id', select: 'product address'
            });

        if (!record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Track order") }] }))
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Track order") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}