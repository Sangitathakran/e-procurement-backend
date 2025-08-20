const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const mongoose = require("mongoose");

module.exports.Reports = async (req, res) => {
  const { _id } = req.user.portalId;
  try {
    let { schemeId = [], branchId = [] } = req.body;

    // ✅ Convert strings to ObjectId
    schemeId = schemeId.map((id) => new mongoose.Types.ObjectId(id));
    branchId = branchId.map((id) => new mongoose.Types.ObjectId(id));

    console.log("schemeId", schemeId);
    console.log("branchId", branchId);

    const aggregation = [
        {
          $match: {
            "product.schemeId": { $in: schemeId },
            head_office_id: new mongoose.Types.ObjectId(_id),
            branch_id: { $in: branchId }
          }
        },
     
        // --- Schemes ---
        {
          $lookup: {
            from: "schemes",
            let: { schemeId: "$product.schemeId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$schemeId"] } } },
              { $project: { commodity_id: 1 } }
            ],
            as: "schemes"
          }
        },
        { $unwind: { path: "$schemes", preserveNullAndEmptyArrays: true } },
      
        // --- Commodities ---
        {
          $lookup: {
            from: "commodities",
            let: { commodityId: "$schemes.commodity_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$commodityId"] } } },
              { $project: { name: 1 } }
            ],
            as: "commodities"
          }
        },
        { $unwind: { path: "$commodities", preserveNullAndEmptyArrays: true } },
      
        // --- Associate Offers ---
        {
          $lookup: {
            from: "associateoffers",
            let: { reqId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$req_id", "$$reqId"] } } },
              { $project: { seller_id: 1 } }
            ],
            as: "associateoffers"
          }
        },
        { $unwind: { path: "$associateoffers", preserveNullAndEmptyArrays: true } },
      
        // --- Seller Users ---
        {
          $lookup: {
            from: "users",
            let: { sellerId: "$associateoffers.seller_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$sellerId"] } } },
              { $project: { _id: 1, associateName: "$basic_details.associate_details.organization_name" } }
            ],
            as: "users"
          }
        },
        { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
      
        // --- Batches ---
        {
          $lookup: {
            from: "batches",
            let: { offerId: "$associateoffers._id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$associateOffer_id", "$$offerId"] },
                  status:{  $in: ["Payment Complete","Delivered"] } 
                }
              },
              {
                $lookup: {
                    from: "warehousedetails",
                    localField: "warehousedetails_id",
                    foreignField: "_id",
                    as: "warehouse"
                }
              },
              { $project: { batchId: 1, farmerOrderIds: 1, qty: 1,warehouseName:{$arrayElemAt:["$warehouse.basicDetails.warehouseName",0]} } }
            ],
            as: "batches"
          }
        },
        { $unwind: { path: "$batches", preserveNullAndEmptyArrays: true } },
      
        // --- Farmer Orders ---
        {
            $lookup: {
              from: "farmerorders",
              let: {
                farmerOrderIds: {
                  $ifNull: ["$batches.farmerOrderIds.farmerOrder_id", []]
                }
              },
              pipeline: [
                {
                  $match: {
                    $expr: { $in: ["$_id", "$$farmerOrderIds"] }
                  }
                },
                {
                  $lookup: {
                    from: "procurementcenters",   // 🔗 Directly join here
                    localField: "procurementCenter_id",
                    foreignField: "_id",
                    as: "procurementCenter"
                  }
                },
                {
                  $project: {
                    _id: 1,
                    qtyRemaining: 1,
                    order_no: 1,
                    farmer_id: 1,
                    center_name: { $arrayElemAt: ["$procurementCenter.center_name", 0] } // ✅ inline flatten
                  }
                }
              ],
              as: "farmerOrdersData"
            }
          }
          ,
        { $unwind: { path: "$farmerOrdersData", preserveNullAndEmptyArrays: true } },
      
        // --- Farmers ---
        {
          $lookup: {
            from: "farmers",
            let: { farmer_id: "$farmerOrdersData.farmer_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$farmer_id"] } } },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  address: 1,
                  bank_details: 1
                }
              }
            ],
            as: "farmers"
          }
        },
        { $unwind: { path: "$farmers", preserveNullAndEmptyArrays: true } },
       {$limit: 10}, // Limit the number of documents to 1000
        // --- Final Projection ---
        {
          $project: {
            _id: 1,
            OrderId: "$reqNo",
            batcheId: "$batches.batchId",
            batchQty: "$batches.qty",
            farmerName: "$farmers.name",
            farmerqty: "$farmerOrdersData.qtyRemaining",
            commodityName: "$commodities.name",
            schemeName: "$schemes.schemeName",
            lot_id:"$farmerOrdersData.order_no",
            associateName: "$users.associateName",
            msp: "$quotedPrice",
            center_name: "$farmerOrdersData.center_name",
            warehouseName: "$batches.warehouseName",

          }
        },
      
        
      ];
      

    const data = await RequestModel.aggregate(aggregation).allowDiskUse(true);

    res.status(200).json({
      success: true,
      message: "Report generated successfully",
      data
    });

  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate report",
      error: error.message
    });
  }
};

