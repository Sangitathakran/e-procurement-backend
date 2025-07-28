const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { _associateOfferStatus } = require("@src/v1/utils/constants");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const mongoose = require("mongoose");

/*
module.exports.getProcurement = asyncErrorHandler(
    async (req, res) => {
        const { page, limit, skip, sortBy, search = '', status, paginate = 1, isExport = 0 } = req.query;

        const calculatedSkip = (page - 1) * limit;
        let query = search ? {
            $or: [
                { "reqNo": { $regex: search, $options: 'i' } },
                { "product.name": { $regex: search, $options: 'i' } },
                { "product.grade": { $regex: search, $options: 'i' } },
            ]
        } : {};

        // Aggregation pipeline to join with AssociateOffers
        const basePipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'associateoffers',
                    localField: '_id',
                    foreignField: 'req_id',
                    as: 'myoffer',
                },
            },
            { $unwind: '$myoffer' },
            { $match: { 'myoffer.status': { $in: [_associateOfferStatus.ordered, _associateOfferStatus.partially_ordered] } } },

            ...(sortBy ? [{ $sort: { [sortBy]: 1 } }] : []),  // Sorting if required
            // ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : []), // Pagination if required
            // { $limit: limit ? parseInt(limit) : 10 }

        ];
        const pipeline = isExport == 1
            ? basePipeline // Do not apply pagination for export
            : [
                ...basePipeline,
                ...(paginate == 1 ? [{ $skip: parseInt(calculatedSkip) }, { $limit: parseInt(limit) }] : []), // Apply pagination for normal requests
            ];

        const [totalCountResult, paginatedResults] = await Promise.all([
            RequestModel.aggregate([...basePipeline, { $count: 'count' }]),
            RequestModel.aggregate(pipeline),
        ]);

        const totalCount = totalCountResult[0]?.count || 0;

        const records = {
            count: totalCount,
            rows: paginatedResults,
        };
        // const records = {};
        // records.count = await RequestModel.countDocuments(query);
        // records.rows = await RequestModel.aggregate(pipeline);


        if (paginate == 1) {
            records.page = page;
            records.limit = limit;
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        }

        if (isExport == 1) {
            const allRecords = await RequestModel.aggregate([...basePipeline, { $skip: 0 }, { $limit: totalCount }]);
            const record = allRecords.map((item) => {
                return {
                    "Order Id": item?.reqNo || "NA",
                    "Commodity": item?.product.name || "NA",
                    "Grade": item?.product.grade || "NA",
                    "MSP": item?.quotedPrice || "NA",
                    "Expected Procurement": item?.expectedProcurementDate || "NA",
                    "Expected Delivery Date": item?.deliveryDate || "NA",
                    "Delivery Location": item?.address.deliveryLocation || "NA",
                }
            })


            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Procurement-${'Procurement'}.xlsx`,
                    worksheetName: `Procurement-record-${'Procurement'}`
                });

            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Procurement") }))
            }

        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement") }));

        }
    }
)
*/

