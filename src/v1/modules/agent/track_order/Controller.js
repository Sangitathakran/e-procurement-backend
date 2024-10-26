const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { _associateOfferStatus } = require("@src/v1/utils/constants");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const mongoose = require("mongoose");

module.exports.getProcurement = asyncErrorHandler(
    async (req, res) => {
        const { page, limit, skip, sortBy, search = '', status, paginate = 1, isExport = 0 } = req.query;


        let query = search ? {
            $or: [
                { "reqNo": { $regex: search, $options: 'i' } },
                { "product.name": { $regex: search, $options: 'i' } },
                { "product.grade": { $regex: search, $options: 'i' } },
            ]
        } : {};

        // Aggregation pipeline to join with AssociateOffers
        const pipeline = [
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
            { $limit: limit ? parseInt(limit) : 10 },
            ...(sortBy ? [{ $sort: { [sortBy]: 1 } }] : []),  // Sorting if required
            ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : []) // Pagination if required
        ];

        const records = {};
        records.rows = await RequestModel.aggregate(pipeline);
        records.count = await RequestModel.countDocuments(query);


        if (paginate == 1) {
            records.page = page;
            records.limit = limit;
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {

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
                return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Procurement") }))
            }

        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement") }));

        }
    }
)


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
                batchcount: 1,
                req_id: 1
            }
        },
        {
            $limit: limit ? parseInt(limit) : 10
        },
        ...(sortBy ? [{ $sort: { [sortBy]: 1 } }] : []),
        ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : [])
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
            return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Associate Order") }))
        }

    } else {
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Associate orders") }));
    }

})


module.exports.getBatchByAssociateOfferrs = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, sortBy, search = '', paginate = 1, associateOffer_id, isExport = 0 } = req.query;

    let query = search ? {
        $or: []
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
            return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Batch") }))
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
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Track order") }] }))
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Track order") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}