const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const mongoose = require("mongoose");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { Payment } = require("@src/v1/models/app/procurement/Payment");


module.exports.mandiWiseProcurementdata = async (req, res) => {
  try {
    const { portalId } = req;
    let page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;
    const isExport = parseInt(req.query.isExport) === 1;
    const centerNames = req.query.search?.trim();
    const searchDistrict = req.query.districtNames
      ? Array.isArray(req.query.districtNames)
        ? req.query.districtNames
        : req.query.districtNames.split(',').map(c => c.trim())
      : null;
    
    const paymentQuery = { bo_id: portalId };
    const payments = await Payment.find(paymentQuery).lean();
    const batchIdSet = [...new Set(payments.map(p => String(p.batch_id)).filter(Boolean))];

    
    const pipeline = [
      {
        $match: {
          _id: { $in: batchIdSet.map(id => new mongoose.Types.ObjectId(id)) },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "seller_id",
          foreignField: "_id",
          as: "seller",
        },
      },
      { $unwind: "$seller" },
      {
        $lookup: {
          from: "procurementcenters",
          localField: "procurementCenter_id",
          foreignField: "_id",
          as: "center",
        },
      },
      { $unwind: "$center" },
      {
        $lookup: {
          from: "associateoffers",
          localField: "seller_id",
          foreignField: "seller_id",
          as: "associateOffer",
        },
      },
      {
        $unwind: {
          path: "$associateOffer",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "requests",
          localField: "req_id",
          foreignField: "_id",
          as: "relatedRequest",
        },
      },
      {
        $unwind: {
          path: "$relatedRequest",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          liftedDataDays: {
            $cond: [
              { $and: ["$createdAt", "$relatedRequest.createdAt"] },
              {
                $dateDiff: {
                  startDate: "$relatedRequest.createdAt",
                  endDate: "$createdAt",
                  unit: "day",
                },
              },
              null,
            ],
          },
          purchaseDays: {
            $cond: [
              { $and: ["$updatedAt", "$relatedRequest.createdAt"] },
              {
                $dateDiff: {
                  startDate: "$relatedRequest.createdAt",
                  endDate: "$updatedAt",
                  unit: "day",
                },
              },
              null,
            ],
          },
        },
      },
      {
        $group: {
          _id: "$procurementCenter_id",
          centerName: { $first: "$center.center_name" },
          Status: { $first: "$center.active" },
          centerId: { $first: "$center._id" },
          district: { $first: "$seller.address.registered.district" },
          associate_name: {
            $first: "$seller.basic_details.associate_details.associate_name",
          },
          liftedQty: { $sum: "$qty" },
          offeredQty: { $first: { $ifNull: ["$associateOffer.offeredQty", 0] } },
          liftedDataDays: { $first: "$liftedDataDays" },
          purchaseDays: { $first: "$purchaseDays" },
          productName: { $first: "$relatedRequest.product.name" },
        },
      },
      {
        $addFields: {
          balanceMandi: { $subtract: ["$offeredQty", "$liftedQty"] },
          liftingPercentage: {
            $cond: {
              if: { $gt: ["$offeredQty", 0] },
              then: {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$liftedQty", "$offeredQty"] },
                      100,
                    ],
                  },
                  2,
                ],
              },
              else: 0,
            },
          },
        },
      },
    ];

    if (searchDistrict) {
      pipeline.push({
        $match: {
          district: { $in: searchDistrict },
        },
      });
    //   page = 1;
    //   skip = 0;
    }

    if (centerNames?.length) {
      pipeline.push({
        $match: {
          centerName: { $regex: centerNames, $options: 'i' },
        },
      });
      page = 1;
      skip = 0;
    }

    pipeline.push({ $sort: { centerName: 1 } });

    const aggregated = await Batch.aggregate(pipeline);

    if (isExport) {
      const exportRows = aggregated.map(item => ({
        "Center Name": item?.centerName || 'NA',
        "District": item?.district || 'NA',
        "Associate Name": item?.associate_name || 'NA',
        "Product Name": item?.productName || 'NA',
        "Offered Qty": item?.offeredQty || 0,
        "Lifted Qty": item?.liftedQty || 0,
        "Balance Qty": item?.balanceMandi || 0,
        "Lifting %": item?.liftingPercentage + "%" || '0%',
        "Lifted Days": item?.liftedDataDays ?? 'NA',
        "Purchase Days": item?.purchaseDays ?? 'NA',
        "Status": item?.Status ? 'Active' : 'Inactive',
      }));

      if (exportRows.length > 0) {
        return dumpJSONToExcel(req, res, {
          data: exportRows,
          fileName: `MandiWiseProcurementData.xlsx`,
          worksheetName: `Mandi Data`
        });
      } else {
        return res.status(404).json({ message: "No data found to export." });
      }
    }
    const totalRecords = aggregated.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedData = aggregated.slice(skip, skip + limit);

    return res.status(200).json({
      totalRecords,
      page,
      limit,
      totalPages,
      data: paginatedData,
    });
   } catch (error) {
        _handleCatchErrors(error, res);
    }
}
