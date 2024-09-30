const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { _associateOfferStatus } = require("@src/v1/utils/constants");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");

module.exports.getProcurement = asyncErrorHandler(
    async (req, res) => {
        const { page, limit, skip, sortBy, search = '', status, paginate = 1 } = req.query;

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
            { $match: { 'myoffer.status': _associateOfferStatus.ordered } },
            { $limit: limit ? parseInt(limit) : 10 },
            ...(sortBy ? [{ $sort: { [sortBy]: 1 } }] : []),  // Sorting if required
            ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : []) // Pagination if required
        ];

        const records = {};
        records.rows = await RequestModel.aggregate(pipeline);
        records.count = records.rows.length;


        if (paginate == 1) {
            records.page = page;
            records.limit = limit;
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        }
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement") }));
    }
)


module.exports.getOrderedAssociate = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, sortBy, search = '', status, paginate = 1 } = req.query;

    let query = search ? {
        $or: [
            { "assocaite.user_code": { $regex: search, $options: 'i' } },
            { "assocaite.basic_details.associate_details.associate_name": { $regex: search, $options: 'i' } },
        ]
    } : {};


    const records = {};
    records.rows = await AssociateOffers.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'seller_id',
                foreignField: '_id',
                as: 'assocaite',

            }
        },
        {
            $lookup: {
                from: 'batches',
                localField: '_id',
                foreignField: 'associateOffer_id',
                as: 'batch',

            }
        },
        { $unwind: '$assocaite' },
        { $match: query },
        { $addFields: { batchcount: { $size: '$batch' } } },
        { $match: { status: _associateOfferStatus.ordered } },
        {
            $project: {
                _id: 1,
                offeredQty: 1,
                procuredQty: 1,
                status: 1,
                'assocaite._id': 1,
                'assocaite.user_code': 1,
                'assocaite.basic_details.associate_details.associate_name': 1,
                batchcount: 1
            }
        },
        { $limit: limit ? parseInt(limit) : 10 },
        ...(sortBy ? [{ $sort: { [sortBy]: 1 } }] : []),  // Sorting if required
        ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : []) // Pagination if required
    ]);
    records.count = records.rows.length;

    if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Associate orders") }));

})
