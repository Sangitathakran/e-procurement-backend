const mongoose = require("mongoose");
const {
  _handleCatchErrors,
  dumpJSONToExcel,
  handleDecimal,
  _distillerMsp,
  _taxValue,
} = require("@src/v1/utils/helpers");
const {
  wareHousev2,
} = require("@src/v1/models/app/warehouse/warehousev2Schema");

const {
  _response_message,
  _middleware,
  _auth_module,
  _query,
} = require("@src/v1/utils/constants/messages");
const {
  PurchaseOrderModel,
} = require("@src/v1/models/app/distiller/purchaseOrder");
const {
  serviceResponse,
  sendResponse,
} = require("@src/v1/utils/helpers/api_response");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");

const {
  wareHouseDetails,
} = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");

module.exports.warehouseList = asyncErrorHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy,
      search = "",
      state="",
      district="",
      filters = {},
      isExport = 0,
    } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    let query = {
      ...(state || district
        ? {
            $and: [
              ...(state
                ? [{ "addressDetails.state.state_name": { $regex: state, $options: "i" } }]
                : []),
              ...(district
                ? [{ "addressDetails.district.district_name": { $regex: district, $options: "i" } }]
                : []),
            ],
          }
        : {}),
    };
      const aggregationPipeline = [
        { $match: query },
        {
          $lookup: {
            from: "warehousev2", // Collection name in MongoDB
            localField: "warehouseOwnerId",
            foreignField: "_id",
            as: "warehousev2Details",
          },
        },
        {
          $unwind: {
            path: "$warehousev2Details",
            preserveNullAndEmptyArrays: true,
          },
        },
      
        // Add a search filter stage
        ...(search
          ? [
              {
                $match: {
                  $or: [
                    { "basicDetails.warehouseName": { $regex: search, $options: "i" } },
                    {
                      $expr: {
                        $regexMatch: {
                          input: {
                            $cond: {
                              if: { $ifNull: ["$warehouseDetailsId", false] },
                              then: "$warehouseDetailsId",
                              else: "$warehousev2Details.warehouseOwner_code",
                            },
                          },
                          regex: search,
                          options: "i",
                        },
                      },
                    },
                  ],
                },
              },
            ]
          : []),
        {
          $project: {
            warehouseName: "$basicDetails.warehouseName",
            totalCapacity: "$basicDetails.warehouseCapacity",
      
            pickupLocation: "$addressDetails",
            commodity: "Maize",
            stock: {
              $cond: {
                if: { $gt: [{ $ifNull: ["$inventory.requiredStock", 0] }, 0] },
                then: "$inventory.requiredStock",
                else: "$inventory.stock",
              },
            },
            warehouseTiming: "$inventory.warehouse_timing",
            warehouseCapacity: "$warehouseDetails.basicDetails.warehouseCapacity",
            utilizedCapacity: {
              $cond: {
                if: { $gt: [{ $ifNull: ["$inventory.stock", 0] }, 0] },
                then: "$inventory.requiredStock",
                else: "$inventory.stock",
              },
            },
            requiredStock: {
              $cond: {
                if: { $gt: [{ $ifNull: ["$inventory.requiredStock", 0] }, 0] },
                then: "$inventory.stock",
                else: "$inventory.requiredStock",
              },
            },
            nodalOfficerName: "$warehousev2Details.ownerDetails.name",
            nodalOfficerContact: "$warehousev2Details.ownerDetails.mobile",
            nodalOfficerEmail: "$warehousev2Details.ownerDetails.email",
            pocAtPickup: "$authorizedPerson.name",
            warehouseOwnerId: "$warehouseOwnerId",
            warehouseId: {
              $cond: {
                if: { $ifNull: ["$warehouseDetailsId", 0] },
                then: "$warehouseDetailsId",
                else: "$warehousev2Details.warehouseOwner_code",
              },
            },
            // orderId: order_id,
            // branch_id: branch.branch_id
          },
        },         { $sort: { createdAt: -1, _id: -1 } }
      ];
      
      if (!isExport) {
        aggregationPipeline.push(
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit)}
        );
    } 

    const records = { count: 0 };
    records.rows = await wareHouseDetails.aggregate(aggregationPipeline);
    const countAggregation = [{ $match: query }, { $count: "total" }];
    const countResult = await wareHouseDetails.aggregate(countAggregation);
    records.count = countResult.length > 0 ? countResult[0].total : 0;
    records.page = page;
    records.limit = limit;
    records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
   
   
    // Export functionality
    if (isExport == 1) {
      const record = records.rows.map((item) => {
        return {
          "WarehouseId": item?.warehouseId ?? "NA",
          "WareHouse Name": item?.warehouseName || "NA",
          "Total Capacity": item?.totalCapacity || "NA",
          "Pickup Location": item?.pickupLocation ?? "NA",
          "Commodity": item?.commodity ?? "NA",
          "Stock": item?.stock || "NA",
          "Warehouse Timing": item?.warehouseTiming ?? "NA",
          "Utilized Capacity": item?.utilizedCapacity ?? "NA",
          "Required Stock": item?.requiredStock ?? "NA",
          "Nodal Officer Name": item?.nodalOfficerName ?? "NA",
          "Nodal Officer Contact": item?.nodalOfficerContact ?? "NA",
          "Nodal Officer Email": item?.nodalOfficerEmail ?? "NA",
          "POC At Pickup": item?.pocAtPickup ?? "NA"
        };

      });

      if (record.length > 0) {
        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `warehouse-List.xlsx`,
          worksheetName: `warehouse-List`,
        });
      } else {
        return res.send(
          new serviceResponse({
            status: 200,
            data: records,
            message: _response_message.found("warehouse"),
          })
        );
      }
    } else {
      return res.send(
        new serviceResponse({
          status: 200,
          data: records,
          message: _response_message.found("warehouse"),
        })
      );
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.requiredStockUpdate = asyncErrorHandler(async (req, res) => {
  try {
    const { inventoryData } = req.body;

    // Validate input
    if (
      !inventoryData ||
      !Array.isArray(inventoryData) ||
      inventoryData.length === 0 ||
      inventoryData.some(
        (item) => !item.warehouseId || typeof item.requiredQuantity !== "number"
      )
    ) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: "Invalid inventoryData provided" }],
        })
      );
    }

    // Fetch all warehouses to validate stock
    const warehouseIds = inventoryData.map((item) => item.warehouseId);
    const warehouses = await wareHouseDetails.find({
      _id: { $in: warehouseIds },
    });

    // Check if all warehouseIds are valid
    if (warehouses.length !== inventoryData.length) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: "Warehouses were not found" }],
        })
      );
    }

    // Prepare bulk operations
    const bulkOperations = [];

    inventoryData.forEach(({ warehouseId, requiredQuantity }) => {
      // Filter to update both stock and requiredStock if stock is undefined, null, or 0
      bulkOperations.push({
        updateOne: {
          filter: {
            _id: warehouseId,
            $or: [
              { "inventory.stock": { $exists: false } }, // If stock is undefined
              { "inventory.stock": { $eq: null } }, // If stock is null
              { "inventory.stock": { $eq: 0 } }, // If stock is 0
            ],
          },
          update: {
            $set: {
              "inventory.requiredStock": handleDecimal(requiredQuantity),
              "inventory.stock": handleDecimal(requiredQuantity), // Update stock if undefined, null, or 0
            },
          },
        },
      });

      // Filter to update only requiredStock if stock is already defined and greater than 0
      bulkOperations.push({
        updateOne: {
          filter: {
            _id: warehouseId,
            "inventory.stock": { $gt: 0 }, // Ensure stock is greater than 0
          },
          update: {
            $set: {
              "inventory.requiredStock": handleDecimal(requiredQuantity), // Only update requiredStock
            },
          },
        },
      });
    });

    // Execute bulk operations
    const result = await wareHouseDetails.bulkWrite(bulkOperations);

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        message: `${result.modifiedCount} Required Quantity updated successfully`,
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});
