const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { _batchStatus } = require("@src/v1/utils/constants");
const { _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");


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

    records.count = await RequestModel.countDocuments(query);

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

    records.count = await Batch.countDocuments(query);

    if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("requirement") }));

})


module.exports.uploadRecevingStatus = asyncErrorHandler(async (req, res) => {

    const { id, proof_of_delivery, weigh_bridge_slip, receiving_copy, truck_photo, loaded_vehicle_weight, tare_weight, net_weight } = req.body;
    const { user_id } = req;

    const record = await Batch.findOne({ _id: id });

    if (!record) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }));
    }

    if (proof_of_delivery && weigh_bridge_slip && receiving_copy && truck_photo && loaded_vehicle_weight && tare_weight && net_weight) {
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

        await record.save();
    } else {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require("field") }] }));
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.updated("Batch") }));

})


module.exports.getBatch = asyncErrorHandler(async (req, res) => {

    const { id } = req.params;

    let record = await Batch.findOne({ _id: id });

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