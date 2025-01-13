const mongoose = require("mongoose");
const {
  _handleCatchErrors,
  dumpJSONToExcel,
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
          errors: [{ message: "Some warehouses were not found" }],
        })
      );
    }

    // Validate requiredStock against inventory.stock
    for (const { warehouseId, requiredQuantity } of inventoryData) {
      const warehouse = warehouses.find(
        (w) => w._id.toString() === warehouseId
      );
      if (!warehouse) {
        return res.status(400).send(
          new serviceResponse({
            status: 400,
            errors: [{ message: `Warehouse ${warehouseId} not found` }],
          })
        );
      }
      if (requiredQuantity > warehouse.inventory.stock) {
        return res.status(400).send(
          new serviceResponse({
            status: 400,
            errors: [
              {
                message: `Required quantity ${requiredQuantity} exceeds stock ${warehouse.inventory.stock} for warehouse ${warehouseId}`,
              },
            ],
          })
        );
      }
    }

    // Perform bulk update
    const bulkOperations = inventoryData.map(
      ({ warehouseId, requiredQuantity }) => ({
        updateOne: {
          filter: { _id: warehouseId },
          update: {
            $set: { "inventory.requiredStock": requiredQuantity },
          },
        },
      })
    );

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
