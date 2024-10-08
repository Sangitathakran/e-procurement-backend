const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { User } = require("@src/v1/models/app/auth/User");
const xlsx = require('xlsx');
const csv = require("csv-parser");
const { _userType, _center_type } = require("@src/v1/utils/constants");
const Readable = require('stream').Readable;


module.exports.getProcurementCenter = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
        let query = {
            ...(search ? { center_name: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
        };
        const records = { count: 0 };
        records.rows = paginate == 1
            ? await ProcurementCenter.find(query)
                .populate({
                    path: 'user_id',
                    select: 'basic_details.associate_details.associate_name basic_details.associate_details.associate_type user_code'
                })
                .sort(sortBy)
                .skip(skip)
                .limit(parseInt(limit))

            : await ProcurementCenter.find(query)
                .populate({
                    path: 'user_id',
                    select: 'basic_details.associate_details.associate_name basic_details.associate_details.associate_type user_code'
                })
                .sort(sortBy);

        records.count = await ProcurementCenter.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {
                return {
                    "Address Line 1": item?.address?.line1 || 'NA',
                    "Address Line 2": item?.address?.line2 || 'NA',
                    "Country": item?.address?.country || 'NA',
                    "State": item?.address?.country || 'NA',
                    "District": item?.address?.district || 'NA',
                    "City": item?.address?.city || 'NA',
                    "PIN Code": item?.address?.postalCode || 'NA',
                    "Name": item?.point_of_contact?.name || 'NA',
                    "Email": item?.point_of_contact?.email || 'NA',
                    "Mobile": item?.point_of_contact?.mobile || 'NA',
                    "Designation": item?.point_of_contact?.designation || 'NA',
                    "Aadhar Number": item?.point_of_contact?.aadhar_number || 'NA',
                }
            })
            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `procurement-center.xlsx`,
                    worksheetName: `procurement-center`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _query.notFound() }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("collection center") }));
        }
        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("collection center") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

