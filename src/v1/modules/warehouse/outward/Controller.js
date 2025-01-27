const mongoose = require('mongoose');
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message, _middleware, _auth_module } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { sendMail } = require("@src/v1/utils/helpers/node_mailer");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { decryptJwtToken } = require('@src/v1/utils/helpers/jwt');
const { BatchOrderProcess } = require('@src/v1/models/app/distiller/batchOrderProcess');
const { PurchaseOrderModel } = require('@src/v1/models/app/distiller/purchaseOrder');
const { TrackOrder } = require('@src/v1/models/app/warehouse/TrackOrder');
const { batch } = require('../../associate/order/Controller');
const { _trackOrderStatus } = require('@src/v1/utils/constants');
const { Truck } = require('@src/v1/models/app/warehouse/Truck');




//order-list 
module.exports.orderList = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
    const { user_id } = req;
    //warehouseId

    let query = {
        // 'paymentInfo.advancePaymentStatus': _poAdvancePaymentStatus.paid,
        //   warehouseId: new mongoose.Types.ObjectId(user_id),
        ...(search ? { orderId: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
    };

    let records = { count: 0 };

    records.rows = paginate == 1 ? await PurchaseOrderModel.find(query).select('product.name purchasedOrder.poQuantity purchasedOrder.poNo createdAt')
        .sort(sortBy)
        .skip(skip)
        .populate({ path: "distiller_id", select: "basic_details.distiller_details.organization_name " })
        // .populate({ path: "branch_id", select: "_id branchName branchId" })
        .limit(parseInt(limit)) : await PurchaseOrderModel.find(query).sort(sortBy);

    records.rows = await Promise.all(
        records.rows.map(async (item) => {
            console.log(item._id)
            let batchOrderProcess = await BatchOrderProcess.findOne({
                warehouseOwnerId: user_id,
                orderId: item._id,
            }).select('warehouseId orderId');

            return batchOrderProcess ? item : null; // Return the item if found, otherwise null
        })
    );
    // Filter out null values
    records.rows = records.rows.filter((item) => item !== null);
    records.count = records.rows.length;

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

});

module.exports.getPuchaseList = asyncErrorHandler(async (req, res) => {
    try {

        const { page = 1, limit = 10, sortBy, search = '', filters = {}, order_id } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const { user_id } = req;
        if (!order_id) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("orderId") }] }));
        }

        let query = {
            orderId: new mongoose.Types.ObjectId(order_id),
            warehouseOwnerId: new mongoose.Types.ObjectId(user_id),//user_id
            ...(search ? { purchaseId: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null }) // Search functionality
        };

        const aggregationPipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'warehousedetails',
                    localField: 'warehouseId',
                    foreignField: '_id',
                    as: 'warehouseDetails'
                }
            },
            {
                $unwind: {
                    path: '$warehouseDetails',
                    preserveNullAndEmptyArrays: true
                }
            },

            {
                $lookup: {
                    from: 'distillers',
                    localField: 'distiller_id',
                    foreignField: '_id',
                    as: 'distellerDetails',
                },
            },
            { $unwind: { path: "$distellerDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "purchaseorders", // Adjust this to your actual collection name for branches
                    localField: "orderId",
                    foreignField: "_id",
                    as: "OrderDetails"
                }
            },
            { $unwind: { path: "$OrderDetails", preserveNullAndEmptyArrays: true } },

            {
                $project: {
                    purchaseId: '$purchaseId',
                    quantityRequired: 1,
                    amount: '$payment.amount',
                    warehouseDetails: "$warehouseDetails.basicDetails",
                    wareHouse_code: "$warehouseDetails.wareHouse_code",
                    scheduledPickupDate: 1,
                    actualPickupDate: 1,
                    OrderDetails: "$OrderDetails.product",
                    distellerDetails: "$distellerDetails.basic_details.distiller_details",
                    pickupLocation: '$warehouseDetails.addressDetails',
                    deliveryLocation: '$OrderDetails.deliveryLocation',
                    paymentStatus: '$payment.status',
                    status: 1,
                    createdAt: 1,
                    penaltyStatus: '$penaltyDetails.penaltypaymentStatus'
                }
            },
            { $sort: { [sortBy || 'createdAt']: 1 } },
            { $skip: skip },
            { $limit: parseInt(limit, 10) }
        ];

        const records = { count: 0, rows: [] };
        records.rows = await BatchOrderProcess.aggregate(aggregationPipeline);

        const countAggregation = [
            { $match: query },
            { $count: 'total' }
        ];
        const countResult = await BatchOrderProcess.aggregate(countAggregation);
        records.count = countResult.length > 0 ? countResult[0].total : 0;

        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;

        if (!records) {
            return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Purchase") }));
        } else {
            return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Purchase") }));
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
});

