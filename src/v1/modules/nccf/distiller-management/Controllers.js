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
    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = "_id", search = '', isExport = 0 } = req.query;

    let matchStage = {
        deletedAt: null,
    };

    if (search) {
        matchStage.orderId = { $regex: search, $options: "i" };
    }

    let aggregationPipeline = [
        { $match: matchStage },
        { $sort: { [sortBy]: 1 } },
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
                address: { $first: '$address.registered' },
                request_date: { $first: '$createdAt' },
                status: { $first: '$is_approved' },
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
                address: { $first: '$address' },
                request_date: { $first: '$request_date' },
                status: { $first: '$status' },
                commodity: {
                    $push: {
                        commodity_name: '$_id.product_name',
                        total_quantity: '$total_quantity',
                    },
                },
            }
        },
        {
            $project: {
                _id: 1,
                distiller_name: 1,
                poc: 1,
                address: 1,
                request_date: 1,
                status: 1,
                commodity: 1,
            }
        }
    ];

    if (paginate == 1 && isExport != 1) {
        aggregationPipeline.push(
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    }

    if (isExport == 1) {
        const exportRecords = await Distiller.aggregate(aggregationPipeline); 
        const exportData = exportRecords.map(item => ({
            distiller_name: item.distiller_name,
            poc: item.poc,
            address: item.address,
            request_date: item.request_date,
            status: item.status ? "Approved" : "Pending",
            products: item.products.map(product => ({
                name: product.product_name,
                quantity: product.total_quantity,
            })),
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
                status: 400,
            });
        }

        let records = [];
        let headers = [];

        // Parse file data
        if (isxlsx) {
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            records = xlsx.utils.sheet_to_json(worksheet);
            headers = Object.keys(records[0]);
        } else {
            const csvContent = file.buffer.toString('utf8');
            const lines = csvContent.split('\n');
            headers = lines[0].trim().split(',');
            records = lines.slice(1).map(line => {
                const values = line.trim().split(',');
                return headers.reduce((obj, key, index) => {
                    obj[key] = values[index] || null;
                    return obj;
                }, {});
            });
        }

        let errorArray = [];

        // Map record fields
        const processRecord = async (record) => {
            const company_name = record["Company Name*"] || null;
            const company_pan = record["Company PAN*"] || null;
            const company_cin = record["Company CIN*"] || null;
            const email = record["Email ID*"] || null;
            const company_mobile = record["Company Mobile Number*"] || null;
            const company_address = record["Company Registered address*"] || null;
            const pincode = record["Pincode*"] || null;
            const state = record["State*"] || null;
            const district = record["District*"] || null;
            const city = record["Village/Town/City"] || null;

            const owner_name = record["Owner Name*"] || null;
            const owner_aadhar = record["Owner Aadhar Number*"] || null;
            const owner_pan = record["Owner PAN Number*"] || null;

            const poc_name = record["POC Name*"] || null;
            const poc_designation = record["Designation"] || null;
            const poc_mobile = record["POC Mobile Number*"] || null;
            const poc_email = record["Email*"] || null;
            const poc_aadhar = record["POC Aadhar Number*"] || null;

            const auth_name = record["Authorized Person Name*"] || null;
            const auth_designation = record["Designation"] || null;
            const auth_mobile = record["Mobile Number*"] || null;
            const auth_email = record["Email*"] || null;
            const auth_aadhar = record["Authorized Person Aadhar Number*"] || null;
            const auth_pan = record["Authorized Person PAN Number"] || null;

            const bank_name = record["Bank Name*"] || null;
            const branch_name = record["Branch Name*"] || null;
            const account_holder_name = record["Account Holder Name*"] || null;
            const ifsc_code = record["IFSC Code*"] || null;
            const account_number = record["Account Number*"] || null;
            const confirm_account_number = record["Confirm Account Number*"] || null;

            let errors = [];

            // Validate mobile number
            if (!poc_mobile || !/^\d{10}$/.test(poc_mobile)) errors.push("Invalid POC Mobile Number.");
            if (account_number !== confirm_account_number) errors.push("Account Number and Confirm Account Number do not match.");

            if (errors.length > 0) return { success: false, errors };

            try {
                let existingRecord = await Distiller.findOne({ 'basic_details.point_of_contact.mobile': poc_mobile });
                if (existingRecord) {
                    return {
                        success: false,
                        errors: [`Distiller with Mobile Number ${poc_mobile} already exists.`],
                    };
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
                        is_approved: _userStatus.pending,
                        is_form_submitted: false,
                        active: true,
                    });
                    await newDistiller.save();
                }
            } catch (error) {
                return { success: false, errors: [error.message] };
            }

            return { success: true };
        };

        for (const record of records) {
            const result = await processRecord(record);
            if (!result.success) {
                errorArray = errorArray.concat(result.errors.map(err => ({ record, error: err })));
            }
        }

        if (errorArray.length > 0) {
            const errorData = errorArray.map(err => ({ ...err.record, Error: err.error }));
            dumpJSONToExcel(req, res, {
                data: errorData,
                fileName: `distiller-error_records.xlsx`,
                worksheetName: `distiller-error-records`,
            });
        } else {
            return res.status(200).json({
                status: 200,
                data: {},
                message: "Distillers successfully uploaded.",
            });
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
