const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _query } = require("@src/v1/utils/constants/messages");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { User } = require("@src/v1/models/app/auth/User");
const { decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const xlsx = require('xlsx');
const csv = require("csv-parser");
const { _userType, _center_type } = require("@src/v1/utils/constants");
const Readable = require('stream').Readable;


module.exports.createProcurementCenter = async (req, res) => {
    try {
        const { user_id, user_type, trader_type } = req
        const { center_name, center_code, line1, line2, state, district, city, name, email, mobile, designation, aadhar_number, aadhar_image, postalCode, lat, long, addressType, location_url } = req.body;

        let center_type;
        if (user_type == 'Associate') {
            center_type = _center_type.associate;
        } else if (user_type == 'head_office') {
            center_type = _center_type.head_office;
        } else {
            center_type = _center_type.agent;
        }

        const record = await ProcurementCenter.create({
            center_name: center_name,
            center_code: center_code,
            user_id: user_id,
            center_type: center_type,
            address: { line1, line2, country: 'India', state, district, city, postalCode, lat, long },
            point_of_contact: { name, email, mobile, designation, aadhar_number, aadhar_image, },
            addressType,
            location_url: location_url
        });

        return res.send(new serviceResponse({ status: 200, data: record, message: _response_message.created("Collection Center") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}

module.exports.getProcurementCenter = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
        const { user_id } = req
        let query = {
            user_id: user_id,
            ...(search ? { center_name: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
        };
        const records = { count: 0 };
        records.rows = paginate == 1
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
                    fileName: `collection-center.xlsx`,
                    worksheetName: `collection-center}`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _query.notFound() }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("collection center") }));
        }
        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("collection center") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.getHoProcurementCenter = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', associateName, state, city, isExport=0 } = req.query
        // let query = {
        //     ...(search ? { center_name: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
        // };
        let query = { deletedAt: null };

      if (search) {
        query["$or"] = [
        { "center_name": { $regex: search, $options: "i" } },
        { "center_code": { $regex: search, $options: "i" } },
        { "center_type": { $regex: search, $options: "i" } },
           ];
           }
        if (associateName) {
            query["point_of_contact.name"] = { $regex: associateName, $options: "i" };
        }
        if (state) {
            query["address.state"] = { $regex: state, $options: "i" };
        }
        console.log("query",query);

        // City filter
        if (city) {
            query["address.city"] = { $regex: city, $options: "i" };
        }
        const records = { count: 0 };
        records.rows = paginate == 1 ? await ProcurementCenter.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await ProcurementCenter.find(query).sort(sortBy);

        records.count = await ProcurementCenter.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        // return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement center") }));

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
                    fileName: `collection-center.xlsx`,
                    worksheetName: `collection-center`
                });

            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Batch") }))
            }

        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("collection center") }));
        }
        
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.ImportProcurementCenter = async (req, res) => {
    try {
        const { isxlsx = 1 } = req.body;
        const [file] = req.files;

        if (!file) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound('file') }));
        }

        let centers = [];
        let headers = [];

        // Process XLSX or CSV file
        if (isxlsx) {
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            centers = xlsx.utils.sheet_to_json(worksheet);

            if (!centers.length) {
                return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound('No data found in the file') }));
            }

            headers = Object.keys(centers[0]);

        } else {
            const csvContent = file.buffer.toString('utf8');
            const lines = csvContent.split('\n');
            headers = lines[0].trim().split(',');

            const dataContent = lines.slice(1).join('\n');
            const parser = csv({ headers });
            const readableStream = Readable.from(dataContent);

            readableStream.pipe(parser);

            await new Promise((resolve, reject) => {
                parser.on('data', async (data) => {
                    if (Object.values(data).some(val => val.trim() !== '')) {
                        const result = await processCenterRecord(data);
                        if (!result.success) errorArray = errorArray.concat(result.errors);
                    }
                });

                parser.on('end', resolve);
                parser.on('error', reject);
            });
        }

        const getToken = req.headers.token || req.cookies.token;
        if (!getToken) {
            return res.status(200).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
        }

        const decode = await decryptJwtToken(getToken);
        const userId = decode.data.user_id;

        let errorArray = [];

        const processCenterRecord = async (rec) => {
            const requiredFields = ['line1', 'line2', 'country', 'state', 'district', 'city', 'postalCode', 'name', 'email', 'mobile', 'designation', 'aadhar_number'];
            const missingFields = requiredFields.filter(field => !rec[field]);

            let errors = [];

            if (missingFields.length) {
                errors.push({ record: rec, error: `Required fields missing: ${missingFields.join(', ')}` });
            }

            if (!/^\d{12}$/.test(rec.aadhar_number)) {
                errors.push({ record: rec, error: "Invalid Aadhar Number" });
            }
            if (!/^\d{10}$/.test(rec.mobile)) {
                errors.push({ record: rec, error: "Invalid Mobile Number" });
            }

            if (errors.length > 0) return { success: false, errors };

            try {
                await ProcurementCenter.create({
                    agencyId: 1223,
                    user_id: userId,
                    address: {
                        line1: rec.line1, line2: rec.line2, country: rec.country, state: rec.state, district: rec.district, city: rec.city, postalCode: rec.postalCode
                    },
                    point_of_contact: {
                        name: rec.name, email: rec.email, mobile: rec.mobile, designation: rec.designation, aadhar_number: rec.aadhar_number, aadhar_image: 'aa'
                    }
                });
            } catch (error) {
                errors.push({ record: rec, error: error.message });
            }

            return { success: errors.length === 0, errors };
        };

        for (const center of centers) {
            const result = await processCenterRecord(center);
            if (!result.success) {
                errorArray = errorArray.concat(result.errors);
            }
        }

        if (errorArray.length > 0) {
            return res.status(400).send(new serviceResponse({ status: 400, data: { records: errorArray }, errors: [{ message: "Partial upload successfull ! Please export to view the uploaded data." }] }))
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: {}, message: 'Centers successfully uploaded.' }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

/*
module.exports.generateCenterCode = async (req, res) => {
    try {
        const lastCenter = await ProcurementCenter.findOne({ center_code: { $exists: true } }).sort({ center_code: -1 });
        let CenterCode = '';

        if (lastCenter && lastCenter.center_code) {
            const lastCodeNumber = parseInt(lastCenter.center_code.slice(2), 10);
            CenterCode = 'CC' + String(lastCodeNumber + 1).padStart(5, '0');
        } else {
            CenterCode = 'CC00001';
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: { CenterCode }, message: _response_message.found("next center code") }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
*/

module.exports.generateCenterCode = async (req, res) => {
    try {
        let CenterCode = '';
        let isUnique = false;

        // Get the last center code and generate the next one
        const lastCenter = await ProcurementCenter.findOne({ center_code: { $exists: true } }).sort({ center_code: -1 });
        
        if (lastCenter && lastCenter.center_code) {
            const lastCodeNumber = parseInt(lastCenter.center_code.slice(2), 10);
            CenterCode = 'CC' + String(lastCodeNumber + 1).padStart(5, '0');
        } else {
            CenterCode = 'CC00001';
        }

        // Check uniqueness and regenerate if needed
        while (!isUnique) {
            const existingCenter = await ProcurementCenter.findOne({ center_code: CenterCode });
            if (!existingCenter) {
                isUnique = true; // No conflict found, code is unique
            } else {
                // Increment the number and regenerate CenterCode
                const currentCodeNumber = parseInt(CenterCode.slice(2), 10);
                CenterCode = 'CC' + String(currentCodeNumber + 1).padStart(5, '0');
            }
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: { CenterCode }, message: _response_message.found("next center code") }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
