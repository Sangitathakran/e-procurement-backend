const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {  _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { CollectionCenter } = require("@src/v1/models/app/procurement/CollectionCenter");
const { decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const xlsx = require('xlsx');
const csv = require("csv-parser");
const Readable = require('stream').Readable;

module.exports.createCollectionCenter = async (req, res) => {

    try {
        const { user_id, user_type, trader_type } = req
        const { agencyId, line1, line2, country, state, district, city, name, email, mobile, designation,aadhar_number, aadhar_image, postalCode, lat, long, addressType } = req.body;

        const record = await CollectionCenter.create({
            agencyId,
            user_id:user_id,
            address: { line1, line2, country, state, district, city, postalCode, lat, long },
            point_of_contact: { name, email, mobile, designation, aadhar_number, aadhar_image, },
            addressType
        });

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.created("Collection Center") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}

module.exports.getCollectionCenter = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query
        const { user_id } = req
        let query = {
            user_id: user_id,
            ...(search ? { name: { $regex: search, $options: "i" } ,deletedAt: null} : { deletedAt: null })
        };
        const records = { count: 0 };
        records.rows = paginate == 1 ? await CollectionCenter.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await CollectionCenter.find(query).sort(sortBy);

        records.count = await CollectionCenter.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("collection center") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.ImportCollectionCenter = async (req, res) => {
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
            return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
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
                await CollectionCenter.create({
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
            return res.status(200).send(new serviceResponse({ status: 400, data: { records: errorArray }, errors: [{ message: "Partial upload successfull ! Please export to view the uploaded data." }] }))
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: {}, message: 'Centers successfully uploaded.' }))
        }
        
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
