const { ObjectId } = require("mongoose").Types;
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const { User } = require("@src/v1/models/app/auth/User");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const {
  wareHouseDetails,
} = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");

function parseDateRange(dateRange) {
  //console.log(dateRange) // 13/06/2025 - 25/06/2025
  const [startStr, endStr] = dateRange.split(" - ").map((s) => s.trim());

  const [startDay, startMonth, startYear] = startStr.split("/");
  const [endDay, endMonth, endYear] = endStr.split("/");

  const startDate = new Date(
    `${startYear}-${startMonth}-${startDay}T00:00:00.000Z`
  );
  const endDate = new Date(`${endYear}-${endMonth}-${endDay}T23:59:59.999Z`);
  //console.log( {startDate, endDate} ) //{ startDate: 2025-06-13T00:00:00.000Z, endDate: 2025-06-25T23:59:59.999Z }
  return { startDate, endDate };
}

async function getStateWiseUserCount(
  states,
  season,
  schemeId,
  commodity_id,
  dateRange
) {
  //console.log(">>>>>>>>>>>>>>> getStateWiseUserCount", arguments);
  try {
    const stateArr = states
      ? states.split(",").map((id) => new ObjectId(id.trim()))
      : null;
    const commodityArr = commodity_id
      ? commodity_id.split(",").map((id) => new ObjectId(id.trim()))
      : null;
    const schemeArr = schemeId
      ? schemeId.split(",").map((id) => new ObjectId(id.trim()))
      : null;
    const seasonArr = season
      ? season.split(",").map((s) => new RegExp(s.trim(), "i"))
      : null;

    const hasRequestFilters = commodityArr || schemeArr || seasonArr;

    const matchStage = stateArr
      ? { "address.registered.state_id": { $in: stateArr } }
      : {};

    let dateFilter = {};
    if (dateRange) {
      const { startDate, endDate } = parseDateRange(dateRange);
      dateFilter = {
        "associateOffers.createdAt": { $gte: startDate, $lte: endDate },
      };
    }

    let pipeline;

    if (hasRequestFilters) {
      pipeline = [
        { $match: matchStage },

        {
          $lookup: {
            from: "associateoffers",
            localField: "_id",
            foreignField: "seller_id",
            as: "associateOffers",
          },
        },
        { $unwind: "$associateOffers" },

        {
          $lookup: {
            from: "requests",
            let: { reqId: "$associateOffers.req_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$reqId"] },
                },
              },
              {
                $project: {
                  product: {
                    schemeId: 1,
                    commodity_id: 1,
                    season: 1,
                  },
                },
              },
            ],
            as: "request",
          },
        },
        { $unwind: "$request" },

        {
          $lookup: {
            from: "schemes",
            let: { schemeId: "$request.product.schemeId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$schemeId"] },
                },
              },
              { $project: { season: 1 } },
            ],
            as: "scheme",
          },
        },
        { $unwind: { path: "$scheme", preserveNullAndEmptyArrays: true } },

        {
          $match: {
            ...(commodityArr && {
              "request.product.commodity_id": { $in: commodityArr },
            }),
            ...(schemeArr && {
              "request.product.schemeId": { $in: schemeArr },
            }),
            ...(seasonArr && {
              $or: [
                { "request.product.season": { $in: seasonArr } },
                { "scheme.season": { $in: seasonArr } },
              ],
            }),
            ...dateFilter,
          },
        },

        {
          $group: {
            _id: {
              state_id: { $ifNull: ["$address.registered.state_id", null] },
              state: { $ifNull: ["$address.registered.state", "Unknown"] },
            },
            userIds: { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            state_id: {
              $cond: {
                if: { $eq: ["$_id.state_id", null] },
                then: "unknown",
                else: "$_id.state_id",
              },
            },
            state: "$_id.state",
            associate_count: { $size: "$userIds" },
            _id: 0,
          },
        },
        { $sort: { count: -1 } },
      ];
    } else {
      // No request filters — simple pipeline
      pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: {
              state_id: { $ifNull: ["$address.registered.state_id", null] },
              state: { $ifNull: ["$address.registered.state", "Unknown"] },
            },
            userIds: { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            state_id: {
              $cond: {
                if: { $eq: ["$_id.state_id", null] },
                then: "unknown",
                else: "$_id.state_id",
              },
            },
            state: "$_id.state",
            associate_count: { $size: "$userIds" },
            _id: 0,
          },
        },
        { $sort: { count: -1 } },
      ];
    }

    const result = await User.aggregate(pipeline);
    /*
    [
  {
    "state_id": "66d8438dddba819889f4ee0f",
    "state": "Uttar Pradesh",
    "associate_count": 45
  },
  ...
]
*/
    //  console.log("getStateWiseUserCount", result);
    return result.reduce((acc, curr) => acc + curr.associate_count, 0);
  } catch (err) {
    console.error("Error in getStateWiseUserCount:", err);
    throw new Error(err.message);
  }
}