module.exports.getPurchaseOrderById = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
    }

    const record = await BatchOrderProcess.findOne({ orderId: id }).select('purchaseId')
        .populate({ path: 'distiller_id', select: 'basic_details' })
        .populate({ path: 'orderId', select: '' })
        .populate({ path: 'warehouseId', select: 'basicDetails wareHouse_code addressDetails' });

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("purchase order") }] }))
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("purchase order") }))
})



module.exports.readyToShip = asyncErrorHandler(async (req, res) => {

    const { batches = [], purchaseOrder_id } = req.body;


    if (batches.length == 0 || !purchaseOrder_id) {
        return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _middleware.require("ready-to-ship fields") }] }))
    }

    const record = await TrackOrder.findOne({ purchaseOrder_id });

    if (record) {
        return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _auth_module.allReadyExist("track") }] }))
    }

    for (let batch of batches) {

        const batchRecord = await Batch.findOne({ _id: batch.associate_batch_id });

        if (!batchRecord) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.notFound("Batch") }] }));
        }

        if (batch.qtyAllotment > batch.availableQty.count) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: "Qty Allotment should not exceeds Available Qty of batches" }] }))
        }

        if (batch.qtyAllotment == 0) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: "Qty Allotment should be greater then zero" }] }))
        }

        if (batchRecord.available_qty == 0 && batchRecord.allotedQty == 0) {
            batchRecord.available_qty = batchRecord.qty;
        }

        batchRecord.allotedQty += batch.qtyAllotment;
        batchRecord.available_qty -= batch.qtyAllotment;

        await batchRecord.save();
    }


    const trackRecord = await TrackOrder.create({
        // batch_id,
        purchaseOrder_id,
        ready_to_ship: {
            pickup_batch: batches,
            marked_ready: true,
            status: `${batches.length} Batches`
        },
        status: _trackOrderStatus.readyToShip,
    })

    return res.status(200).send(new serviceResponse({ status: 200, data: trackRecord, message: _response_message.created("track") }))


})


module.exports.inTransit = asyncErrorHandler(async (req, res) => {

    const { trackOrder_id, batches = [], truck_capacity, logistics_company, tracking_id, tracking_link, name, contact, aadhar_number, license_number, license_img, loaded_vehicle_weight, vehicle_weight, vehicle_number, vehicle_img } = req.body;

    if (!truck_capacity || !logistics_company || !tracking_id || !tracking_link || !name || !contact || !aadhar_number || !license_number || !license_img || !loaded_vehicle_weight || !vehicle_weight || !vehicle_number || !vehicle_img) {
        return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _middleware.require("in-transit fields") }] }));
    }

    const trackOrderRecord = await TrackOrder.findOne({ _id: trackOrder_id }).populate([
        { path: "purchaseOrder_id", select: { "quantityRequired": 1 } }
    ])

    if (!trackOrderRecord) {
        return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.notFound("track order") }] }))
    }

    let totalQtyOfBatches = 0;

    for (let batch of batches) {

        if (batch.no_of_bags > batch.noOfBagsAlloted) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: "no of bags should not exceeds No. of Bags Alloted" }] }));
        }


        const perBagUnit = Math.floor(batch.allotedQty.count / batch.noOfBagsAlloted);

        const qtyOfEachBag = batch.no_of_bags * perBagUnit;

        totalQtyOfBatches += qtyOfEachBag;
        // const batchRecord = await TrackOrder.findOne({ "ready_to_ship.pickup_batch.associate_batch_id" : batch.associate_batch_id }); 

        // const batchIndex = batchRecord.ready_to_ship.pickup_batch.findIndex(
        //     (b) => b.associate_batch_id.toString() === batch.associate_batch_id.toString()
        // );

        // if (batchIndex === -1) {
        //     return res.status(404).send(
        //         new serviceResponse({
        //             status: 404,
        //             errors: [{ message: "Batch not found in pickup_batch" }],
        //         })
        //     );
        // }

        // batchRecord.ready_to_ship.pickup_batch[batchIndex].no_of_bags -= batch.no_of_bags;

        // // Save the updated batch record
        // await batchRecord.save();
        await TrackOrder.updateOne(
            {
                "ready_to_ship.pickup_batch.associate_batch_id": batch.associate_batch_id,
            },
            {
                $inc: {
                    "ready_to_ship.pickup_batch.$.no_of_bags": -batch.no_of_bags,
                },
            }
        );



    }


    console.log("totalQtyOfBatches", totalQtyOfBatches);
    console.log("truckCapacity ", truck_capacity);

    if (totalQtyOfBatches > truck_capacity) {
        return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: "total quantity exceeds truck capacity" }] }));
    }

    if (totalQtyOfBatches > trackOrderRecord?.purchaseOrder_id?.quantityRequired) {
        trackOrderRecord.in_transit.qtyFulfilled = true;
        await trackOrderRecord.save();
        return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: "required quantity already shipped!" }] }));

    }

    const logistics_details = {
        logistics_company,
        tracking_id,
        tracking_link,
    }

    const driver_details = {
        name,
        contact,
        aadhar_number,
        license_number,
        license_img,
    }

    const vehicle_details = {
        loaded_vehicle_weight,
        vehicle_weight,
        vehicle_number,
        vehicle_img,
    }

    const truckRecord = await Truck.create({
        trackOrder_id: trackOrder_id,
        final_pickup_batch: batches,
        truck_capacity,
        logistics_details,
        driver_details,
        vehicle_details,
    })

    console.log("trackRecord  :>> ", trackOrderRecord);
    trackOrderRecord.in_transit.truck_id.push(truckRecord._id);
    trackOrderRecord.status = _trackOrderStatus.inTransit;
    const truckCount = trackOrderRecord.in_transit.truck_id.length;
    console.log("truckCount ", truckCount);
    trackOrderRecord.in_transit.status = `${truckCount} Trucks`;

    await trackOrderRecord.save();

    return res.status(200).send({ status: 200, data: trackOrderRecord, message: _response_message.updated("track") })
})


