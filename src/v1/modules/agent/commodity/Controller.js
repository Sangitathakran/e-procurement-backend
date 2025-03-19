const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { Variety } = require("@src/v1/models/master/Variety");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { Commodity } = require("@src/v1/models/master/Commodity");
const { commodityStandard } = require("@src/v1/models/master/commodityStandard");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _status } = require("@src/v1/utils/constants");

module.exports.createCommodity = asyncErrorHandler(async (req, res) => {
    const { name, commodityStandard_id, unit } = req.body;
    let randomVal;
    // Generate a sequential order number
    const lastOrder = await Commodity.findOne().sort({ createdAt: -1 }).select("commodityId").lean();
    if (lastOrder && lastOrder.commodityId) {
        // Extract the numeric part from the last order's poNo and increment it
        const lastNumber = parseInt(lastOrder.commodityId.replace(/\D/g, ""), 10); // Remove non-numeric characters
        randomVal = `CO${lastNumber + 1}`;
    } else {
        // Default starting point if no orders exist
        randomVal = "CO1001";
    }
    const record = await Commodity.create({
        commodityId: randomVal,
        name,
        commodityStandard_id,
        unit
    });
    return res
        .status(200)
        .send(
            new serviceResponse({
                status: 200,
                data: record,
                message: _response_message.created("Commodity"),
            })
        );
});

module.exports.getCommodity = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;
    const { user_id } = req;
    // Initialize matchQuery
    let matchQuery = {
        deletedAt: null
    };
    if (search) {
        matchQuery.commodityId = { $regex: search, $options: "i" };
    }
    let aggregationPipeline = [
        { $match: matchQuery },
        {
            $lookup: {
                from: 'commoditystandards',
                localField: 'commodityStandard_id',
                foreignField: '_id',
                as: 'standardDetails',
            },
        },
        { $unwind: { path: '$standardDetails', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                commodityId: 1,
                name: 1,
                status: 1,
                commodityStandard_id: 1,
                "standardName": '$standardDetails.subName',
                status: 1
            }
        }
    ];
    if (paginate == 1) {
        aggregationPipeline.push(
            { $sort: { [sortBy || 'createdAt']: -1, _id: -1 } }, // Secondary sort by _id for stability
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    } else {
        aggregationPipeline.push({ $sort: { [sortBy || 'createdAt']: -1, _id: -1 } },);
    }
    const rows = await Commodity.aggregate(aggregationPipeline);
    const countPipeline = [
        { $match: matchQuery },
        { $count: "total" }
    ];
    const countResult = await Commodity.aggregate(countPipeline);
    const count = countResult[0]?.total || 0;
    const records = { rows, count };
    if (paginate == 1) {
        records.page = parseInt(page);
        records.limit = parseInt(limit);
        records.pages = limit != 0 ? Math.ceil(count / limit) : 0;
    }
    if (isExport == 1) {
        const record = rows.map((item) => {
            return {
                "Order Id": item?.order_id || "NA",
                "BO Name": item?.branchName || "NA",
                "Commodity": item?.commodity || "NA",
                "Grade": item?.grade || "NA",
                "Quantity": item?.quantityRequired || "NA",
                "Total Amount": item?.totalAmount || "NA",
                "Total Penalty Amount": item?.totalPenaltyAmount || "NA",
                "Payment Status": item?.paymentStatus || "NA"
            };
        });
        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `Commodity-record.xlsx`,
                worksheetName: `Commodity-record`
            });
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("Commodity") }));
        }
    } else {
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Commodity") }));
    }
});

module.exports.getCommodityById = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
    }
    const record = await Commodity.findOne({ _id: id });
    if (!record) {
        return res
            .status(400)
            .send(
                new serviceResponse({
                    status: 400,
                    errors: [{ message: _response_message.notFound("Commodity") }],
                })
            );
    }
    return res
        .status(200)
        .send(
            new serviceResponse({
                status: 200,
                data: record,
                message: _response_message.found("Commodity"),
            })
        );
});

module.exports.updateCommodity = asyncErrorHandler(async (req, res) => {
    try {
        const { id, name, commodityStandard_id } = req.body;
        const record = await Commodity.findOne({ _id: id, deletedAt: null })
        if (!record) {
            return res
                .status(400)
                .send(
                    new serviceResponse({
                        status: 400,
                        message: _response_message.notFound("Commodity"),
                    })
                );
        }
        record.name = name || record.name;
        record.commodityStandard_id = commodityStandard_id || record.commodityStandard_id;
        await record.save();
        return res
            .status(200)
            .send(
                new serviceResponse({
                    status: 200,
                    data: record,
                    message: _response_message.updated("Commodity"),
                })
            );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
});

module.exports.deleteCommodity = asyncErrorHandler(async (req, res) => {
    try {
        const { id } = req.params;

        const existingRecord = await Commodity.findOne({ _id: id, deletedAt: null }); // Ensure it's not already deleted
        if (!existingRecord) {
            return sendResponse({ res, status: 400, errors: [{ message: _response_message.notFound("Commodity") }] });
        }

        const record = await Commodity.findOneAndUpdate(
            { _id: id },
            { deletedAt: new Date() }, // Soft delete by setting deletedAt timestamp
            { new: true }
        );

        return sendResponse({ res, status: 200, data: record, message: _response_message.deleted("Commodity") });
    } catch (error) {
        _handleCatchErrors(error, res);
    }
});

module.exports.statusUpdateCommodity = asyncErrorHandler(async (req, res) => {
    try {
        const { id, status } = req.body;
        const record = await Commodity.findOne({ _id: id, deletedAt: null })
        if (!record) {
            return res
                .status(400)
                .send(
                    new serviceResponse({
                        status: 400,
                        message: _response_message.notFound("Commodity"),
                    })
                );
        }
        record.status = status || record.status;
        await record.save();
        return res
            .status(200)
            .send(
                new serviceResponse({
                    status: 200,
                    data: record,
                    message: _response_message.updated("Commodity"),
                })
            );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
});

module.exports.getStandard = asyncErrorHandler(async (req, res) => {
    let query = {
        status: _status.active,
        deletedAt: null
    };

    const records = await commodityStandard.find(query)
    // .select({"name":1}).sort({ createdAt: -1 }).distinct('name').lean();

    if (!records) {
        return res
            .status(400)
            .send(
                new serviceResponse({
                    status: 400,
                    errors: [{ message: _response_message.notFound("Standard") }],
                })
            );
    }
    return res
        .status(200)
        .send(
            new serviceResponse({
                status: 200,
                data: records,
                message: _response_message.found("Standard"),
            })
        );
});