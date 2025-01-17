const mongoose = require('mongoose');
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const { User } = require("@src/v1/models/app/auth/User");
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { _userType, _userStatus } = require('@src/v1/utils/constants');
const xlsx = require('xlsx');


module.exports.getDistiller = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = "createdAt", search = '', isExport = 0 } = req.query;

    let matchStage = {
        deletedAt: null,
    };

    if (search) {
        matchStage.orderId = { $regex: search, $options: "i" };
    }
   

    const aggregationPipeline = [
        { $match: matchStage },
        {
            $lookup: {
                from: 'purchaseorders',
                localField: '_id',
                foreignField: 'distiller_id',
                as: 'purchaseOrders',
            }
        },
        { $unwind: { path: '$purchaseOrders', preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: { distiller_id: '$_id', product_name: '$purchaseOrders.product.name' },
                distiller_name: { $first: '$basic_details.distiller_details.organization_name' },
                poc: { $first: '$basic_details.point_of_contact.name' },
                pocMobile: { $first: '$basic_details.point_of_contact.mobile' },
                pocEmail: { $first: '$basic_details.point_of_contact.email' },
                address: { $first: '$address.registered' },
                request_date: { $first: '$createdAt' },
                user_code: { $first: '$user_code' },
                status: { $first: '$is_approved' },
                mou_document: { $first: '$mou_document' },
                total_quantity: {
                    $sum: {
                        $cond: [
                            { $gt: ['$purchaseOrders.poQuantity', 0] },
                            '$purchaseOrders.poQuantity',
                            0
                        ]
                    }
                }
            }
        },
        {
            $group: {
                _id: '$_id.distiller_id',
                distiller_name: { $first: '$distiller_name' },
                poc: { $first: '$poc' },
                pocMobile: { $first: '$pocMobile' },
                pocEmail: { $first: '$pocEmail' },
                address: { $first: '$address' },
                request_date: { $first: '$request_date' },
                user_code: { $first: '$user_code' },
                status: { $first: '$status' },
                commodity: {
                    $push: {
                        commodity_name: '$_id.product_name',
                        total_quantity: '$total_quantity',
                    },
                },
                mou_document: { $first: '$mou_document' },
            }
        },
        {
            $project: {
                _id: 1,
                distiller_name: 1,
                poc: 1,
                pocMobile: 1,
                pocEmail: 1,
                address: 1,
                request_date: 1,
                user_code: 1,
                status: 1,
                commodity: 1,
                mou_document: 1,
            }
        }
    ];


    if (paginate == 1) {
        aggregationPipeline.push(
            { $sort: { [sortBy || 'createdAt']: -1, _id: 1 } }, 
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    } else {
        aggregationPipeline.push({ $sort: { [sortBy || 'createdAt']: -1, _id: 1 } });
    }

    if (isExport == 1) {
        const exportRecords = await Distiller.aggregate(aggregationPipeline);
        const exportData = exportRecords.map(item => ({
            distiller_name: item.distiller_name,
            poc: item.poc,
            address: item.address,
            request_date: item.request_date,
            status: item.status ? "Approved" : "Pending",
            products: Array.isArray(item.commodity) ? item.commodity.map(product => ({
                name: product.commodity_name,
                quantity: product.total_quantity,
            })) : [],
        }));
   
    
        if (exportData.length > 0) {
            return dumpJSONToExcel(req, res, {
                data: exportData,
                fileName: `Distiller-records.xlsx`,
                worksheetName: `Distiller-records`
            });
        } else {
            return res.status(404).send(new serviceResponse({
                status: 404,
                message: _response_message.notFound("Distiller records"),
            }));
        }
    } else {
        const records = { count: 0 };
        records.rows = await Distiller.aggregate(aggregationPipeline);
        records.count = await Distiller.countDocuments(matchStage);

        if (paginate == 1) {
            records.page = page;
            records.limit = limit;
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        }

        return res.status(200).send(new serviceResponse({
            status: 200,
            data: records,
            message: _response_message.found("Distiller records"),
        }));
    }
});



