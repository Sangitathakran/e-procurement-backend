const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { _response_message } = require("@src/v1/utils/constants/messages");
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

    // field left --> is qtyProcured and procuredOn according to figma 
    // qtyProcured is in the farmerOrders table 

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
            { path: "farmerOrderIds", select: "qtyProcured" },
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