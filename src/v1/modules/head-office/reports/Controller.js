const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const mongoose = require("mongoose");

module.exports.Reports = async (req, res) => {
  try {
    const { _id } = req.user.portalId;
    let { schemeId = [], branchId = [],fields={} } = req.body;
    let { page = 1, skip = 0, limit = 10, isExport = 0 } = req.query;



    schemeId = schemeId?.map((id) => new mongoose.Types.ObjectId(id)) || [];
    branchId = branchId?.map((id) => new mongoose.Types.ObjectId(id)) || [];

    const dataPipeline = [
      {
        $match: {
          $or: [
            { "product.schemeId": { $in: schemeId } },
            { "product.branchId": { $in: branchId } },
            { head_office_id: new mongoose.Types.ObjectId(_id) }
          ]
        }
      },

      // --- Schemes ---
      {
        $lookup: {
          from: "schemes",
          let: { schemeId: "$product.schemeId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$schemeId"] } } },
            { $project: { commodity_id: 1, schemeName: 1 } }
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
            {
              $project: {
                _id: 1,
                associateName:
                  "$basic_details.associate_details.organization_name"
              }
            }
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
                status: { $in: ["Payment Complete", "Delivered"] }
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
            {
              $project: {
                batchId: 1,
                farmerOrderIds: 1,
                qty: 1,
                warehouseName: {
                  $arrayElemAt: ["$warehouse.basicDetails.warehouseName", 0]
                }
              }
            }
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
                from: "procurementcenters",
                localField: "procurementCenter_id",
                foreignField: "_id",
                as: "procurementCenter"
              }
            },
            {
              $project: {
                _id: 1,
                offeredQty: 1,
                order_no: 1,
                farmer_id: 1,
                center_name: {
                  $arrayElemAt: ["$procurementCenter.center_name", 0]
                }
              }
            }
          ],
          as: "farmerOrdersData"
        }
      },
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

   
      ...(isExport === 1
        ? []
        : [
            { $skip: skip},
            { $limit: limit }
          ]),

     
      {
        $project: {
          _id: 1,
          OrderId: "$reqNo",
          batcheId: "$batches.batchId",
          batchQty: "$batches.qty",
          farmerName: "$farmers.name",
          farmer_qty: "$farmerOrdersData.offeredQty",
          commodityName: "$commodities.name",
          schemeName: "$schemes.schemeName",
          lot_id: "$farmerOrdersData.order_no",
          associateName: "$users.associateName",
          msp: "$quotedPrice",
          center_name: "$farmerOrdersData.center_name",
          warehouseName: "$batches.warehouseName"
        }
      }
    ];

    const data = await RequestModel.aggregate(dataPipeline).allowDiskUse(true);
    if(isExport == 1) {
      const fieldConfig = fields && typeof fields === "object" ? fields : {};
      const selectedFields = Object.keys(fieldConfig).filter(key => fieldConfig[key]);
      const exportData = data.map(item => {
        const exportedItem = {};
        selectedFields.forEach(field => {
          exportedItem[field] = item[field];
        });
        return exportedItem;
      });

   
    
     return dumpJSONToExcel(req, res,
      {
        data: exportData,
        fileName: `farmer-report.xlsx`,
        sheetName: "Farmer Report",

      }
     )
    }

    sendResponse({
      res,
      status: 200,
      data,
      message: "Report generated successfully"
    });
  } catch (error) {
    sendResponse({
      res,
      status: 500,
      message: "Internal Server Error",
      errors: [error.message],
      errorCode: "INTERNAL_SERVER_ERROR"
    });
  }
};


