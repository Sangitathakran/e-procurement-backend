const mongoose = require('mongoose');
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _auth_module, _query } = require("@src/v1/utils/constants/messages");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { Auth, decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType, _userStatus } = require('@src/v1/utils/constants');
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");

module.exports.getPendingDistillers = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 10,  paginate = 1, sortBy = "_id", search = '', isExport = 0 } = req.query;

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skipCount = (pageInt - 1) * limitInt;
    
    let matchStage = {
        is_approved: _userStatus.pending,
        deletedAt: null,
    };

    if (search) {
        matchStage["$or"] = [
            {user_code:{ $regex: search, $options: "i"}},
            {"basic_details.distiller_details.organization_name": { $regex: search, $options: "i"}}
        ]
    }
    let aggregationPipeline = [
        { $match: matchStage },
        { $sort: { [sortBy || 'createdAt']: -1, _id: -1 } },
        {
            $project: {
                _id: 1,
                'distiller_id': '$user_code',
                'distiller_name': '$basic_details.distiller_details.organization_name',
                'companyOwnerName': '$basic_details.company_owner_info.name',
                'aadharNumber': '$basic_details.company_owner_info.aadhar_number',
                'panCard': '$basic_details.company_owner_info.pan_card',
                'poc': '$basic_details.point_of_contact.name',
                'poc_email': '$basic_details.point_of_contact.email',
                'poc_mobile': '$basic_details.point_of_contact.mobile',
                'ContactPersonName': '$authorised.name',
                'ContactPersonDesignation': '$authorised.designation',
                'ContactPersonEmail': '$authorised.email',
                'ContactPersonPhone': '$authorised.phone',
                'ContactPersonAadharNumber': '$authorised.aadhar_number',
                'address': '$address.registered',
                'request_date': '$createdAt',
                'status': '$is_approved'
            }
        },
        // { $sort: { [sortBy]: 1 } },
    ];
        
    if (!isExport) {
        aggregationPipeline.push(
            { $skip: parseInt(skipCount)},
            { $limit: parseInt(limitInt) }
        );
    } 


    const records = { count: 0 };
    records.rows = await Distiller.aggregate(aggregationPipeline);
    records.count = await Distiller.countDocuments(matchStage);

        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    
    // Export functionality
    if (isExport == 1) {
        const record = records.rows.map((item) => {

            return {
                "Distiller Id": item?.distiller_id || 'NA',
                "Distiller Name": item?.distiller_name || 'NA',
                "Requested Date": item?.request_date ?? 'NA',
                "Status": item?.status ?? 'NA',
                "Company Owner Name": item?.companyOwnerName ?? 'NA',
                "Aadhar No.": item?.aadharNumber ?? 'NA',
                "PAN No.": item?.panCard ?? 'NA',
                "Contact Person Name": item?.ContactPersonName ?? 'NA',
                "Designation": item?.ContactPersonDesignation ?? 'NA',
                "Mobile": item?.ContactPersonPhone || 'NA',
                "Email": item?.ContactPersonEmail ?? 'NA', 
                "Aadhar Number": item?.ContactPersonAadharNumber ?? 'NA',               
                "Address": item?.address ?? 'NA',
                "Request date": item?.request_date ?? 'NA',
                "Status": item?.status ?? 'NA'
            };

        });

        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `Pending-Distiller-List.xlsx`,
                worksheetName: `Pending-Distiller-List`
            });
        } else {
            return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Pending Distiller") }));
        }
    } else {
        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Pending Distiller") }));
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
            message: _response_message.notFound("Pending Distiller")
        }));
    }

    return res.status(200).send(new serviceResponse({
        status: 200,
        data: record[0],
        message: _response_message.found("Pending Distiller")
    }));
});

