const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { User } = require("@src/v1/models/app/auth/User");
const xlsx = require('xlsx');
const csv = require("csv-parser");
const { _userType, _center_type, _status } = require("@src/v1/utils/constants");
const Readable = require('stream').Readable;


module.exports.getProcurementCenter = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0, associateName, state, city } = req.query
        let query = {
            // ...(search ? { center_name: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
            ...(search ? {
                $or: [
                    { "center_name": { $regex: search, $options: "i" } },
                    { "center_code": { $regex: search, $options: "i" } },
                    { "address.state": { $regex: search, $options: "i" } },
                    { slaId: { $regex: search, $options: "i" } },
                ], deletedAt: null
            } : { deletedAt: null })

        };
        if (associateName) {
            query["user_id.basic_details.associate_details.associate_name"] = { $regex: `^${associateName}$`, $options: "i" };
        }

        if (state) {
            query["address.state"] = { $regex: state, $options: "i" };
        }
        if (city) {
            query["address.city"] = { $regex: city, $options: "i" };
        }
        const records = { count: 0 };
        records.rows = (paginate == 1 && isExport != 1)
            ? await ProcurementCenter.find(query)
                .populate({
                    path: 'user_id',
                    select: 'basic_details.associate_details.associate_name basic_details.associate_details.associate_type user_code basic_details.associate_details.organization_name'
                })
                .sort(sortBy)
                .skip(skip)
                .limit(parseInt(limit))

            : await ProcurementCenter.find(query)
                .populate({
                    path: 'user_id',
                    select: 'basic_details.associate_details.associate_name basic_details.associate_details.associate_type user_code basic_details.associate_details.organization_name'
                })
                .sort(sortBy);

        records.count = await ProcurementCenter.countDocuments(query);

        if (paginate == 1 && isExport != 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            let status = 'Inactive';

            const record = records.rows.map((item) => {
                return {
                    "Center ID": item?.center_code || 'NA',
                    "Center Name": item?.center_name || 'NA',
                    "Contact": item?.point_of_contact?.mobile || 'NA',
                    "Email": item?.point_of_contact?.email || 'NA',
                    "State": item?.address?.state || 'NA',
                    "City": item?.address?.city || 'NA',
                    "Point Of Contact": item?.point_of_contact?.name || 'NA',
                    "Location URL": item?.location_url || 'NA',
                    "Status": item.active == true ? _status.active : _status.inactive || 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Procurement-Center-records.xlsx`,
                    worksheetName: `Procurement-Center-records`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("collection center") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("collection center") }))
        }

        // return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("collection center") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}