module.exports.getBatches = asyncErrorHandler(async (req, res) => {

    const { id } = req.params;

    const record = await TrackOrder.findOne({ _id: id });

    const batches = record.ready_to_ship.pickup_batch;

    const data = [];

    for (let batch of batches) {

        const batchData = {
            associate_batch_id: batch.associate_batch_id,
            batchId: batch.batchId,
            allotedQty: {
                count: batch.qtyAllotment,
                unit: batch.availableQty.unit,
            },
            receving_date: batch.receving_date,
            noOfBagsAlloted: batch.no_of_bags,
        }

        data.push(batchData);
    }

    return res.status(200).send(new serviceResponse({ status: 200, data, message: _response_message.found("batches") }));
})


module.exports.fetchBatches = asyncErrorHandler(async (req, res) => {


    const { id } = req.params;

    const record = await BatchOrderProcess.findOne({ _id: id }).populate([
        {
            path: "orderId",
            select: { "product.name": 1, "purchasedOrder.poNo": 1 }
        }

    ])

    if (!record) {
        return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.notFound("purchase record") }] }))
    }


    const batches = await Batch.find({ warehousedetails_id: record.warehouseId });

    if (batches.length == 0) {
        return res.status(200).send(new serviceResponse({ status: 404, errors: [{ message: _response_message.notFound("batches with this warehouse") }] }))
    }

    const orderDetails = { commodity: record.orderId.product.name, orderId: record.orderId.purchasedOrder.poNo, qty: record.quantityRequired };

    const data = { batches, orderDetails }

    return res.status(200).send(new serviceResponse({ status: 200, data: data, message: _response_message.found("batches") }));
})

module.exports.getStatus = asyncErrorHandler(async (req, res) => {


    const { id } = req.params;

    const record = { data: { status: "" } };

    record.data = await TrackOrder.findOne({ purchaseOrder_id: id });

    if (!record.data) {
        return res.status(200).send(new serviceResponse({ status: 200, data: record.data = { status: _trackOrderStatus.pending }, message: _response_message.found("track") }))
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: record.data, message: _response_message.found("status") }));

})


module.exports.getTrucks = asyncErrorHandler(async (req, res) => {


    const { id } = req.params;


    const record = await Truck.find({ trackOrder_id: id });

    if (!record) {
        return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.notFound("truck") }] }))
    }

    const result = [];

    for (let data of record) {

        let totalQty = 0;
        let totalBags = 0;

        for (let batch of data.final_pickup_batch) {
            const perUnitBag = Math.floor(batch.allotedQty.count / batch.noOfBagsAlloted);

            const qtyOfEachBatch = perUnitBag * batch.no_of_bags;

            totalQty += qtyOfEachBatch;

            totalBags += batch.no_of_bags;

        }

        result.push({ truckId: data.truckNo, allotedQty: totalQty, no_of_bags: totalBags })

    }

    return res.status(200).send(new serviceResponse({ status: 200, data: result, message: _response_message.found("truck") }))


})

module.exports.rejectTrack = asyncErrorHandler(async (req, res) => {


    const { id , reason } = req.body;

    const record = await TrackOrder.findOne({ purchaseOrder_id: id });

    if (!record) {
        return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.notFound("purchase order") }] }));
    }

    record.rejection.is_reject = true ; 
    record.rejection.reason = reason ; 
    record.status = _trackOrderStatus.rejected ; 

    await record.save() ; 

    return res.status(200).send(new serviceResponse({ status : 200 , data : record , message : _response_message.found("purchase order")}));


})