module.exports.updateApprovalStatus = asyncErrorHandler(async (req, res) => {
    const { id } = req.query;
    const distiller = await Distiller.findOne({ _id: id });

    if (!distiller) {
        return res.send(
            new serviceResponse({
                status: 400,
                errors: [{ message: _response_message.notFound("Distiller") }],
            })
        );
    }

    if (distiller.is_approved == _userStatus.approved) {
        return res.send(
            new serviceResponse({ status: 400, errors: [{ message: "Distiller already Approved." }] })
        );
    }

    distiller.is_approved = _userStatus.approved,
        await distiller.save();

    return res.send(
        new serviceResponse({
            status: 200,
            message: [{ message: _response_message.updated("Distiller") }],
        })
    );
});

module.exports.getPendingMouList = asyncErrorHandler(async (req, res) => {

    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = "_id", search = '', isExport = 0 } = req.query;

    let matchStage = {
        is_approved: _userStatus.approved,
        deletedAt: null,
    };

    if (search) {
        matchStage["$or"] = [
            {user_code : { $regex: search, $options: "i" }},
            {"basic_details.distiller_details.organization_name" : { $regex: search, $options: "i" }}
        ];
    }


    let aggregationPipeline = [
        { $match: matchStage },
        { $sort: { [sortBy || 'createdAt']: -1, _id: -1 } },
        {
            $project: {
                _id: 1,
                'distiller_id': '$user_code',
                'distiller_name': '$basic_details.distiller_details.organization_name',
                'poc': '$basic_details.point_of_contact.name',
                'poc_email': '$basic_details.point_of_contact.email',
                'poc_mobile': '$basic_details.point_of_contact.mobile',
                'address': '$address.registered',
                'request_date': '$createdAt',
                'status': '$mou_approval',
                'hard_copy': '$mou',
            }
        },
    ];
    const withoutPaginationAggregationPipeline = [...aggregationPipeline];
    if (!isExport) {
        aggregationPipeline.push(
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    }

    const records = { count: 0 };
    withoutPaginationAggregationPipeline.push({$count: "count"})
    records.rows = await Distiller.aggregate(aggregationPipeline);
    records.count = await Distiller.countDocuments(withoutPaginationAggregationPipeline);
    records.page = page;
    records.limit = limit;
    records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    

    // return res.status(200).send(new serviceResponse({
    //     status: 200,
    //     data: records,
    //     message: _response_message.found("Distiller MOU")
    // }));

    // Export functionality
    if (isExport == 1) {
        const record = records.rows.map((item) => {

            return {
                "Distiller Id": item?.distiller_id || 'NA',
                "Distiller Name": item?.distiller_name || 'NA',
                "POC": item?.poc ?? 'NA',
                "POC Email": item?.poc_email ?? 'NA',
                "POC Mobile": item?.poc_mobile || 'NA',
                "Address": item?.address ?? 'NA',
                "Request date": item?.request_date ?? 'NA',
                "hard copy": item?.mou ?? 'NA',
                "Status": item?.status ?? 'NA'
            };

        });

        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `Distiller-MOU-List.xlsx`,
                worksheetName: `Distiller-MOU-List`
            });
        } else {
            return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Distiller MOU") }));
        }
    } else {
        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Distiller MOU") }));
    }

});

module.exports.updateMouApprovalStatus = asyncErrorHandler(async (req, res) => {
    const { id } = req.query;
    const distiller = await Distiller.findOne({ _id: id });

    if (!distiller) {
        return res.send(
            new serviceResponse({
                status: 400,
                errors: [{ message: _response_message.notFound("Distiller") }],
            })
        );
    }

    if (distiller.mou_approval == _userStatus.approved) {
        return res.send(
            new serviceResponse({ status: 400, errors: [{ message: "Distiller MOU already Approved." }] })
        );
    }

    distiller.mou = true,
        distiller.mou_approval = _userStatus.approved,

        await distiller.save();

    return res.send(
        new serviceResponse({
            status: 200,
            message: [{ message: _response_message.updated("Distiller MOU") }],
        })
    );
});
