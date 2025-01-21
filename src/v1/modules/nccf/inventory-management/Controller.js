const mongoose = require("mongoose");
const {
  _handleCatchErrors,
  dumpJSONToExcel, handleDecimal, _distillerMsp, _taxValue
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
      filters = {},
      isExport = 0,
    } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // Create search query
    const query = search
      ? {
          $or: [
            { "companyDetails.name": { $regex: search, $options: "i" } },
            { "ownerDetails.name": { $regex: search, $options: "i" } },
            {
              "warehouseDetails.basicDetails.warehouseName": {
                $regex: search,
                $options: "i",
              },
            },
          ],
          ...filters, // Additional filters
        }
      : filters;

    // Aggregation pipeline for fetching warehouses
    const aggregationPipeline = [
      { $match: query },
      {
        $lookup: {
          from: "warehousedetails", // Collection name in MongoDB
          localField: "_id",
          foreignField: "warehouseOwnerId",
          as: "warehouseDetails",
        },
      },
      {
        $unwind: {
          path: "$warehouseDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          warehouseId: "$warehouseOwner_code",
          warehouseName: "$warehouseDetails.basicDetails.warehouseName",
          address: "$warehouseDetails.addressDetails",
          totalCapacity: "$warehouseDetails.basicDetails.warehouseCapacity",
          utilizedCapacity: {
            $cond: {
              if: {
                $gt: [
                  { $ifNull: ["$warehouseDetails.inventory.requiredStock", 0] },
                  0,
                ],
              },
              then: "$warehouseDetails.inventory.requiredStock",
              else: "$warehouseDetails.inventory.stock",
            },
          },
          realTimeStock: "$warehouseDetails.inventory.stock",
          commodity: "$warehouseDetails.inventory.commodity", // Removed branch.product dependency
          warehouseOwnerId: "$warehouseDetails.warehouseOwnerId",
          warehouseDetailsId: "$warehouseDetails._id",
        },
      },
      { $sort: { [sortBy]: 1 } },
      { $skip: skip },
      { $limit: parseInt(limit, 10) },
    ];

    // Fetch warehouse data
    const records = { count: 0, rows: [] };
    records.rows = await wareHousev2.aggregate(aggregationPipeline);

    // Count total warehouses
    const countAggregation = [{ $match: query }, { $count: "total" }];
    const countResult = await wareHousev2.aggregate(countAggregation);
    records.count = countResult.length > 0 ? countResult[0].total : 0;

    records.page = page;
    records.limit = limit;
    records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;

    // Export functionality
    if (isExport == 1) {
      const record = records.rows.map((item) => {
        return {
          "WareHouse Name": item?.warehouseName || "NA",
          "Pickup Location": item?.pickupLocation || "NA",
          "Inventory Availability": item?.realTimeStock ?? "NA",
          "Warehouse Timing": item?.warehouseTiming ?? "NA",
          "Nodal Officer": item?.nodalOfficerName || "NA",
          "POC Name": item?.pointOfContact?.name ?? "NA",
          "POC Email": item?.pointOfContact?.email ?? "NA",
          "POC Phone": item?.pointOfContact?.phone ?? "NA",
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
        inventoryData.some((item) => !item.warehouseId || typeof item.requiredQuantity !== "number")
    ) {
        return res.status(400).send(
            new serviceResponse({ status: 400, errors: [{ message: "Invalid inventoryData provided" }] })
        );
    }

    // Fetch all warehouses to validate stock
    const warehouseIds = inventoryData.map((item) => item.warehouseId);
    const warehouses = await wareHouseDetails.find({ _id: { $in: warehouseIds } });

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
                        { "inventory.stock": { $eq: null } },     // If stock is null
                        { "inventory.stock": { $eq: 0 } },        // If stock is 0
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
