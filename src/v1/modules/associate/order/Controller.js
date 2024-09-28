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

        const { req_id, truck_capacity, farmerData = [] } = req.body;
        const { user_id } = req;

        const record = await AssociateOffers.findOne({ seller_id: user_id, req_id: req_id });

        if (!record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }));
        }

        const sumOfQty = farmerData.reduce((acc, curr) => {
            acc = acc + curr.qty;
            return acc;
        }, 0);

        if (sumOfQty > truck_capacity) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "quantity should not exceeds truck capacity" }] }))
        }

        const farmerOrderIds = [];
        let partiallyFulfulled = 0

        for (let farmer of farmerData) {

            const farmerOrder = await FarmerOrders.findOne({ _id: farmer.farmerOrder_id });

            if (!farmerOrder) {
                return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("farmer order") }] }));
            }

            if (farmerOrder.status != _procuredStatus.received) {
                return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "farmer order should not be pending" }] }));
            }

            if (farmerOrder?.qtyProcured < farmer.qty) {
                return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "added quantity should not exceed quantity procured" }] }));
            }

            if ((farmerOrder?.qtyProcured - farmer.qty) != 0) {
                partiallyFulfulled = 1
            }

            farmerOrderIds.push(farmer.farmerOrder_id);
        }

        const procurementRecord = await RequestModel.findOne({ _id: req_id });

        if (!procurementRecord) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }))
        }

        const farmerRecords = await FarmerOrders.findOne({ status: { $ne: _procuredStatus.received }, associateOffers_id: record?._id, _id: { $in: farmerOrderIds } });

        if (farmerRecords) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.pending("contribution") }] }));
        }
        const farmerRecordsPending = await FarmerOrders.findOne({ status: { $ne: _procuredStatus.received }, associateOffers_id: record?._id, _id: { $nin: farmerOrderIds } });

        if (farmerRecordsPending || partiallyFulfulled == 1) {
            record.status = _associateOfferStatus.partially_ordered;
        } else {
            record.status = _associateOfferStatus.ordered;

        }

        let batchId;
        let isUnique = false;
        while (!isUnique) {
            batchId = _generateOrderNumber();
            const existingOrder = await Batch.findOne({ batchId: batchId });
            if (!existingOrder) {
                isUnique = true;
            }
        }

        await Batch.create({ seller_id: user_id, req_id, associateOffer_id: record._id, batchId, farmerOrderIds: farmerData })

        procurementRecord.associatOrder_id.push(record._id)
        await record.save();
        await procurementRecord.save()

        return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.created("batch") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.editTrackDelivery = async (req, res) => {

    try {

        const { form_type, id, material_img, weight_slip, qc_survey, gunny_bags, weighing_stiching, loading_unloading, transportation, driage, qc_report, lab_report, name, contact, license, aadhar, service_name, vehicleNo, vehicle_weight, loaded_weight, gst_number, pan_number, weight_slip: intransit_weight_slip, no_of_bags, weight, proof_of_delivery, weigh_bridge_slip, receiving_copy, truck_photo, loaded_vehicle_weight, tare_weight, net_weight, delivered_on } = req.body;

        const record = await Batch.findOne({ _id: id });

        if (!record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order") }] }))
        }

        switch (form_type) {
            case _batchStatus.mark_ready:

                if (material_img && weight_slip && qc_survey && gunny_bags && weighing_stiching && loading_unloading && transportation && driage && qc_report && lab_report) {
                    record.dispatched.material_img = material_img;
                    record.dispatched.weight_slip = weight_slip;
                    record.dispatched.dispatched_at = new Date();
                    record.dispatched.bills.qc_survey = qc_survey;
                    record.dispatched.bills.gunny_bags = gunny_bags;
                    record.dispatched.bills.weighing_stiching = weighing_stiching;
                    record.dispatched.bills.loading_unloading = loading_unloading;
                    record.dispatched.bills.transportation = transportation;
                    record.dispatched.bills.driage = driage;
                    record.dispatched.qc_report = qc_report;
                    record.dispatched.lab_report = lab_report;

                    record.status = _batchStatus.dispatched
                } else {
                    return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require("field") }] }));
                }
                break;

            case _batchStatus.intransit:

                if (name && contact && license && aadhar && service_name && vehicleNo && vehicle_weight && loaded_weight && gst_number && pan_number && intransit_weight_slip && no_of_bags && weight) {

                    record.intransit.driver.name = name;
                    record.intransit.driver.contact = contact;
                    record.intransit.driver.license = license;
                    record.intransit.driver.aadhar = aadhar;

                    record.intransit.transport.service_name = service_name;
                    record.intransit.transport.vehicleNo = vehicleNo;
                    record.intransit.transport.vehicle_weight = vehicle_weight;
                    record.intransit.transport.loaded_weight = loaded_weight;
                    record.intransit.transport.gst_number = gst_number;
                    record.intransit.transport.pan_number = pan_number;

                    record.intransit.weight_slip = intransit_weight_slip;
                    record.intransit.no_of_bags = no_of_bags;
                    record.intransit.weight = weight;
                    record.intransit.intransit_at = new Date();

                    record.status = _batchStatus.intransit;
                } else {
                    return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require("field") }] }));
                }

                break;

            case _batchStatus.delivered:
                if (proof_of_delivery && weigh_bridge_slip && receiving_copy && truck_photo && loaded_vehicle_weight && tare_weight && net_weight && delivered_on) {
                    record.delivered.proof_of_delivery = proof_of_delivery;
                    record.delivered.weigh_bridge_slip = weigh_bridge_slip;
                    record.delivered.receiving_copy = receiving_copy;
                    record.delivered.truck_photo = truck_photo;
                    record.delivered.details.loaded_vehicle_weight = loaded_vehicle_weight;
                    record.delivered.details.tare_weight = tare_weight;
                    record.delivered.details.net_weight = net_weight;
                    record.delivered.details.delivered_on = delivered_on;

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

        const { id } = req.params;

        const record = await Batch.findOne({ _id: id })
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