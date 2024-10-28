const { _handleCatchErrors, _generateOrderNumber } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { _associateOfferStatus, _procuredStatus, _batchStatus, _userType } = require('@src/v1/utils/constants');
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const moment = require("moment")


module.exports.batch = async (req, res) => {

    try {

        const { req_id, truck_capacity, farmerData = [] } = req.body;
        const { user_id } = req;

        //  procurement Request exist or not 
        const procurementRecord = await RequestModel.findOne({ _id: req_id });
        if (!procurementRecord) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }))
        }

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
        let procurementCenter_id;

        for (let farmer of farmerData) {

            const farmerOrder = await FarmerOrders.findOne({ _id: farmer.farmerOrder_id }).lean();

            // farmer order exist or not 
            if (!farmerOrder) {
                return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("farmer order") }] }));
            }

            // order should be procured from these farmers 
            if (farmerOrder.status != _procuredStatus.received) {
                return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "farmer order should not be pending" }] }));
            }

            // procurement Center should be same in current batch
            if (!procurementCenter_id) {
                procurementCenter_id = farmerOrder?.procurementCenter_id.toString();
            } else if (procurementCenter_id && procurementCenter_id != farmerOrder.procurementCenter_id.toString()) {
                return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "procurement center should be same for all the orders" }] }))
            }

            //qty should not exceed from qty procured 
            if (farmerOrder?.qtyProcured < farmer.qty) {
                return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "added quantity should not exceed quantity procured" }] }));
            }
            // is the order full fill partially 
            if ((farmerOrder?.qtyProcured - farmer.qty) != 0) {
                partiallyFulfulled = 1
            }
            farmer.amt = (farmer.qty * procurementRecord?.quotedPrice)
            farmerOrderIds.push(farmer.farmerOrder_id);
        }

        // given farmer's order should be in in received state
        const farmerRecords = await FarmerOrders.findOne({ status: { $ne: _procuredStatus.received }, associateOffers_id: record?._id, _id: { $in: farmerOrderIds } });
        if (farmerRecords)
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.pending("contribution") }] }));


        // update status based on fullfilment 
        const farmerRecordsPending = await FarmerOrders.findOne({ status: { $ne: _procuredStatus.received }, associateOffers_id: record?._id, _id: { $nin: farmerOrderIds } });
        record.status = (farmerRecordsPending || partiallyFulfulled == 1) ? _associateOfferStatus.partially_ordered : _associateOfferStatus.ordered

        //create unique batch Number 
        let batchId, isUnique = false;
        while (!isUnique) {
            batchId = _generateOrderNumber();
            if (!(await Batch.findOne({ batchId: batchId }))) isUnique = true;
        }

        const batchCreated = await Batch.create({ seller_id: user_id, req_id, associateOffer_id: record._id, batchId, farmerOrderIds: farmerData, procurementCenter_id, qty: sumOfQty, goodsPrice: (sumOfQty * procurementRecord?.quotedPrice), totalPrice: (sumOfQty * procurementRecord?.quotedPrice) })

        procurementRecord.associatOrder_id.push(record._id)
        await record.save();
        await procurementRecord.save()

        return res.status(200).send(new serviceResponse({ status: 200, data: batchCreated, message: _response_message.created("batch") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.editTrackDelivery = async (req, res) => {

    try {

        const { form_type, id, material_img = [], weight_slip = [], procurementExp, qc_survey, gunny_bags, weighing_stiching, loading_unloading, transportation, driage, storageExp, commission, qc_report = [], lab_report = [], name, contact, license, aadhar, licenseImg, service_name, vehicleNo, vehicle_weight, loaded_weight, gst_number, pan_number, intransit_weight_slip, no_of_bags, weight } = req.body;
        const { user_id } = req

        const record = await Batch.findOne({ _id: id });

        if (!record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order") }] }))
        }

        switch (form_type) {
            case _batchStatus.mark_ready:
                if (record.status != _batchStatus.pending) {
                    return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "Your batch is already mark ready " }] }));
                }

                if (material_img && weight_slip && procurementExp && qc_survey && gunny_bags && weighing_stiching && loading_unloading && transportation && driage && storageExp && commission && qc_report && lab_report) {
                    const RateOfProcurement = 840.00
                    const RateOfDriage = 100.00
                    const RateOfStorage = 160.00

                    const sumOfqty = record.farmerOrderIds.reduce((accumulator, currentValue) => accumulator + parseFloat(currentValue.qty),
                        0)

                    if (parseFloat(procurementExp) > (sumOfqty * RateOfProcurement)) {
                        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: `Procurement Expenses should be less that ${(sumOfqty * RateOfProcurement)}` }] }));
                    } else if (parseFloat(driage) > (sumOfqty * RateOfDriage)) {
                        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: `Driage Expenses should be less that ${(sumOfqty * RateOfDriage)}` }] }));
                    } else if (parseFloat(storageExp) > (sumOfqty * RateOfStorage)) {
                        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: `Storage Expenses should be less that ${(sumOfqty * RateOfStorage)}` }] }));
                    }

                    record.dispatched.material_img.inital.push(...material_img.map(i => { return { img: i, on: moment() } }));
                    record.dispatched.weight_slip.inital.push(...weight_slip.map(i => { return { img: i, on: moment() } }));
                    record.dispatched.bills.procurementExp = procurementExp;
                    record.dispatched.bills.qc_survey = qc_survey;
                    record.dispatched.bills.gunny_bags = gunny_bags;
                    record.dispatched.bills.weighing_stiching = weighing_stiching;
                    record.dispatched.bills.loading_unloading = loading_unloading;
                    record.dispatched.bills.transportation = transportation;
                    record.dispatched.bills.driage = driage;
                    record.dispatched.bills.storageExp = storageExp;
                    record.dispatched.bills.commission = commission;
                    record.dispatched.bills.total = parseInt(procurementExp) + parseInt(driage) + parseInt(storageExp) + parseInt(commission);
                    record.dispatched.qc_report.inital.push(...qc_report.map(i => { return { img: i, on: moment() } }));
                    record.dispatched.lab_report.inital.push(...lab_report.map(i => { return { img: i, on: moment() } }));
                    record.dispatched.dispatched_at = new Date();
                    record.dispatched.dispatched_by = user_id;

                    record.status = _batchStatus.mark_ready
                } else {
                    return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require("field") }] }));
                }
                break;

            case _batchStatus.intransit:

                if (record.status != _batchStatus.mark_ready) {
                    return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "your batch should be Mark Ready" }] }));
                }

                if (name && contact && license && aadhar && licenseImg && service_name && vehicleNo && vehicle_weight && loaded_weight && gst_number && pan_number && intransit_weight_slip && no_of_bags && weight) {

                    record.intransit.driver.name = name;
                    record.intransit.driver.contact = contact;
                    record.intransit.driver.license = license;
                    record.intransit.driver.aadhar = aadhar;

                    record.intransit.licenseImg = licenseImg;
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
                    record.intransit.intransit_by = user_id;

                    record.status = _batchStatus.intransit;
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
            .select({ dispatched: 1, intransit: 1, status: 1, delivered: 1 })
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
