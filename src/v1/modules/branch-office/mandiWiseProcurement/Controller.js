const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const mongoose = require("mongoose");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { Query } = require("mongoose");


module.exports.mandiWiseProcurementdata = async (req, res) => {
  try {
    const { portalId } = req;
    const { commodity, scheme, season } = req.query;
    // console.log(commodity)
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

    // Filter 
    let query = [{ bo_id: portalId }];
    // console.log(portalId)

   if (commodity) {
      const commodityArray = commodity
        .split(',')
        .map(s => s.trim())
        .filter(s => s && typeof s === 'string');

      if (commodityArray.length) {
        const regexCommodity = commodityArray.map(name => new RegExp(`^${name}$`, 'i'));
        query.push({ 'product.name': { $in: regexCommodity } });
      }
    }


    if (scheme) {
      const schemeArray = scheme.split(',').filter(Boolean).map(id => new mongoose.Types.ObjectId(id));
      if (schemeArray.length) {
        query.push({ 'product.schemeId': { $in: schemeArray } });
      }
    }

    if (season) {
      const seasonArray = season.split(',').filter(Boolean);
      if (seasonArray.length) {
        const regexSeason = seasonArray.map(name => new RegExp(`^${name}$`, 'i'));
        query.push({ 'product.season': { $in: regexSeason } });
      }
    }

     try {
        console.log("Final Query:", JSON.stringify({ $and: query }, null, 2));
      } catch (e) {
        console.log("Final Query (fallback):", { $and: query });
      }
;
    const filter = { $and: query };
    // console.log(filter)

    const requests = await RequestModel.find(filter, { _id: 1 }).lean();
     console.log("req", requests)
    const requestIds = requests.map(r => r._id);

    const paymentQuery = { bo_id: portalId };
    const payments = await Payment.find(paymentQuery).lean();
    const batchIdSet = [...new Set(payments.map(p => String(p.batch_id)).filter(Boolean))];



    const pipeline = [
      {
        $match: {
          _id: { $in: batchIdSet.map(id => new mongoose.Types.ObjectId(id)) },
          ...(requestIds.length > 0 && { req_id: { $in: requestIds } })
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
    ]; const filterApplied = commodity || scheme || season;
    if (filterApplied && requestIds.length === 0) {
      return res.status(200).json(new serviceResponse({
        status: 200,
        message: _response_message.notFound("No records found"),
        data: {
          page,
          limit,
          totalPages: 0,
          totalRecords: 0,
          data: []
        }
      }));
    }

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
        return res.status(404).json(new serviceResponse({
          status: 404,
          message: _response_message.notFound("Mandi Procurement Not Found")
        }));
      }
    }
    const totalRecords = aggregated.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedData = aggregated.slice(skip, skip + limit);

    return res.status(200).json(new serviceResponse({
      status: 200,
      data: {
        page,
        limit,
        totalPages,
        totalRecords,
        data: paginatedData,
        message: _response_message.found("Mandi Procurement Data Fetched")
      }
    }));
    //     return res.status(200).json(new serviceResponse({
    //   status: 200,
    //   message: _response_message.found("Mandi Procurement Data Fetched"),
    //   data: {
    //     records: paginatedData,
    //     page,
    //     limit,
    //     totalPages,
    //     totalRecords
    //   }
    // }));
  } catch (error) {
    _handleCatchErrors(error, res);
  }
}