async function getStateWiseWarehouseCount(
  ho_id,
  states,
  season,
  schemeId,
  commodity_id,
  dateRange
) {
  try {
    //console.log({ ho_id, states, season, schemeId, commodity_id, dateRange });
    if (!ho_id) throw new Error("ho_id is required");

    const commodityArr = commodity_id
      ? commodity_id.split(",").map((id) => new ObjectId(id.trim()))
      : null;
    const schemeArr = schemeId
      ? schemeId.split(",").map((id) => new ObjectId(id.trim()))
      : null;
    const seasonArr = season
      ? season.split(",").map((s) => new RegExp(s.trim(), "i"))
      : null;
    const stateArr = states
      ? states.split(",").map((s) => new RegExp(s.trim(), "i"))
      : null;

    const hasRequestFilters = commodityArr || schemeArr || seasonArr;

    let dateFilter = {};
    if (dateRange) {
      const { startDate, endDate } = parseDateRange(dateRange);
      dateFilter.createdAt = { $gte: startDate, $lte: endDate };
    }

    let pipeline = [];

    if (hasRequestFilters) {
      pipeline = [
        {
          $match: {
            // ...(stateArr && {
            //   "addressDetails.state.state_name": { $in: stateArr },
            // }),
            ...dateFilter,
            active: true,
          },
        },
        {
          $lookup: {
            from: "requests",
            localField: "_id",
            foreignField: "warehouse_id",
            as: "requests",
          },
        },
        { $unwind: "$requests" },
        {
          $match: {
            "requests.head_office_id": new ObjectId(ho_id),
            ...(commodityArr && {
              "requests.product.commodity_id": { $in: commodityArr },
            }),
            ...(schemeArr && {
              "requests.product.schemeId": { $in: schemeArr },
            }),
          },
        },
        {
          $lookup: {
            from: "schemes",
            let: { schemeId: "$requests.product.schemeId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$schemeId"] },
                },
              },
              { $project: { season: 1 } },
            ],
            as: "scheme",
          },
        },
        { $unwind: { path: "$scheme", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            ...(seasonArr && { "scheme.season": { $in: seasonArr } }),
          },
        },
        {
          $group: {
            _id: "$addressDetails.state.state_name",
            warehouseIds: { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            state: {
              $cond: {
                if: { $or: [{ $eq: ["$_id", null] }, { $eq: ["$_id", ""] }] },
                then: "Unknown",
                else: "$_id",
              },
            },
            warehouse_count: { $size: "$warehouseIds" },
            _id: 0,
          },
        },
        { $sort: { warehouse_count: -1 } },
      ];
    } else {
      pipeline = [
        {
          $match: {
            // ...(stateArr && {
            //   "addressDetails.state.state_name": { $in: stateArr },
            // }),
            ...dateFilter,
            active: true,
          },
        },
        {
          $group: {
            _id: "$addressDetails.state.state_name",
            warehouseIds: { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            state: {
              $cond: {
                if: { $or: [{ $eq: ["$_id", null] }, { $eq: ["$_id", ""] }] },
                then: "Unknown",
                else: "$_id",
              },
            },
            warehouse_count: { $size: "$warehouseIds" },
            _id: 0,
          },
        },
        { $sort: { warehouse_count: -1 } },
      ];
    }

    const result = await wareHouseDetails.aggregate(pipeline);
   // console.log("getStateWiseWarehouseCount", result);
    return result.reduce((acc, curr) => acc + curr.warehouse_count, 0);
  } catch (err) {
    console.error("Error in getStateWiseWarehouseCount:", err);
    throw new Error(err.message);
  }
}

