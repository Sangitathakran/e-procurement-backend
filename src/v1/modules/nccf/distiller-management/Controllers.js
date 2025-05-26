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
        is_approved: _userStatus.approved,
        deletedAt: null,
    };

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
    
        // Add search filter after the lookup
        ...(search
            ? [{
                $match: {
                    $or: [
                        { 'basic_details.distiller_details.organization_name': { $regex: search, $options: 'i' } },
                        { 'user_code': { $regex: search, $options: 'i' } }
                    ]
                }
            }]
            : []),
    
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
        },
        { $sort: { [sortBy || 'createdAt']: -1, _id: -1 } }
    ];
    
    const withoutPaginationAggregationPipeline = [...aggregationPipeline];
    if (!isExport) {
        aggregationPipeline.push(
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    }
    
   

    if (isExport == 1) {
        const exportRecords = await Distiller.aggregate(aggregationPipeline.slice(0,-3));
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
        withoutPaginationAggregationPipeline.push({$count: "count"})
        const records = { count: 0 };
        records.rows = await Distiller.aggregate(aggregationPipeline);
        const totalCount = await Distiller.aggregate(withoutPaginationAggregationPipeline);
        records.count = totalCount?.[0]?.count ?? 0;
    
            records.page = page;
            records.limit = limit;
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        

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

    // let aggregationPipeline = [
    //     { $match: matchStage },
    //     {
    //         $lookup: {
    //             from: "manufacturingunits",
    //             localField: "_id",
    //             foreignField: "distiller_id",
    //             as: "manufacturingUnit"
    //         }
    //     },
    //     {
    //         $unwind: {
    //             path: "$manufacturingUnit",
    //             preserveNullAndEmptyArrays: true
    //         }
    //     },
    //     {
    //         $lookup: {
    //             from: "statedistrictcities",
    //             let: {
    //                 stateId: "$manufacturingUnit.manufacturing_state",
    //                 districtId: "$manufacturingUnit.manufacturing_district"
    //             },
    //             pipeline: [
    //                 { $unwind: "$states" },
    //                 { $match: { $expr: { $eq: ["$states._id", "$$stateId"] } } },
    //                 { $unwind: "$states.districts" },
    //                 { $match: { $expr: { $eq: ["$states.districts._id", "$$districtId"] } } },
    //                 {
    //                     $project: {
    //                         state_title: "$states.state_title",
    //                         district_title: "$states.districts.district_title"
    //                     }
    //                 }
    //             ],
    //             as: "location_details"
    //         }
    //     },
    //     {
    //         $addFields: {
    //             "manufacturingUnit.state_title": { $arrayElemAt: ["$location_details.state_title", 0] },
    //             "manufacturingUnit.district_title": { $arrayElemAt: ["$location_details.district_title", 0] }
    //         }
    //     },
    //     {
    //         $lookup: {
    //             from: "storagefacilities", 
    //             localField: "_id",
    //             foreignField: "distiller_id",
    //             as: "storageFacility"
    //         }
    //     },
    //     {
    //         $unwind: {
    //             path: "$storageFacility",
    //             preserveNullAndEmptyArrays: true
    //         }
    //     },
    //     {
    //         $lookup: {
    //             from: "statedistrictcities",
    //             let: {
    //                 stateId: "$storageFacility.storage_state",
    //                 districtId: "$storageFacility.storage_district"
    //             },
    //             pipeline: [
    //                 { $unwind: "$states" },
    //                 { $match: { $expr: { $eq: ["$states._id", "$$stateId"] } } },
    //                 { $unwind: "$states.districts" },
    //                 { $match: { $expr: { $eq: ["$states.districts._id", "$$districtId"] } } },
    //                 {
    //                     $project: {
    //                         state_title: "$states.state_title",
    //                         district_title: "$states.districts.district_title"
    //                     }
    //                 }
    //             ],
    //             as: "location_detail"
    //         }
    //     },
    //     {
    //         $addFields: {
    //             "storageFacility.state_title": { $arrayElemAt: ["$location_detail.state_title", 0] },
    //             "storageFacility.district_title": { $arrayElemAt: ["$location_detail.district_title", 0] }
    //         }
    //     },
    //     {
    //         $project: {
    //             _id: 1,
    //             'user_code': '$user_code',
    //             'distiller_details': '$basic_details.distiller_details',
    //             'company_owner_info': '$basic_details.company_owner_info',
    //             'poc': '$basic_details.point_of_contact',
    //             'registered_address': '$address.registered',
    //             'operational_address': '$address.operational',
    //             'request_date': '$createdAt',
    //             'status': '$is_approved',
    //             company_details: 1,
    //             authorised: 1,
    //             bank_details: 1,
    //             manufacturingUnit: 1,
    //             storageFacility: 1
    //         }
    //     }
    // ];

    let aggregationPipeline = [
        { $match: matchStage },
        {
            $lookup: {
                from: "manufacturingunits",
                localField: "_id",
                foreignField: "distiller_id",
                as: "manufacturingUnits"
            }
        },
        {
            $lookup: {
                from: "statedistrictcities",
                let: { 
                    manufacturingUnits: "$manufacturingUnits" 
                },
                pipeline: [
                    { $unwind: "$states" },
                    { $unwind: "$states.districts" },
                    {
                        $project: {
                            state_id: "$states._id",
                            district_id: "$states.districts._id",
                            state_title: "$states.state_title",
                            district_title: "$states.districts.district_title"
                        }
                    }
                ],
                as: "location_details"
            }
        },
        {
            $addFields: {
                manufacturingUnits: {
                    $map: {
                        input: "$manufacturingUnits",
                        as: "unit",
                        in: {
                            $mergeObjects: [
                                "$$unit",
                                {
                                    state_title: {
                                        $arrayElemAt: [
                                            "$location_details.state_title",
                                            { $indexOfArray: ["$location_details.state_id", "$$unit.manufacturing_state"] }
                                        ]
                                    },
                                    district_title: {
                                        $arrayElemAt: [
                                            "$location_details.district_title",
                                            { $indexOfArray: ["$location_details.district_id", "$$unit.manufacturing_district"] }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        },
        {
            $lookup: {
                from: "storagefacilities",
                localField: "_id",
                foreignField: "distiller_id",
                as: "storageFacilities"
            }
        },
        {
            $lookup: {
                from: "statedistrictcities",
                let: { 
                    storageFacilities: "$storageFacilities" 
                },
                pipeline: [
                    { $unwind: "$states" },
                    { $unwind: "$states.districts" },
                    {
                        $project: {
                            state_id: "$states._id",
                            district_id: "$states.districts._id",
                            state_title: "$states.state_title",
                            district_title: "$states.districts.district_title"
                        }
                    }
                ],
                as: "location_detail"
            }
        },
        {
            $addFields: {
                storageFacilities: {
                    $map: {
                        input: "$storageFacilities",
                        as: "facility",
                        in: {
                            $mergeObjects: [
                                "$$facility",
                                {
                                    state_title: {
                                        $arrayElemAt: [
                                            "$location_detail.state_title",
                                            { $indexOfArray: ["$location_detail.state_id", "$$facility.storage_state"] }
                                        ]
                                    },
                                    district_title: {
                                        $arrayElemAt: [
                                            "$location_detail.district_title",
                                            { $indexOfArray: ["$location_detail.district_id", "$$facility.storage_district"] }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        },
        {
            $project: {
                _id: 1,
                user_code: 1,
                distiller_details: '$basic_details.distiller_details',
                company_owner_info: '$basic_details.company_owner_info',
                poc: '$basic_details.point_of_contact',
                registered_address: '$address.registered',
                operational_address: '$address.operational',
                request_date: '$createdAt',
                status: '$is_approved',
                company_details: 1,
                authorised: 1,
                bank_details: 1,
                manufacturingUnits: 1,
                storageFacilities: 1
            }
        }
    ];
    
    const record = await Distiller.aggregate(aggregationPipeline);

    if (!record || record.length === 0) {
        return res.status(404).send(new serviceResponse({
            status: 404,
            message: _response_message.notFound("Distiller")
        }));
    }

    return res.status(200).send(new serviceResponse({
        status: 200,
        data: record[0],
        message: _response_message.found("Distiller")
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
            const poc_designation = rec["PocDesignation"] || null;
            const poc_mobile = rec["POC Mobile Number*"] || null;
            const poc_email = rec["PocEmail*"] || null;
            const poc_aadhar = rec["POC Aadhar Number*"] || null;

            const auth_name = rec["Authorized Person Name*"] || null;
            const auth_designation = rec["AuthDesignation"] || null;
            const auth_mobile = rec["Mobile Number*"] || null;
            const auth_email = rec["AuthEmail*"] || null;
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
                { field: "PocEmail*", label: "POC Email" },
                { field: "POC Aadhar Number*", label: "POC Aadhar Number" },
                { field: "Authorized Person Name*", label: "Authorized Person Name" },
                { field: "Designation", label: "Authorized Person Designation" },
                { field: "Mobile Number*", label: "Authorized Person Mobile Number" },
                { field: "AuthEmail*", label: "Authorized Person Email" },
                { field: "Authorized Person Aadhar Number*", label: "Authorized Person Aadhar Number" },
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
            if (!String(account_number).trim() || !String(confirm_account_number).trim()) {
                errors.push("Account Number and Confirm Account Number are required.");
            } else if (String(account_number).trim() !== String(confirm_account_number).trim()) {
                errors.push("Account Number and Confirm Account Number must match.");
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
                        company_details: {
                            cin_number: company_cin,
                            pan_card: company_pan,
                        },
                        address: {
                            registered: {
                                line1: company_address,
                                country:'India',
                                state,
                                district,
                                taluka: city,
                                pinCode: pincode,
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

