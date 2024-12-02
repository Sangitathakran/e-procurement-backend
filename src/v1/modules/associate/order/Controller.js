const { _handleCatchErrors, _generateOrderNumber, dumpJSONToExcel, handleDecimal } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { _associateOfferStatus, _procuredStatus, _batchStatus, _userType } = require('@src/v1/utils/constants');
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const moment = require("moment");
const { AssociateInvoice } = require("@src/v1/models/app/payment/associateInvoice");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const { User } = require("@src/v1/models/app/auth/User");



module.exports.batch = async (req, res) => {

    try {

        const { req_id, truck_capacity, farmerData = [] } = req.body;
        const { user_id } = req;

        //  procurement Request exist or not 
        const procurementRecord = await RequestModel.findOne({ _id: req_id });
        if (!procurementRecord) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }))
        }

        const record = await AssociateOffers.findOne({ seller_id: user_id, req_id: req_id });
        if (!record) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }));
        }

        const sumOfQty = farmerData.reduce((acc, curr) => {
            acc = acc + curr.qty;
            return acc;
        }, 0);

        // Apply handleDecimal to sumOfQty and truck_capacity if needed
        const sumOfQtyDecimal = handleDecimal(sumOfQty);
        const truckCapacityDecimal = handleDecimal(truck_capacity);

        if (sumOfQtyDecimal > truckCapacityDecimal) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "quantity should not exceed truck capacity" }] }))
        }

        //////////////// Start of Sangita code

        if (sumOfQtyDecimal > record.offeredQty) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Quantity should not exceed offered Qty." }] }))
        }

        const existBatch = await Batch.find({ seller_id: user_id, req_id, associateOffer_id: record._id });
        if (existBatch) {
            const addedQty = existBatch.reduce((sum, existBatch) => sum + existBatch.qty, 0);

            if (addedQty >= record.offeredQty) {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Cannot create more Batch, Offered qty already fulfilled." }] }))
            }
        }

        //////////////// End of Sangita code

        const farmerOrderIds = [];
        let partiallyFulfilled = 0;
        let procurementCenter_id;

        for (let farmer of farmerData) {

            const farmerOrder = await FarmerOrders.findOne({ _id: farmer.farmerOrder_id }).lean();

            // farmer order exist or not 
            if (!farmerOrder) {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("farmer order") }] }));
            }

            // order should be procured from these farmers 
            if (farmerOrder.status != _procuredStatus.received) {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "farmer order should not be pending" }] }));
            }

            // procurement Center should be same in current batch
            if (!procurementCenter_id) {
                procurementCenter_id = farmerOrder?.procurementCenter_id.toString();
            } else if (procurementCenter_id && procurementCenter_id != farmerOrder.procurementCenter_id.toString()) {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "procurement center should be the same for all the orders" }] }))
            }

            // qty should not exceed from qty procured 
            if (farmerOrder?.qtyProcured < farmer.qty) {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "added quantity should not exceed quantity procured" }] }));
            }
            // is the order full filled partially 
            if ((farmerOrder?.qtyProcured - farmer.qty) > 0) {
                partiallyFulfilled = 1;
            }

            // Apply handleDecimal to amt for each farmer
            farmer.amt = handleDecimal(farmer.qty * procurementRecord?.quotedPrice);
            farmerOrderIds.push(farmer.farmerOrder_id);

            // Update the quantity remaining
            await FarmerOrders.updateOne(
                { _id: farmer.farmerOrder_id },
                { $set: { qtyRemaining: farmerOrder.qtyProcured - farmer.qty } }
            );
        }

        // given farmer's order should be in received state
        const farmerRecords = await FarmerOrders.findOne({ status: { $ne: _procuredStatus.received }, associateOffers_id: record?._id, _id: { $in: farmerOrderIds } });
        if (farmerRecords)
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.pending("contribution") }] }));

        // update status based on fulfillment 
        const farmerRecordsPending = await FarmerOrders.findOne({ status: { $ne: _procuredStatus.received }, associateOffers_id: record?._id, _id: { $nin: farmerOrderIds } });
        record.status = (farmerRecordsPending || partiallyFulfilled == 1) ? _associateOfferStatus.partially_ordered : _associateOfferStatus.ordered;

        // create unique batch Number 
        let batchId, isUnique = false;
        while (!isUnique) {
            batchId = _generateOrderNumber();
            if (!(await Batch.findOne({ batchId: batchId }))) isUnique = true;
        }

        const batchCreated = await Batch.create({
            seller_id: user_id,
            req_id,
            associateOffer_id: record._id,
            batchId,
            farmerOrderIds: farmerData,
            procurementCenter_id,
            qty: handleDecimal(sumOfQtyDecimal),  // Apply handleDecimal here
            goodsPrice: handleDecimal(sumOfQtyDecimal * procurementRecord?.quotedPrice), // Apply handleDecimal here
            totalPrice: handleDecimal(sumOfQtyDecimal * procurementRecord?.quotedPrice) // Apply handleDecimal here
        });

        procurementRecord.associatOrder_id.push(record._id);
        await record.save();
        await procurementRecord.save();

        const users = await User.find({
            'basic_details.associate_details.email': { $exists: true }
        }).select('basic_details.associate_details.email basic_details.associate_details.associate_name');

        await Promise.all(
            users.map(({ basic_details: { associate_details } }) => {
                const { email, associate_name } = associate_details;
                return emailService.sendCreateBatchEmail(email, associate_name);
            })
        );

        return res.status(200).send(new serviceResponse({ status: 200, data: batchCreated, message: _response_message.created("batch") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};



module.exports.editTrackDelivery = async (req, res) => {

    try {

        const { form_type, id, material_img = [], weight_slip = [], procurementExp, qc_survey, gunny_bags, weighing_stiching, loading_unloading, transportation, driage, storageExp,  qc_report = [], lab_report = [], name, contact, license, aadhar, licenseImg, service_name, vehicleNo, vehicle_weight, loaded_weight, gst_number, pan_number, intransit_weight_slip, no_of_bags, weight } = req.body;
        const { user_id } = req

        const record = await Batch.findOne({ _id: id });

        if (!record) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order") }] }))
        }

        switch (form_type) {
            case _batchStatus.mark_ready:
                if (record.status != _batchStatus.pending) {
                    return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Your batch is already mark ready " }] }));
                }

                if (material_img && weight_slip && procurementExp && qc_survey && gunny_bags && weighing_stiching && loading_unloading && transportation && driage && storageExp  && qc_report && lab_report) {
                    // const RateOfProcurement = 840.00;
                    // const RateOfDriage = 100.00;
                    const RateOfStorage = 160.00;
                    const RateOfProcurement = 890.00;
                    const RateOfDriage = 200.00;

                    const sumOfqty = record.farmerOrderIds.reduce((accumulator, currentValue) => accumulator + handleDecimal(currentValue.qty), 0);

                    if (handleDecimal(procurementExp) > (sumOfqty * RateOfProcurement)) {
                        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: `Procurement Expenses should be less than ${(sumOfqty * RateOfProcurement)}` }] }));
                    } else if (handleDecimal(driage) > (sumOfqty * RateOfDriage)) {
                        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: `Driage Expenses should be less than ${(sumOfqty * RateOfDriage)}` }] }));
                    } else if (handleDecimal(storageExp) > (sumOfqty * RateOfStorage)) {
                        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: `Storage Expenses should be less than ${(sumOfqty * RateOfStorage)}` }] }));
                    }

                    record.dispatched.material_img.inital.push(...material_img.map(i => { return { img: i, on: moment() } }));
                    record.dispatched.weight_slip.inital.push(...weight_slip.map(i => { return { img: i, on: moment() } }));
                    record.dispatched.bills.procurementExp = handleDecimal(procurementExp);
                    record.dispatched.bills.qc_survey = qc_survey;
                    record.dispatched.bills.gunny_bags = gunny_bags;
                    record.dispatched.bills.weighing_stiching = weighing_stiching;
                    record.dispatched.bills.loading_unloading = loading_unloading;
                    record.dispatched.bills.transportation = transportation;
                    record.dispatched.bills.driage = handleDecimal(driage);
                    record.dispatched.bills.storageExp = handleDecimal(storageExp);
                    record.dispatched.bills.commission = handleDecimal((handleDecimal(procurementExp) + handleDecimal(driage) + handleDecimal(storageExp)) * 0.005);
                    record.dispatched.bills.total = handleDecimal(handleDecimal(procurementExp) + handleDecimal(driage) + handleDecimal(storageExp) + handleDecimal((handleDecimal(procurementExp) + handleDecimal(driage) + handleDecimal(storageExp)) * 0.005));
                    record.dispatched.qc_report.inital.push(...qc_report.map(i => { return { img: i, on: moment() } }));
                    record.dispatched.lab_report.inital.push(...lab_report.map(i => { return { img: i, on: moment() } }));
                    record.dispatched.dispatched_at = new Date();
                    record.dispatched.dispatched_by = user_id;

                    record.status = _batchStatus.mark_ready;
                } else {
                    return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require("field") }] }));
                }
                break;

            case _batchStatus.intransit:

                if (record.status != _batchStatus.mark_ready) {
                    return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "your batch should be Mark Ready" }] }));
                }

                if (name && contact && license && aadhar && licenseImg && service_name && vehicleNo && vehicle_weight && loaded_weight && gst_number && pan_number && intransit_weight_slip && no_of_bags && weight) {

                    const reqRec = await RequestModel.findOne({ _id: record?.req_id });
                    record.intransit.driver.name = name;
                    record.intransit.driver.contact = contact;
                    record.intransit.driver.license = license;
                    record.intransit.driver.aadhar = aadhar;

                    record.intransit.licenseImg = licenseImg;
                    record.intransit.transport.service_name = service_name;
                    record.intransit.transport.vehicleNo = vehicleNo;
                    record.intransit.transport.vehicle_weight = handleDecimal(vehicle_weight);
                    record.intransit.transport.loaded_weight = handleDecimal(loaded_weight);
                    record.intransit.transport.gst_number = gst_number;
                    record.intransit.transport.pan_number = pan_number;

                    record.intransit.weight_slip = intransit_weight_slip;
                    record.intransit.no_of_bags = no_of_bags;
                    record.intransit.weight = handleDecimal(weight);
                    record.intransit.intransit_at = new Date();
                    record.intransit.intransit_by = user_id;

                    record.status = _batchStatus.intransit;

                    const associateInvoice = await AssociateInvoice.findOne({ batch_id: record?._id });
                    if (reqRec && !associateInvoice) {
                        await AssociateInvoice.create({
                            req_id: reqRec?._id,
                            ho_id: reqRec?.head_office_id,
                            bo_id: reqRec?.branch_id,
                            associate_id: user_id,
                            batch_id: record?._id,
                            qtyProcured: record.farmerOrderIds.reduce((accumulator, currentValue) => accumulator + handleDecimal(currentValue.qty), 0),
                            goodsPrice: record.farmerOrderIds.reduce((accumulator, currentValue) => accumulator + handleDecimal(currentValue.qty), 0),
                            initiated_at: new Date(),
                            bills: record?.dispatched?.bills,
                            associateOffer_id: record?.associateOffer_id,

                        });
                    }

                    const associate_id = record.seller_id;
                    const associateData = await User.findOne({ _id: associate_id });

                    const emailPayloadData = {
                        batch_id: record.batchId,
                        order_no: reqRec.reqNo,
                        driver_name: record.intransit.driver.name,
                        driver_phone: record.intransit.driver.contact,
                        transport_service: record.intransit.transport.service_name,
                        vehicle_no: record.intransit.transport.vehicleNo = vehicleNo,
                        email: associateData.basic_details.associate_details.email,
                        associate_name: associateData.basic_details.associate_details.associate_name
                    }

                    await emailService.sendTrackDeliveryInTransitEmail(emailPayloadData);
                } else {
                    return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require("field") }] }));
                }

                break;

            default:

                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "enter correct form_type" }] }));
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
        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query

        let query = {
            req_id,
            ...(search ? { name: { $regex: search, $options: "i" } } : {})
        };

        const records = { count: 0 };
        records.rows = paginate == 1 ? await Batch.find(query).populate([
            { path: 'req_id', select: 'product address' },
            { path: 'associateOffer_id', select: 'offeredQty procuredQty' },
            { path: "procurementCenter_id", select: "center_name" },
        ])
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await Batch.find(query).sort(sortBy);

        records.count = await Batch.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {
                return {
                    "Batch ID": item?.batchId || 'NA',
                    "Quantity": item?.qty || 'NA',
                    "Dispatched On": item?.dispatched.dispatched_at || 'NA',
                    "Delivered On": item?.delivered.delivered_at || "NA",
                    "Procurement Center": item?.procurementCenter_id.center_name || "NA",
                    "Status": item?.status || "NA",
                }
            })

            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Batch-${'Batch'}.xlsx`,
                    worksheetName: `Batch-record-${'Batch'}`
                });

            } else {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Track Order") }] }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Track order") }));
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.trackDeliveryByBatchId = async (req, res) => {

    try {

        const { id } = req.params;
        console.log('check trandsitt', id)
        const record = await Batch.findOne({ _id: id })
            .select({ dispatched: 1, intransit: 1, status: 1, delivered: 1 })
            .populate({
                path: 'req_id', select: 'product address'
            });

        if (!record) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Track order") }] }))
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Track order") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}