module.exports.getDistillerById = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;

    let matchStage = {
        _id: new mongoose.Types.ObjectId(id),
        deletedAt: null,
    };

    let aggregationPipeline = [
        { $match: matchStage },
        {
            $lookup: {
                from: "manufacturingunits", // Adjust this to your actual collection name for branches
                localField: "_id",
                foreignField: "distiller_id",
                as: "manufacturingUnit"
            }
        },
        {
            $lookup: {
                from: "storagefacilities", // Adjust this to your actual collection name for branches
                localField: "_id",
                foreignField: "distiller_id",
                as: "storageFacility"
            }
        },
        {
            $project: {
                _id: 1,
                'distiller_id': '$user_code',
                'distiller_details': '$basic_details.distiller_details',
                'company_owner_info': '$basic_details.company_owner_info',
                'poc': '$basic_details.point_of_contact',
                'registered_address': '$address.registered',
                'operational_address': '$address.operational',
                'request_date': '$createdAt',
                'status': '$is_approved',
                company_details: 1,
                authorised: 1,
                bank_details: 1,
                manufacturingUnit: 1,
                storageFacility: 1
            }
        }
    ];

    const record = await Distiller.aggregate(aggregationPipeline);

    if (!record || record.length === 0) {
        return res.status(404).send(new serviceResponse({
            status: 404,
            message: _response_message.notFound("Pending Distiller")
        }));
    }

    return res.status(200).send(new serviceResponse({
        status: 200,
        data: record[0],
        message: _response_message.found("Pending Distiller")
    }));
});


