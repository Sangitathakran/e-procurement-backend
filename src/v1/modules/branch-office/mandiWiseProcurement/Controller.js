const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const mongoose = require("mongoose");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { _userType, _paymentstatus, _batchStatus, _associateOfferStatus, _paymentApproval, received_qc_status } = require('@src/v1/utils/constants');
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { AgentPayment } = require("@src/v1/models/app/procurement/AgentPayment");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { AgentInvoice } = require("@src/v1/models/app/payment/agentInvoice");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { smsService } = require("@src/v1/utils/third_party/SMSservices");
const OTPModel = require("../../../models/app/auth/OTP");
const PaymentLogsHistory = require("@src/v1/models/app/procurement/PaymentLogsHistory");
const { _collectionName} = require('@src/v1/utils/constants');
const  SLA = require("@src/v1/models/app/auth/SLAManagement");
const { Branches }= require("@src/v1/models/app/branchManagement/Branches")
const { Scheme } = require("@src/v1/models/master/Scheme");
const { User } = require("@src/v1/models/app/auth/User");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");




// module.exports.mandiWiseProcurementdata = async (req, res) => {
//   try {
//     const { batchIds } = req.body;
//     const { portalId } = req;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     // Build query for payments
//     const paymentQuery = { bo_id: portalId };
//     if (batchIds?.length) {
//       paymentQuery.batch_id = { $in: batchIds.map(id => new mongoose.Types.ObjectId(id)) };
//     }

//     const payments = await Payment.find(paymentQuery).lean();

//     const batchIdSet = [...new Set(payments.map(p => String(p.batch_id)).filter(Boolean))];

//     const batches = await Batch.find({ _id: { $in: batchIdSet } })
//       .populate({
//         path: 'farmerOrderIds',
//         model: 'FarmerOrder',
//         select: 'qty'  // Use qty because from your example that's the field name
//       })
//       .populate({
//         path: 'seller_id',
//         select: 'address.registered.district basic_details.associate_details.associate_name'
//       })
//       .populate({
//         path: 'procurementCenter_id',
//         select: 'center_name state'
//       })
//       .lean();

//     // Map batches to basic info + sum offeredQty from farmer orders
//     const combinedData = batches.map(batch => {
//       const seller = batch.seller_id;
//       const center = batch.procurementCenter_id;
//       const farmerOrders = batch.farmerOrderIds || [];

//       const offeredQty = farmerOrders.reduce((sum, order) => {
//         const qty = order?.qty ?? 0;
//         return sum + qty;
//       }, 0);

//       if (!center || !seller) return null;

//       return {
//         district: seller?.address?.registered?.district || 'Unknown',
//         associate_name: seller?.basic_details?.associate_details?.associate_name || 'Unknown',
//         offeredQty,
//         centerId: center._id.toString(),
//         centerName: center.center_name,
//         state: center.state
//       };
//     }).filter(Boolean);

//     // Group by centerName and sum offeredQty
//     const groupedData = combinedData.reduce((acc, item) => {
//       const key = item.centerName;
//       if (!acc[key]) {
//         acc[key] = {
//           centerName: item.centerName,
//           centerId: item.centerId,
//           district: item.district,
//           state: item.state,
//           associate_name: item.associate_name,
//           offeredQty: 0
//         };
//       }
//       acc[key].offeredQty += item.offeredQty;
//       return acc;
//     }, {});

//     // Convert grouped object to array
//     const groupedArray = Object.values(groupedData);

//     // Pagination on grouped data
//     const totalRecords = groupedArray.length;
//     const paginatedData = groupedArray.slice(skip, skip + limit);

//     return res.status(200).json({
//       success: true,
//       page,
//       limit,
//       totalRecords,
//       totalPages: Math.ceil(totalRecords / limit),
//       data: paginatedData
//     });

//   } catch (error) {
//     console.error("Error in mandiWiseProcurementdata:", error);
//     return res.status(500).json({ success: false, message: "Server Error", error: error.message });
//   }
// };



// module.exports.mandiWiseProcurementdata = async (req, res) => {
//   try {
//     const { batchIds } = req.body;
//     const { portalId } = req;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     // Step 1: Find payment batches for portal
//     const paymentQuery = { bo_id: portalId };
//     if (batchIds?.length) {
//       paymentQuery.batch_id = {
//         $in: batchIds.map((id) => new mongoose.Types.ObjectId(id)),
//       };
//     }

//     const payments = await Payment.find(paymentQuery).lean();
//     const batchIdSet = [...new Set(payments.map((p) => String(p.batch_id)).filter(Boolean))];

