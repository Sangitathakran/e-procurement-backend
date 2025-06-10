const {
  _handleCatchErrors,
  dumpJSONToExcel,
} = require("@src/v1/utils/helpers");
const {
  sendResponse,
  serviceResponse,
} = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const {
  wareHousev2,
} = require("@src/v1/models/app/warehouse/warehousev2Schema");
const {
  wareHouseDetails,
} = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const {
  PurchaseOrderModel,
} = require("@src/v1/models/app/distiller/purchaseOrder");
// const { BatchOrderProcess } = require("@src/v1/models/app/distiller/batchOrderProcess");

module.exports.warehouseList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy,
      search = "",
      filters = {},
      order_id,
      isExport = 0,
    } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    if (!order_id) {
      return res.send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("order_id") }],
        })
      );
    }

    const branch = await PurchaseOrderModel.findOne({ _id: order_id })
      .select({ _id: 0, branch_id: 1, paymentInfo: 1, purchasedOrder: 1 })
      .lean();

    const aggregationPipeline = [
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
      {
        $addFields: {
          fullAddress: {
            $concat: [
              { $ifNull: ["$addressDetails.addressLine1", ""] },
              ",",
              { $ifNull: ["$addressDetails.addressLine2", ""] }
            ]
          }
        }
      },
      {
        $match: {
          $or: [
            {
              "addressDetails.addressLine1": {
                $regex: search,
                $options: "i",
              },
            },
            {
              "addressDetails.addressLine2": {
                $regex: search,
                $options: "i",
              },
            },
            { "fullAddress": { $regex: search, $options: "i" } },
            { "basicDetails.warehouseName": { $regex: search, $options: "i" } },
          ],
        },
      },
      {
        $addFields: {
          advancePayment: { $literal: branch.paymentInfo?.advancePayment ?? null },
          balancePayment: { $literal: branch.paymentInfo?.balancePayment ?? null },
          mandiTax: { $literal: branch.paymentInfo?.mandiTax ?? null },
          poQuantity: { $literal: branch.purchasedOrder?.poQuantity ?? null },
          branch_id: { $literal: branch.branch_id },
          orderId: { $literal: order_id }
        }
      },
      {
        $project: {
          warehouseName: "$basicDetails.warehouseName",
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
          orderId: order_id,
          branch_id: branch.branch_id,
          advancePayment: 1,
          balancePayment: 1,
          mandiTax: 1,
          poQuantity: 1,
        },
      },

      { $sort: { [sortBy || "createdAt"]: -1, _id: -1 } },
    ];

    const copyAggregationPipeline = [...aggregationPipeline];

    if (!isExport) {
      aggregationPipeline.push(
        {
          $skip: parseInt(skip) || (parseInt(page) - 1) * parseInt(limit),
        },
        {
          $limit: parseInt(limit),
        }
      );
    }

    const records = { count: 0, rows: [] };

    // Export functionality
    if (isExport == 1) {
      records.rows = await wareHouseDetails.aggregate(copyAggregationPipeline);
      const record = records.rows.map((item) => {
        return {
          "WareHouse Name": item?.warehouseName || "NA",
          "pickup Location": item?.pickupLocation || "NA",
          "Inventory availalbility": item?.stock ?? "NA",
          "warehouse Timing": item?.warehouseTiming ?? "NA",
          "Nodal officer": item?.nodalOfficerName || "NA",
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
      records.rows = await wareHouseDetails.aggregate(aggregationPipeline);

      copyAggregationPipeline.push({ $count: "total" });
      const countResult = await wareHouseDetails.aggregate(
        copyAggregationPipeline
      );
      records.count = countResult.length > 0 ? countResult[0].total : 0;

      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
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
};