module.exports.bulkuplodDistiller = async (req, res) => {
    try {
        const { isxlsx = 1 } = req.body;
        const [file] = req.files;

        if (!file) {
            return res.status(400).json({
                message: _response_message.notFound("file"),
                status: 400
            });
        }

        let distiller = [];
        let headers = [];

        if (isxlsx) {
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            distiller = xlsx.utils.sheet_to_json(worksheet);
            headers = Object.keys(distiller[0]);
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
                    const result = await processRecord(data);
                    if (!result.success) {
                        errorArray = errorArray.concat(result.errors);
                    }
                }
            });

            parser.on('end', () => {
                console.log("Stream end");
            });
            parser.on('error', (err) => {
                console.log("Stream error", err);
            });
        }

        let errorArray = [];
        const processRecord = async (rec) => {
            const company_name = rec["Company Name*"] || null;
            const company_pan = rec["Company PAN*"] || null;
            const company_cin = rec["Company CIN*"] || null;
            const email = rec["Email ID*"] || null;
            const company_mobile = rec["Company Mobile Number*"] || null;
            const company_address = rec["Company Registered address*"] || null;
            const pincode = rec["Pincode*"] || null;
            const state = rec["State*"] || null;
            const district = rec["District*"] || null;
            const city = rec["Village/Town/City"] || null;

            const owner_name = rec["Owner Name*"] || null;
            const owner_aadhar = rec["Owner Aadhar Number*"] || null;
            const owner_pan = rec["Owner PAN Number*"] || null;

            const poc_name = rec["POC Name*"] || null;
            const poc_designation = rec["Designation"] || null;
            const poc_mobile = rec["POC Mobile Number*"] || null;
            const poc_email = rec["Email*"] || null;
            const poc_aadhar = rec["POC Aadhar Number*"] || null;

            const auth_name = rec["Authorized Person Name*"] || null;
            const auth_designation = rec["Designation"] || null;
            const auth_mobile = rec["Mobile Number*"] || null;
            const auth_email = rec["Email*"] || null;
            const auth_aadhar = rec["Authorized Person Aadhar Number*"] || null;
            const auth_pan = rec["Authorized Person PAN Number"] || null;

            const bank_name = rec["Bank Name*"] || null;
            const branch_name = rec["Branch Name*"] || null;
            const account_holder_name = rec["Account Holder Name*"] || null;
            const ifsc_code = rec["IFSC Code*"] || null;
            const account_number = rec["Account Number*"] || null;
            const confirm_account_number = rec["Confirm Account Number*"] || null;
            const requiredFields = [
                { field: "Company Name*", label: "Company Name" },
                { field: "Company PAN*", label: "Company PAN" },
                { field: "Company CIN*", label: "Company CIN" },
                { field: "Email ID*", label: "Email ID" },
                { field: "Company Mobile Number*", label: "Company Mobile Number" },
                { field: "Company Registered address*", label: "Company Registered Address" },
                { field: "Pincode*", label: "Pincode" },
                { field: "State*", label: "State" },
                { field: "District*", label: "District" },
                { field: "Village/Town/City", label: "Village/Town/City" },
                { field: "Owner Name*", label: "Owner Name" },
                { field: "Owner Aadhar Number*", label: "Owner Aadhar Number" },
                { field: "Owner PAN Number*", label: "Owner PAN Number" },
                { field: "POC Name*", label: "POC Name" },
                { field: "Designation", label: "POC Designation" },
                { field: "POC Mobile Number*", label: "POC Mobile Number" },
                { field: "Email*", label: "POC Email" },
                { field: "POC Aadhar Number*", label: "POC Aadhar Number" },
                { field: "Authorized Person Name*", label: "Authorized Person Name" },
                { field: "Designation", label: "Authorized Person Designation" },
                { field: "Mobile Number*", label: "Authorized Person Mobile Number" },
                { field: "Email*", label: "Authorized Person Email" },
                { field: "Authorized Person Aadhar Number*", label: "Authorized Person Aadhar Number" },
                { field: "Authorized Person PAN Number", label: "Authorized Person PAN Number" },
                { field: "Bank Name*", label: "Bank Name" },
                { field: "Branch Name*", label: "Branch Name" },
                { field: "Account Holder Name*", label: "Account Holder Name" },
                { field: "IFSC Code*", label: "IFSC Code" },
                { field: "Account Number*", label: "Account Number" },
                { field: "Confirm Account Number*", label: "Confirm Account Number" },


            ];

            let errors = [];
            let missingFields = [];

            requiredFields.forEach(({ field, label }) => {
                if (!rec[field]) missingFields.push(label);
            });

            if (missingFields.length > 0) {
                errors.push({ record: rec, error: `Required fields missing: ${missingFields.join(', ')}` });
            }
            if (!/^\d{12}$/.test(poc_aadhar)) {
                errors.push({ record: rec, error: "Invalid Aadhar Number" });
            }
            if (!/^\d{6,20}$/.test(account_number)) {
                errors.push({ record: rec, error: "Invalid Account Number: Must be a numeric value between 6 and 20 digits." });
            }
            if (!/^\d{10}$/.test(poc_mobile)) {
                errors.push({ record: rec, error: "Invalid Mobile Number" });
            }
            if (!account_number || !confirm_account_number) {
                errors.push("Account Number or Confirm Account Number is missing.");
            } else if (account_number.trim() !== confirm_account_number.trim()) {
                errors.push("Account Number and Confirm Account Number do not match.");
            }

            if (errors.length > 0) return { success: false, errors };
            try {

                let existingRecord = await Distiller.findOne({ 'basic_details.point_of_contact.mobile': poc_mobile });
                if (existingRecord) {
                    return { success: false, errors: [{ record: rec, error: `Distiller  with Mobile No. ${poc_mobile} already registered.` }] };

                } else {
                    const newDistiller = new Distiller({
                        client_id: '9876',
                        basic_details: {
                            distiller_details: {
                                organization_name: company_name,
                                email,
                                phone: company_mobile,
                                company_logo: null,
                                pan: company_pan,
                                cin: company_cin,
                                address: company_address,
                                state,
                                district,
                                city,
                                pincode,
                            },
                            point_of_contact: {
                                name: poc_name,
                                email: poc_email,
                                mobile: poc_mobile,
                                designation: poc_designation,
                                aadhar_number: poc_aadhar,
                            },
                            company_owner_info: {
                                name: owner_name,
                                aadhar_number: owner_aadhar,
                                pan_card: owner_pan,
                            },
                            authorized_person: {
                                name: auth_name,
                                designation: auth_designation,
                                mobile: auth_mobile,
                                email: auth_email,
                                aadhar_number: auth_aadhar,
                                pan_card: auth_pan,
                            },
                        },
                        bank_details: {
                            bank_name,
                            branch_name,
                            account_holder_name,
                            ifsc_code,
                            account_number,
                        },
                        user_code: null,
                        user_type: _userType.distiller,
                        is_mobile_verified: true,
                        is_email_verified: false,
                        is_approved: _userStatus.approved,
                        is_form_submitted: false,
                        active: true,
                    });
                    await newDistiller.save();
                }

            } catch (error) {
                console.log(error)
                errors.push({ record: rec, error: error.message });
            }

            return { success: errors.length === 0, errors };
        };

        for (const distillers of distiller) {
            const result = await processRecord(distillers);
            if (!result.success) {
                errorArray = errorArray.concat(result.errors);
            }
        }

        if (errorArray.length > 0) {
            const errorData = errorArray.map(err => ({ ...err.record, Error: err.error }));
            // console.log("error data->",errorData)
            dumpJSONToExcel(req, res, {
                data: errorData,
                fileName: `Distiller-error_records.xlsx`,
                worksheetName: `Distiller-record-error_records`
            });
        } else {
            return res.status(200).json({
                status: 200,
                data: {},
                message: "Distiller successfully uploaded."
            });
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