async function getStateWiseDistillerCount(states, commodity) {
  try {
    const stateArr = states
      ? states.split(',').map((s) => new RegExp(s.trim(), 'i'))
      : null;

    const commodityArr = commodity
      ? commodity.split(',').map((c) => new RegExp(c.trim(), 'i'))
      : null;

    const hasCommodityFilter = !!commodityArr;

    let pipeline = [  ];

    if (hasCommodityFilter) {
      pipeline = [
        { $match: { active: true} },
        {
          $lookup: {
            from: 'purchaseorders',
            localField: '_id',
            foreignField: 'distiller_id',
            as: 'purchaseOrders',
          },
        },
        { $unwind: '$purchaseOrders' },
        {
          $match: {
            ...(stateArr && {
              'address.registered.state': { $in: stateArr },
            }),
            'purchaseOrders.product.name': { $in: commodityArr },
          },
        },
        {
          $group: {
            _id: '$address.registered.state',
            distillerIds: { $addToSet: '$_id' },
          },
        },
      ];
    } else {
      pipeline = [
        {
          $match: {
            ...(stateArr && {
              'address.registered.state': { $in: stateArr },
            }),
            active: true
          },
        },
        {
          $group: {
            _id: '$address.registered.state',
            distillerIds: { $addToSet: '$_id' },
          },
        },
      ];
    }

    // Final projection for both cases
    pipeline.push(
      {
        $project: {
          state: {
            $cond: {
              if: { $or: [{ $eq: ['$_id', null] }, { $eq: ['$_id', ''] }] },
              then: 'Unknown',
              else: '$_id',
            },
          },
          distiller_count: { $size: '$distillerIds' },
          _id: 0,
        },
      },
      { $sort: { distiller_count: -1 } }
    );

    const result = await Distiller.aggregate(pipeline);
    return result.reduce( (acc, curr) => acc+curr.distiller_count, 0);
  } catch (err) {
    console.error('Error in getStateWiseDistillerCount:', err);
    throw new Error(err.message);
  }
}

async function getStateWiseBranchOfficeCount(
  ho_id,
  states,
  season,
  schemeId,
  commodity_id,
  dateRange,
) {
  try {
    if (!ho_id) throw new Error('ho_id is required');

    const stateArr = states
      ? states.split(',').map(s => new RegExp(`^${s.trim()}$`, 'i'))
      : null;
    const commodityArr = commodity_id
      ? commodity_id.split(',').map(id => new ObjectId(id.trim()))
      : null;
    const schemeArr = schemeId
      ? schemeId.split(',').map(id => new ObjectId(id.trim()))
      : null;
    const seasonArr = season
      ? season.split(',').map(s => new RegExp(s.trim(), 'i'))
      : null;

    const hasRequestFilters = commodityArr || schemeArr || seasonArr;

    // Always apply this date filter on Branches.createdAt
    let dateFilter = {};
    if (dateRange) {
      const { startDate, endDate } = parseDateRange(dateRange);
      dateFilter.createdAt = { $gte: startDate, $lte: endDate };
    }

    const baseMatch = {
      headOfficeId: new ObjectId(ho_id),
      //...(stateArr && { state: { $in: stateArr } }),
      ...dateFilter,
    };

    let pipeline;

    if (hasRequestFilters) {
      pipeline = [
        { $match: baseMatch },

        {
          $lookup: {
            from: 'payments',
            localField: '_id',
            foreignField: 'bo_id',
            as: 'payment',
          },
        },
        { $unwind: '$payment' },

        {
          $lookup: {
            from: 'requests',
            localField: 'payment.req_id',
            foreignField: '_id',
            as: 'request',
          },
        },
        { $unwind: '$request' },

        {
          $match: {
            ...(commodityArr && {
              'request.product.commodity_id': { $in: commodityArr },
            }),
            ...(schemeArr && {
              'request.product.schemeId': { $in: schemeArr },
            }),
            ...(seasonArr && {
              'request.product.season': { $in: seasonArr },
            }),
          },
        },

        {
          $group: {
            _id: '$state',
            branchOfficeIds: { $addToSet: '$_id' },
          },
        },
        {
          $project: {
            state: {
              $cond: {
                if: { $or: [{ $eq: ['$_id', null] }, { $eq: ['$_id', ''] }] },
                then: 'Unknown',
                else: '$_id',
              },
            },
            branch_office_count: { $size: '$branchOfficeIds' },
            _id: 0,
          },
        },
        { $sort: { branch_office_count: -1 } },
      ];
    } else {
      pipeline = [
        { $match: baseMatch },
        {
          $group: {
            _id: '$state',
            branchOfficeIds: { $addToSet: '$_id' },
          },
        },
        {
          $project: {
            state: {
              $cond: {
                if: { $or: [{ $eq: ['$_id', null] }, { $eq: ['$_id', ''] }] },
                then: 'Unknown',
                else: '$_id',
              },
            },
            branch_office_count: { $size: '$branchOfficeIds' },
            _id: 0,
          },
        },
        { $sort: { branch_office_count: -1 } },
      ];
    }

    const result = await Branches.aggregate(pipeline);
   // console.log('getStateWiseBranchOfficeCount', result);
    return result.reduce( (acc, curr) => acc+ curr.branch_office_count, 0);
  } catch (err) {
    console.error('Error in getStateWiseBranchOfficeCount:', err);
    throw new Error(err.message);
  }
}


module.exports = {
  parseDateRange,
  getStateWiseUserCount,
  getStateWiseWarehouseCount,
  getStateWiseDistillerCount,
  getStateWiseBranchOfficeCount,
};