//     // Step 2: Aggregate batches with sellers, centers and associate offers
//     const aggregated = await Batch.aggregate([
//       {
//         $match: {
//           _id: { $in: batchIdSet.map(id => new mongoose.Types.ObjectId(id)) },
//         },
//       },
//       // Lookup seller info
//       {
//         $lookup: {
//           from: "users",
//           localField: "seller_id",
//           foreignField: "_id",
//           as: "seller"
//         }
//       },
//       { $unwind: "$seller" },

//       // Lookup procurement center info
//       {
//         $lookup: {
//           from: "procurementcenters",
//           localField: "procurementCenter_id",
//           foreignField: "_id",
//           as: "center"
//         }
//       },
//       { $unwind: "$center" },

//       // Lookup associate offer (one per seller)
//       {
//         $lookup: {
//           from: "associateoffers",
//           localField: "seller_id",
//           foreignField: "seller_id",
//           as: "associateOffer"
//         }
//       },
//       // Unwind associateOffer (if none found, preserve with null)
//       {
//         $unwind: {
//           path: "$associateOffer",
//           preserveNullAndEmptyArrays: true
//         }
//       },

//       // Group by procurement center
//       {
//         $group: {
//           _id: "$procurementCenter_id",
//           centerName: { $first: "$center.center_name" },
//           centerId: { $first: "$center._id" },
//           state: { $first: "$center.state" },
//           district: { $first: "$seller.address.registered.district" },
//           associate_name: { $first: "$seller.basic_details.associate_details.associate_name" },
//           liftedQty: { $sum: "$qty" }, // assuming Batch.qty field
//           // Sum associate offeredQty, if no associateOffer then 0
//           offeredQty: { $first: "$associateOffer.offeredQty" }
//         }
//       },

//       { $sort: { centerName: 1 } }
//     ]);

//     // Pagination
//     const totalRecords = aggregated.length;
//     const paginatedData = aggregated.slice(skip, skip + limit);

//     return res.status(200).json({
//       success: true,
//       page,
//       limit,
//       totalRecords,
//       totalPages: Math.ceil(totalRecords / limit),
//       data: paginatedData
//     });

//   } catch (error) {
//     console.error("Error in mandiWiseProcurementdata:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server Error",
//       error: error.message
//     });
//   }
// };

module.exports.mandiWiseProcurementdata = async (req, res) => {
  try {
    const { batchIds } = req.body;
    const { portalId } = req;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Step 1: Find all payments related to this portal and batches
    const paymentQuery = { bo_id: portalId };
    if (batchIds?.length) {
      paymentQuery.batch_id = {
        $in: batchIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    const payments = await Payment.find(paymentQuery).lean();
    const batchIdSet = [...new Set(payments.map((p) => String(p.batch_id)).filter(Boolean))];

    // Step 2: Aggregate batches with seller, center, associateOffer, sum quantities, calculate balance
    const aggregated = await Batch.aggregate([
      {
        $match: {
          _id: { $in: batchIdSet.map((id) => new mongoose.Types.ObjectId(id)) },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "seller_id",
          foreignField: "_id",
          as: "seller"
        }
      },
      { $unwind: "$seller" },
      {
        $lookup: {
          from: "procurementcenters",
          localField: "procurementCenter_id",
          foreignField: "_id",
          as: "center"
        }
      },
      { $unwind: "$center" },
      {
        $lookup: {
          from: "associateoffers",
          localField: "seller_id",
          foreignField: "seller_id",
          as: "associateOffer"
        }
      },
      // Since you have only one associateOffer per seller, unwind it but preserve if missing
      {
        $unwind: {
          path: "$associateOffer",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: "$procurementCenter_id",
          centerName: { $first: "$center.center_name" },
          Status: { $first: "$center.active" },
          centerId: { $first: "$center._id" },
          district: { $first: "$seller.address.registered.district" },
          associate_name: { $first: "$seller.basic_details.associate_details.associate_name" },
          liftedQty: { $sum: "$qty" },
          offeredQty: { $first: { $ifNull: ["$associateOffer.offeredQty", 0] } }
        }
      },
     {
        $addFields: {
            balanceMandi: { $subtract: ["$offeredQty", "$liftedQty"] },
            liftingPercentage: {
            $cond: {
                if: { $gt: ["$offeredQty", 0] },  // avoid division by 0
                then: {
                $round: [
                    {
                    $multiply: [
                        { $divide: ["$liftedQty", "$offeredQty"] },
                        100
                    ]
                    },
                    2  // round to 2 decimal places
                ]
                },
                else: 0
            }
            }
        }
        },
      { $sort: { centerName: 1 } }
    ]);

    const totalRecords = aggregated.length;
    const paginatedData = aggregated.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      data: paginatedData
    });

  } catch (error) {
    console.error("Error in mandiWiseProcurementdata:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

