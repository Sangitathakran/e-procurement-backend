const mongoose = require('mongoose');
const { _response_message } = require("@src/v1/utils/constants/messages");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require('@src/v1/utils/helpers/asyncErrorHandler');
const { Branches } = require('@src/v1/models/app/branchManagement/Branches');
const { _status } = require('@src/v1/utils/constants');
const { dumpJSONToExcel } = require('@src/v1/utils/helpers');


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
    if (paginate == 0) {
        query.status = _status.active
    }

    const records = { count: 0 };
    records.rows = paginate == 1 ? await Branches.find(query)
        .skip(skip)
        .sort(sortBy) :
        await Branches.find(query).select('_id branchName status').sort(sortBy)

    records.count = await Branches.countDocuments(query);

    if (paginate == 1) {
        records.page = page
        records.limit = limit
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
    }

    if (isExport == 1) {

        const record = records.rows.map((item) => {

            const { cityVillageTown, address, state, pincode } = item;

            return {
                "Branch Id": item?.branchId || "NA",
                "Branch Name": item?.branchName || "NA",
                "Email Address": item?.emailAddress || "NA",
                "Point of Contact": item?.pointOfContact.name || "NA",
                "Address": `${cityVillageTown} , ${address} , ${state} , ${pincode}`,
                "State": item?.status || "NA",
            }
        })

        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `BoList-${'BoList'}.xlsx`,
                worksheetName: `BoList-record-${'BoList'}`
            });
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Bo List") }))
        }
    } else {
        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("branch Office") }));
    }
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


