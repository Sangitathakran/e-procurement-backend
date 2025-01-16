const mongoose = require('mongoose');
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const { User } = require("@src/v1/models/app/auth/User");
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");

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