module.exports.getProcurement = asyncErrorHandler(
    async (req, res) => {
        const { page = 1, limit = 10, sortBy, search = '', paginate = 1, isExport = 0 } = req.query;
        const calculatedSkip = (page - 1) * limit;
const { schemeName, commodity, slaName, branchName, cna } = req.query;
        let query = search ? {
            $or: [
                { "reqNo": { $regex: search, $options: 'i' } },
                { "product.name": { $regex: search, $options: 'i' } },
                { "product.grade": { $regex: search, $options: 'i' } },
            ]
        } : {};

        // Aggregation Pipeline
        const basePipeline = [
            { $match: query },

            // Lookup AssociateOffers
            {
                $lookup: {
                    from: 'associateoffers',
                    localField: '_id',
                    foreignField: 'req_id',
                    as: 'myoffer',
                },
            },
            { $unwind: { path: '$myoffer', preserveNullAndEmptyArrays: true } }, // Prevent data loss

            // Match only required statuses
            {
                $match: {
                    $or: [
                        { "myoffer.status": _associateOfferStatus.ordered },
                        { "myoffer.status": _associateOfferStatus.partially_ordered }
                    ]
                }
            },

            // Lookup Head Office details
            {
                $lookup: {
                    from: "headoffices",
                    let: { head_office_id: "$head_office_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", { $toObjectId: "$$head_office_id" }] } } },
                        {
                            $project: {
                                headOfficesName: "$company_details.name",
                                _id: 0
                            }
                        }
                    ],
                    as: "headOfficeDetails",
                },
            },
            { $unwind: { path: "$headOfficeDetails", preserveNullAndEmptyArrays: true } },

            // Lookup SLA details
            {
                $lookup: {
                    from: "slas",
                    let: { sla_id: "$sla_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$sla_id"] } } },
                        {
                            $project: {
                                slaName: "$basic_details.name",
                                _id: 0
                            }
                        }
                    ],
                    as: "slaDetails",
                },
            },
            { $unwind: { path: "$slaDetails", preserveNullAndEmptyArrays: true } },

            // Lookup Scheme details
            {
                $lookup: {
                    from: 'schemes',
                    let: { schemeId: "$product.schemeId" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$schemeId"] } } },
                        {
                            $project: {
                                schemeName: 1,
                                "commodityDetails.name": 1,
                                season: 1,
                                period: 1,
                                _id: 0
                            }
                        }
                    ],
                    as: 'schemeDetails',
                },
            },
            { $unwind: { path: '$schemeDetails', preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "branches",
                    let: { branch_id: "$branch_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", { $toObjectId: "$$branch_id" }] } } },
                        {
                            $project: {
                                branchName: "$branchName",
                                _id: 0
                            }
                        }
                    ],
                    as: "branchDetails",
                },
            },
            { $unwind: { path: '$branchDetails', preserveNullAndEmptyArrays: true } },
            // Add computed fields
            {
                $addFields: {
                    schemeName: {
                        $concat: [
                            { $ifNull: ["$schemeDetails.schemeName", ""] }, " ",
                           // { $ifNull: ["$schemeDetails.commodityDetails.name", ""] }, "",
                            { $ifNull: ["$product.name", "N/A"] }, " ",
                            { $ifNull: ["$schemeDetails.procurement", ""] }, " ",
                            { $ifNull: ["$schemeDetails.season", ""] }, "",
                            { $ifNull: ["$schemeDetails.period", ""] }
                        ]
                    },
                    slaName: { $ifNull: ["$slaDetails.slaName", "N/A"] },
                    headOfficesName: { $ifNull: ["$headOfficeDetails.headOfficesName", "N/A"] },
                    branchName: { $ifNull: ["$branchDetails.branchName","N/A"] },
                    commodity: { $ifNull: ["$product.name", "N/A"] },
                    cna: { $ifNull: ["$headOfficeDetails.headOfficesName", "N/A"] }
                }
            },

            {
                $group: {
                    _id: "$_id",
                    doc: { $first: "$$ROOT" }
                }
            },
            {
                $replaceRoot: { newRoot: "$doc" }
            },

             // Apply dynamic filters if they exist
             ...(schemeName ? [{ $match: { schemeName: { $regex: schemeName, $options: 'i' } } }] : []),
             ...(commodity ? [{ $match: { commodity: { $regex: commodity, $options: 'i' } } }] : []),
             ...(slaName ? [{ $match: { slaName: { $regex: slaName, $options: 'i' } } }] : []),
             ...(branchName ? [{ $match: { branchName: { $regex: branchName, $options: 'i' } } }] : []),
             ...(cna ? [{ $match: { cna: { $regex: cna, $options: 'i' } } }] : []),
            // ...(sortBy ? [{ $sort: { [sortBy]: 1 } }] : []),  // Sorting if required
            // Sorting (Always Descending)
            // { $sort: { [sortBy || "createdAt"]: -1 } }  
            { $sort: { createdAt: -1 } }

        ];
       
        // Pagination
        const pipeline = isExport == 1
            ? basePipeline // No pagination for export
            : [
                ...basePipeline,
                ...(paginate == 1 ? [{ $skip: parseInt(calculatedSkip) }, { $limit: parseInt(limit) }] : []), // Apply pagination
            ];

        // Get Data
        const [totalCountResult, paginatedResults] = await Promise.all([
            RequestModel.aggregate([...basePipeline, { $count: 'count' }]),
            RequestModel.aggregate(pipeline),
        ]);

        const totalCount = totalCountResult[0]?.count || 0;

        const records = {
            count: totalCount,
            rows: paginatedResults,
        };
        

        if (paginate == 1 && isExport != 1) {
            records.page = page;
            records.limit = limit;
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        }

        // Export to Excel
        if (isExport == 1) {
            const allRecords = await RequestModel.aggregate([...basePipeline, { $skip: 0 }, { $limit: totalCount }]);
            const record = allRecords.map((item) => {
                return {
                    "Order Id": item?.reqNo || "NA",
                    "Commodity": item?.product.name || "NA",
                    "SCHEME": item?.schemeName || "NA",
                    "CNA NAME": item?.headOfficesName || "NA",
                    "BO NAME": item?.branchName || "NA",
                    "SLA NAME": item?.slaName || "NA",
                    "SUB STANDARD": item?.product?.grade || "NA",
                    "MSP": item?.quotedPrice || "NA",
                    "SLA Name": item?.slaName || "NA",
                    "EXPECTED PROCUREMENT": item?.expectedProcurementDate || "NA",
                    "EXPECTED DELIVERY DATE": item?.deliveryDate || "NA",
                };
            });


            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Procurement-${'Procurement'}.xlsx`,
                    worksheetName: `Procurement-record-${'Procurement'}`
                });
            } else {
                return res.status(400).send(new serviceResponse({
                    status: 400,
                    data: records,
                    message: _response_message.notFound("Procurement")
                }));
            }
        } else {
            return res.status(200).send(new serviceResponse({
                status: 200,
                data: records,
                message: _response_message.found("procurement")
            }));
        }
    }
);

module.exports.getOrderedAssociate = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, sortBy, search = '', status, paginate = 1, req_id, isExport = 0 } = req.query;

    let query = search ? {
        $or: [
            { "assocaite.user_code": { $regex: search, $options: 'i' } },
            { "assocaite.basic_details.associate_details.associate_name": { $regex: search, $options: 'i' } },
        ]
    } : {};


    query.req_id = new mongoose.Types.ObjectId(req_id);
    query.status = { $in: [_associateOfferStatus.ordered, _associateOfferStatus.partially_ordered] }  // Correctly filtering by status

    const records = {};

    records.rows = await AssociateOffers.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'seller_id',
                foreignField: '_id',
                as: 'associate'  // Fixed the typo here
            }
        },
        {
            $lookup: {
                from: 'batches',
                localField: '_id',
                foreignField: 'associateOffer_id',
                as: 'batch'
            }
        },
        {
            $unwind: '$associate'
        },
        {
            $match: query
        },
        {
            $addFields: { batchcount: { $size: '$batch' } }
        },
        {
            $project: {
                _id: 1,
                offeredQty: 1,
                procuredQty: 1,
                status: 1,
                'associate._id': 1,
                'associate.user_code': 1,
                'associate.basic_details.associate_details.associate_name': 1,  // Ensure this path exists in 'users' collection
                'associate.basic_details.associate_details.organization_name': 1,
                batchcount: 1,
                req_id: 1
            }
        },

        ...(sortBy ? [{ $sort: { [sortBy]: 1 } }] : []),
        ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : []),
        {
            $limit: limit ? parseInt(limit) : 10
        }
    ]);

    records.count = await AssociateOffers.countDocuments(query);

    if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    if (isExport == 1) {

        const record = records.rows.map((item) => {

            return {
                "Associate Id": item?.associate.user_code || "NA",
                "Associate Name": item?.associate.basic_details.associate_details.associate_name || "NA",
                "Quantity Procured": item?.procuredQty || "NA",
                "Number of Batch": item?.batchcount || "NA",
            }
        })

        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `Associate Order-${'Associate Order'}.xlsx`,
                worksheetName: `Associate Order-record-${'Associate Order'}`
            });
        } else {
            return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Associate Order") }))
        }

    } else {
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Associate orders") }));
    }

})


module.exports.getBatchByAssociateOfferrs = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, sortBy, search = '', paginate = 1, associateOffer_id, isExport = 0 } = req.query;

    let query = search ? {
        $or: [
            // start of Sangita code
            { batchId: { $regex: search, $options: 'i' } },
            { status: { $regex: search, $options: 'i' } }
            // End of Sangita code     
        ]
    } : {};

    query.associateOffer_id = associateOffer_id;

    const records = {};
    records.rows = await Batch.find(query).select({ "_id": 1, "req_id": 1, "batchId": 1, "status": 1, "dispatched.dispatched_at": 1, "qty": 1, "delivered.delivered_at": 1 }) // Select fields from Batch
        .populate({
            path: 'seller_id',
            select: 'basic_details.point_of_contact',
        })
        .populate("procurementCenter_id")

    records.count = await Batch.countDocuments(query);

    if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }


    if (isExport == 1) {

        const record = records.rows.map((item) => {
            const { line1, city, district, state, country } = item?.procurementCenter_id.address;
            const { name, mobile, email } = item.procurementCenter_id.point_of_contact;

            return {
                "Batch Id": item?.batchId || "NA",
                "Procurement Center": `${line1} , ${city}, ${district}, ${state}, ${country}` || "NA",
                "Point of Contact": `${name}, ${mobile}, ${email} ` || "NA",
                "Dispatched On": item?.dispatched.dispatched_at || "NA",
                "Delivery On": item?.delivered.delivered_at || "NA",
                "Quantity Dispatched": item?.qty || "NA",
                "Status": item?.status || "NA",
            }
        })

        if (record.length > 0) {

            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `Batch-${'Batch'}.xlsx`,
                worksheetName: `Batch-record-${'Batch'}`
            });
        } else {
            return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Batch") }))
        }

    } else {

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement") }));
    }
}
)



module.exports.trackDeliveryByBatchId = async (req, res) => {

    try {

        const { id } = req.params;

        const record = await Batch.findOne({ _id: id })
            .select({ dispatched: 1, intransit: 1, delivered: 1, status: 1 })
            .populate({
                path: 'req_id', select: 'product address'
            });

        if (!record) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Track order") }] }))
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Track order") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}