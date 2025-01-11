const mongoose = require('mongoose');
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const { User } = require("@src/v1/models/app/auth/User");
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");

// module.exports.getDistiller = async (req, res) => {
//     try {
//         // Extract query parameters with defaults
//         const {
//           page = 1,
//           limit = 10,
//           sortBy = "createdAt",
//           order = "desc",
//           search = "",
//           paginate = 1,
//           isExport = 0,
//         } = req.query;
    
//         const skip = (page - 1) * limit;
    
//         // Build the query
//         const query = {
//           deletedAt: null,
//           ...(search && { "basic_details.distiller_details.organization_name": { $regex: search, $options: "i" } }),
//         };
    
//         // Determine the sort order
//         const sortOrder = order === "desc" ? -1 : 1;
    
//         // Fetch data
//         let rows;
//         if (paginate == 1) {
//           rows = await Distiller.find(query)
//             .sort({ [sortBy]: sortOrder })
//             .skip(parseInt(skip))
//             .limit(parseInt(limit));
//         } else {
//           rows = await Distiller.find(query).sort({ [sortBy]: sortOrder });
//         }
    
//         // Count total documents
//         const count = await Distiller.countDocuments(query);
    
//         // Prepare response
//         const records = {
//           rows,
//           count,
//         };
    
//         if (paginate == 1) {
//           records.page = parseInt(page);
//           records.limit = parseInt(limit);
//           records.pages = limit != 0 ? Math.ceil(count / limit) : 0;
//         }
    
//         // Handle export logic (if needed)
//         if (isExport == 1) {
//           // Placeholder for export functionality
//           // You can implement file export logic here if required
//         }
    
//         return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Distiller") }));
//       } catch (error) {
//         console.error("Error fetching distillers:", error);
//         _handleCatchErrors(error, res);
//       }
//     };
// module.exports.getDistiller  = asyncErrorHandler(async (req, res) => {

//     const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = "_id", search = '', isExport = 0 } = req.query;
  
//     let matchStage = {
//         deletedAt: null,
//     };

//     if (search) {
//         matchStage.orderId = { $regex: search, $options: "i" };
//     }

//     let aggregationPipeline = [
//         { $match: matchStage },
//         { $sort: { [sortBy]: 1 } },
//         {
//             $lookup: {
//                 from: 'purchaseorders', // Replace with your actual PurchaseOrder collection name
//                 localField: '_id', // Field in Distiller collection
//                 foreignField: 'distiller_id', // Field in PurchaseOrder collection
//                 as: 'purchaseOrders',
//             }
//         },
//         {
//             $addFields: {
//                 productNames: {
//                     $map: {
//                         input: '$purchaseOrders',
//                         as: 'order',
//                         in: '$$order.product.name', // Fetch product name
//                     }
//                 }
//             }
//         },
//         {
//             $project: {
//                 _id: 1,
//                 'distiller_id': '$user_code',
//                 'distiller_name': '$basic_details.distiller_details.organization_name',
//                 'poc': '$basic_details.point_of_contact.name',
//                 'address': '$address.registered',
//                 'request_date': '$createdAt',
//                 'status': '$is_approved',
//                 productNames: 1,
//             }
//         }
//     ];

//     if (paginate == 1) {
//         aggregationPipeline.push(
//             { $skip: parseInt(skip) },
//             { $limit: parseInt(limit) }

//         );
//     }

//     const records = { count: 0 };
//     records.rows = await Distiller.aggregate(aggregationPipeline);
//     records.count = await Distiller.countDocuments(matchStage);

//     if (paginate == 1) {
//         records.page = page;
//         records.limit = limit;
//         records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
//     }

//     return res.status(200).send(new serviceResponse({
//         status: 200,
//         data: records,
//         message: _response_message.found("Pending Distiller")
//     }));
// });
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
                from: 'purchaseorders', // Replace with your actual PurchaseOrder collection name
                localField: '_id', // Field in Distiller collection
                foreignField: 'distiller_id', // Field in PurchaseOrder collection
                as: 'purchaseOrders',
            }
        },
        { $unwind: { path: '$purchaseOrders', preserveNullAndEmptyArrays: true } }, // Flatten purchaseOrders array
        {
            $group: {
                _id: { distiller_id: '$_id', product_name: '$purchaseOrders.product.name' },
                distiller_name: { $first: '$basic_details.distiller_details.organization_name' },
                poc: { $first: '$basic_details.point_of_contact.name' },
                address: { $first: '$address.registered' },
                request_date: { $first: '$createdAt' },
                status: { $first: '$is_approved' },
                total_quantity: {
                    $sum: { $ifNull: ['$purchaseOrders.poQuantity', 0] } // Handle missing poQuantity
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
                products: {
                    $push: {
                        product_name: '$_id.product_name',
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
                products: 1, // Array of products with their quantities
            }
        }
    ];

    if (paginate == 1) {
        aggregationPipeline.push(
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    }

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
        message: _response_message.found("Pending Distiller")
    }));
});
