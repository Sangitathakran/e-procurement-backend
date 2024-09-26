const mongoose = require('mongoose');
const { _response_message } = require("@src/v1/utils/constants/messages");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require('@src/v1/utils/helpers/asyncErrorHandler');
const { Branches } = require('@src/v1/models/app/branchManagement/Branches');


module.exports.getBo = asyncErrorHandler(async (req, res) => {
    const { page, limit, skip, paginate = 1, sortBy, search = '', ho_id, isExport = 0 } = req.query
    let query = {
        ...(search ? {
            $or: [
                { branchName: { $regex: search, $options: "i" } },
                { branchId: { $regex: search, $options: "i" } },
                { emailAddress: { $regex: search, $options: "i" } }
            ], deletedAt: null
        } : { deletedAt: null })
    };

    if (ho_id) {
        query.headOfficeId = new mongoose.Types.ObjectId(ho_id)
    }

    const records = { count: 0 };
    records.rows = paginate == 1 ? await Branches.find(query)
        .skip(skip)
        .sort(sortBy) :
        await Branches.find(query).select('_id branchName')

    records.count = await Branches.countDocuments(query);

    if (paginate == 1) {
        records.page = page
        records.limit = limit
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
    }

    return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("branch Office") }));
})

module.exports.updateStatus = asyncErrorHandler(async (req, res) => {
    const { id, status } = req.params

    const record = await Branches.findOne({ _id: id })

    if (!record) {
        return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("branch Office") }] }))
    }

    record.status = status
    record.save()

    return res.send(new serviceResponse({ status: 200, data: record, message: _response_message.updated() }))
})
