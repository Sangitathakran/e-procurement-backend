const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { User } = require("@src/v1/models/app/auth/User");
const { decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const xlsx = require('xlsx');
const csv = require("csv-parser");
const { _userType, _center_type } = require("@src/v1/utils/constants");
const { sendMail } = require("@src/v1/utils/helpers/node_mailer");
const Readable = require('stream').Readable;


module.exports.createProcurementCenter = async (req, res) => {
    try {
        const { user_id, user_type } = req
        const { center_name, center_code, line1, line2, state, district, city, name, email, mobile, designation, aadhar_number, aadhar_image, postalCode, lat, long, addressType, location_url } = req.body;

        let center_type;
        if (user_type == '4') {
            center_type = _center_type.associate;
        } else if (user_type == '6') {
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

        const subject = `New Procurement Center Successfully Created under Procurement Center ID ${record?.center_code}`;
        const body = `<p>This to inform you that a new head office has been successfully created under the following details:</p><br/> 
                <p>Procurement Center Name: ${record?.center_name}</p> <br/> 
                <p> Procurement Center ID: ${record?.center_code} </p> <br/> 
                <p>Location: ${record?.address} </p> <br/> 
                <p> Date of Creation: ${record?.createdAt}</p> <br/>
                <p> Please follow the link below for additional Information:<a href="https://ep-testing.navbazar.com/procurement-centre/my-procurement-centre"> Click here </a> </p> <br/>
                <p> Need Help? </p> <br/>
                <p> For queries or any assistance, contact us at ${record?.point_of_contact.mobile}</p> <br/>
                <p> Warm regards, </p>  <br/>
                <p> Navankur. </p>  <br/>` ;


        await sendMail("ashita@navankur.org", null, subject, body);

        return res.send(new serviceResponse({ status: 200, data: record, message: _response_message.created("Collection Center") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}

module.exports.editProcurementCenter = async (req, res) => {
    try {
        const { user_id, user_type } = req;
        const { id } = req.params; 
        const {
            center_name, line1, line2, state, district, city,
            name, email, mobile, designation, aadhar_number,
            aadhar_image, postalCode, lat, long, addressType, location_url
        } = req.body;

        let center_type;
        if (user_type == '4') {
            center_type = _center_type.associate;
        } else if (user_type == '6') {
            center_type = _center_type.head_office;
        } else {
            center_type = _center_type.agent;
        }

        const updated = await ProcurementCenter.findOneAndUpdate(
            { id }, // or { _id: req.body._id }
            {
                center_name,
                center_type,
                address: { line1, line2, country: 'India', state, district, city, postalCode, lat, long },
                point_of_contact: { name, email, mobile, designation, aadhar_number, aadhar_image },
                addressType,
                location_url
            },
            { new: true } // return updated document
        );

        if (!updated) {
            return res.status(404).send(new serviceResponse({ status: 404, message: "Procurement center not found" }));
        }

        return res.send(new serviceResponse({ status: 200, data: updated, message: _response_message.updated("Collection Center") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.getProcurementCenter = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0, centerType = 'self', state, city, associate_name } = req.query

        const { user_id } = req

        let query = {
            ...(search ? {
                $or: [
                    { center_name: { $regex: search, $options: "i" } },
                    { center_code: { $regex: search, $options: "i" } }
                ], deletedAt: null
            } : { deletedAt: null })
        };
        if (centerType === 'self') {
            query.user_id = user_id;
        } else if (centerType === 'associate') {
            query.user_id = { $ne: user_id };
        }
        if (state) query["address.state"] = state;
        if (city) query["address.city"] = city;

        const records = { count: 0 };
        records.rows = (paginate == 1 && isExport != 1)
            ? await ProcurementCenter.find(query)
                .populate({
                    path: 'user_id',
                    match: associate_name ? { "basic_details.associate_details.associate_name": { $regex: associate_name, $options: "i" } } : {},
                    select: 'basic_details.associate_details.associate_name basic_details.associate_details.associate_type user_code basic_details.associate_details.organization_name'
                })
                .sort(sortBy)
                .skip(skip)
                .limit(parseInt(limit))

            : await ProcurementCenter.find(query)
                .populate({
                    path: 'user_id',
                    match: associate_name ? { "basic_details.associate_details.associate_name": { $regex: associate_name, $options: "i" } } : {},
                    select: 'basic_details.associate_details.associate_name basic_details.associate_details.associate_type user_code basic_details.associate_details.organization_name'
                })
                .sort(sortBy);
        records.count = await ProcurementCenter.countDocuments(query);

        if (paginate == 1  && isExport != 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1 && centerType === 'self') {

            const record = records.rows.map((item) => {
                return {
                    "Centre ID": item?.center_code || 'NA',
                    "CENTRE NAME": item?.center_name || 'NA',
                     "STATE": item?.address?.state || 'NA',
                      "City": item?.address?.city || 'NA',
                       "POINT OF CONTACT": item?.point_of_contact?.name || 'NA',
                        "STATUS": item?.active || 'NA',
                }
            })
            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `My-Procurement-Centre.xlsx`,
                    worksheetName: `My-Procurement-Centre-record`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _query.notFound() }))
            }
        } else if( isExport == 1 && centerType === 'associate' )
        {
             const record = records.rows.map((item) => {
                return {
                    "Centre ID": item?.center_code || 'NA',
                    "CENTRE NAME": item?.center_name || 'NA',
                    "Associate ID": item?.user_id?.user_code || 'NA',
                    "Organization Name": item?.user_id?.basic_details?.associate_details?.organization_name || 'NA',
                     "STATE": item?.address?.state || 'NA',
                      "City": item?.address?.city || 'NA',
                       "POINT OF CONTACT": item?.point_of_contact?.name || 'NA',
                        "STATUS": item?.active || 'NA',
                }
            })
            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Associate-Procurement-Centre.xlsx`,
                    worksheetName: `Associate-Procurement-Centre-record`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _query.notFound() }))
            }
        }
        else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("collection center") }));
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

// module.exports.getProcurementCenter = async (req, res) => {
//     try {
//         console.log("Fetching Procurement Centers...");
        
//         const { 
//             page = 1, 
//             limit = 10, 
//             sortBy = { createdAt: -1 }, 
//             search = '', 
//             isExport = 0, 
//             centerType = 'self', 
//             associate_name, 
//             state, 
//             city 
//         } = req.query;

//         const { user_id } = req;
//         const skip = (page - 1) * limit;

//         let query = { deletedAt: null };

//         // 🏢 Center Type Filtering
//         if (centerType === 'self') {
//             query.user_id = user_id;
//         } else if (centerType === 'associate') {
//             query.user_id = { $ne: user_id };
//         }

//         // 🌍 State & City Filtering
//         if (state) query["address.state"] = state;
//         if (city) query["address.city"] = city;

//         // 🔍 Search Filter
//         if (search) {
//             query.$or = [
//                 { center_name: { $regex: search, $options: "i" } },
//                 { center_code: { $regex: search, $options: "i" } }
//             ];
//         }

//         // 📌 Fetch Data with Population
//         let records = await ProcurementCenter.find(query)
//             .populate({
//                 path: 'user_id',
//                 match: associate_name ? { "basic_details.associate_details.associate_name": { $regex: associate_name, $options: "i" } } : {}
//             })
//             .sort(sortBy)
//             .skip(skip)
//             .limit(parseInt(limit));

//         // 🎯 Filter Only Matched Users (Avoid Null Users)
//         records = records.filter(center => center.user_id !== null);

//         // 📊 Count Total Records
//         const totalCount = await ProcurementCenter.countDocuments(query);

//         // 📂 Export Data if Required
//         if (isExport == 1) {
//             const record = records.map(item => ({
//                 "Address Line 1": item?.address?.line1 || 'NA',
//                 "Address Line 2": item?.address?.line2 || 'NA',
//                 "Country": item?.address?.country || 'NA',
//                 "State": item?.address?.state || 'NA',
//                 "District": item?.address?.district || 'NA',
//                 "City": item?.address?.city || 'NA',
//                 "PIN Code": item?.address?.postalCode || 'NA',
//                 "Name": item?.point_of_contact?.name || 'NA',
//                 "Email": item?.point_of_contact?.email || 'NA',
//                 "Mobile": item?.point_of_contact?.mobile || 'NA',
//                 "Designation": item?.point_of_contact?.designation || 'NA',
//                 "Aadhar Number": item?.point_of_contact?.aadhar_number || 'NA',
//             }));

//             if (record.length > 0) {
//                 return dumpJSONToExcel(req, res, {
//                     data: record,
//                     fileName: `collection-center.xlsx`,
//                     worksheetName: `collection-center`
//                 });
//             } else {
//                 return res.status(400).json({ status: 400, message: "No data available for export" });
//             }
//         }

//         // ✅ Return Paginated Response
//         return res.status(200).json({
//             status: 200,
//             data: {
//                 rows: records,
//                 count: totalCount,
//                 page: parseInt(page),
//                 limit: parseInt(limit),
//                 pages: Math.ceil(totalCount / limit)
//             },
//             message: records.length ? "Collection centers found." : "Collection center not found.",
//             event: {},
//             errorCode: "",
//             errors: [],
//             version: "1.0"
//         });

//     } catch (error) {
//         console.error("Error in getProcurementCenter:", error);
//         return res.status(500).json({ status: 500, message: "Internal Server Error" });
//     }
// };


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
        // Fetch the last center code sorted correctly as a number
        const lastCenter = await ProcurementCenter.findOne({ center_code: { $regex: /^CC\d{5}$/ } })
            .sort({ center_code: -1 })
            .collation({ locale: "en", numericOrdering: true });

        let CenterCode = '';

        if (lastCenter && lastCenter.center_code) {
            const lastCodeNumber = parseInt(lastCenter.center_code.replace(/\D/g, ''), 10);
            CenterCode = 'CC' + String(lastCodeNumber + 1).padStart(5, '0');
        } else {
            CenterCode = 'CC00001';
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: { CenterCode }, message: _response_message.found("Next center code") }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
