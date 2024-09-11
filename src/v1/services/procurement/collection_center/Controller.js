const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {  _response_message } = require("@src/v1/utils/constants/messages");
const { CollectionCenter } = require("@src/v1/models/app/procurement/CollectionCenter");
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
            return res.status(400).json({
                message: _response_message.notFound("file"),
                status: 400
            });
        }

        let centers = [];
        let headers = [];
        
        if (isxlsx) {
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            centers = xlsx.utils.sheet_to_json(worksheet);
            console.log('centers',centers);return false;
            headers = Object.keys(centers[0]);
            
        } else {
            const csvContent = file.buffer.toString('utf8');
            const lines = csvContent.split('\n');
            headers = lines[0].trim().split(',');
            const dataContent = lines.slice(1).join('\n');

            const parser = csv({ headers });
            const readableStream = Readable.from(dataContent);

            readableStream.pipe(parser);
            parser.on('data', async (data) => {
                if (Object.values(data).some(val => val !== '')) {
                    const result = await processCenterRecord(data);
                    if (!result.success) {
                        errorArray = errorArray.concat(result.errors);
                    }
                }
            });

            parser.on('end', (err, data) => {
                console.log("Streem end")
            });
            parser.on('error', (err, data) => {
                console.log("Streem error")
            });
        }
        console.log('test route');return false;
        let errorArray = [];
        const processCenterRecord = async (rec) => {
            const agencyId = rec["Agency Id*"];
            const user_id = rec["User Id"];
            const line1 = rec["line1*"];
            const line2 = rec["line2*"];
            const country = rec["country"];
            const state = rec["state*"];
            const district = rec["district*"];
            const city = rec["city"];
            const postalCode = rec["postalCode"];
            const name = rec["name"];
            const email = rec["email"];
            const mobile = rec["mobile"];
            const designation = rec["designation"];
            const aadhar_no = rec["aadhar_no*"];
            
            let errors = [];

            if (!line1 || !line2 || !country || !state || !district || !city || !postalCode || !name || !email || !mobile || !designation || !aadhar_no) {
                errors.push({ record: rec, error: "Required fields missing" });
            }
            if (!/^\d{12}$/.test(aadhar_no)) {
                errors.push({ record: rec, error: "Invalid Aadhar Number" });
            }
            if (!/^\d{10}$/.test(mobile)) {
                errors.push({ record: rec, error: "Invalid Mobile Number" });
            }

            if (errors.length > 0) return { success: false, errors };

            try {
                await insertNewCenterRecord({
                    agencyId, user_id, line1, line2, country, state_id, district_id, city, postalCode, name, email, mobile, designation
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
            return res.status(200).json({
                status: 400,
                data: { records: errorArray },
                errors: [{ message: "Partial upload successful. Please check the error records." }]
            });
        } else {
            return res.status(200).json({
                status: 200,
                data: {},
                message: "centers successfully uploaded."
            });
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};