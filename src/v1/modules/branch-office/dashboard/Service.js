const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const {
  wareHouseDetails,
} = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { convertToObjecId } = require("@src/v1/utils/helpers/api.helper");

module.exports.getStateWiseFarmerCount = async ({
  season,
  commodity_id,
  schemeId,
  states,
}) => {
  try {
    const hasRequestFilters = season || commodity_id || schemeId;

    // Convert filter strings to arrays (if provided)
    const seasonArr = season
      ? season.split(",").map((s) => new RegExp(s.trim(), "i"))
      : null;
    const commodityArr = commodity_id
      ? commodity_id.split(",").map((id) => convertToObjecId(id.trim()))
      : null;
    const schemeArr = schemeId
      ? schemeId.split(",").map((id) => convertToObjecId(id.trim()))
      : null;
    const stateArr = states
      ? states.split(",").map((id) => convertToObjecId(id.trim()))
      : null;

    const matchStage = { "address.state_id": { $in: stateArr } };

    let pipeline;

    if (hasRequestFilters) {
      // Use full aggregation with Payment and Request filtering
      pipeline = [
        { $match: matchStage },

        {
          $lookup: {
            from: "payments",
            localField: "_id",
            foreignField: "farmer_id",
            as: "payments",
          },
        },
        { $unwind: "$payments" },

        {
          $lookup: {
            from: "requests",
            localField: "payments.req_id",
            foreignField: "_id",
            as: "request",
          },
        },
        { $unwind: "$request" },
        {
          $lookup: {
            from: "schemes",
            localField: "request.product.schemeId",
            foreignField: "_id",
            as: "scheme",
          },
        },
        { $unwind: { path: "$scheme", preserveNullAndEmptyArrays: true } },

        {
          $match: {
            ...(seasonArr && {
              $or: [
                { "request.product.season": { $in: seasonArr } },
                { "scheme.season": { $in: seasonArr } },
              ],
            }),
            ...(commodityArr && {
              "request.product.commodity_id": { $in: commodityArr },
            }),
            ...(schemeArr && {
              "request.product.schemeId": { $in: schemeArr },
            }),
          },
        },

        {
          $group: {
            _id: "$address.state_id",
            farmerIds: { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            state_id: "$_id",
            count: { $size: "$farmerIds" },
            _id: 0,
          },
        },

        {
          $lookup: {
            from: "statedistrictcities",
            let: { stateId: "$state_id" },
            pipeline: [
              { $unwind: "$states" },
              { $match: { $expr: { $eq: ["$states._id", "$$stateId"] } } },
              { $project: { state_title: "$states.state_title", _id: 0 } },
            ],
            as: "state_info",
          },
        },
        { $unwind: { path: "$state_info", preserveNullAndEmptyArrays: true } },

        {
          $project: {
            state_id: 1,
            count: 1,
            state: "$state_info.state_title",
          },
        },
        { $sort: { count: -1 } },
      ];
    } else {
      // Lightweight version: only from farmer → group by state
      pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: "$address.state_id",
            farmerIds: { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            state_id: "$_id",
            count: { $size: "$farmerIds" },
            _id: 0,
          },
        },
        {
          $lookup: {
            from: "statedistrictcities",
            let: { stateId: "$state_id" },
            pipeline: [
              { $unwind: "$states" },
              { $match: { $expr: { $eq: ["$states._id", "$$stateId"] } } },
              { $project: { state_title: "$states.state_title", _id: 0 } },
            ],
            as: "state_info",
          },
        },
        { $unwind: { path: "$state_info", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            state_id: 1,
            count: 1,
            state: "$state_info.state_title",
          },
        },
        { $sort: { count: -1 } },
      ];
    }

    const result = await farmer.aggregate(pipeline);
    const data = {
      statewise_farmers: result,
      total_farmers: result.reduce((acc, curr) => acc + curr.count, 0),
    };
    return data;
  } catch (err) {
    console.error("Error in getStateWiseFarmerCount:", err);
    throw new Error(err.message);
  }
};

module.exports.getStateWiseWarehouseCount = async (
  states,
  season,
  schemeId,
  commodity_id
) => {
  try {
    const commodityArr = commodity_id
      ? commodity_id.split(",").map((id) => convertToObjecId(id.trim()))
      : null;
    const schemeArr = schemeId
      ? schemeId.split(",").map((id) => convertToObjecId(id.trim()))
      : null;
    const seasonArr = season
      ? season.split(",").map((s) => new RegExp(s.trim(), "i"))
      : null;
    // const stateArr = states
    //   ? states.split(",").map((s) => new RegExp(s.trim(), "i"))
    //   : null;

    const hasRequestFilters = commodityArr || schemeArr || seasonArr;

    let pipeline = [];

    if (hasRequestFilters) {
      pipeline = [
        {
          $match: {
            // ...(stateArr && {
            //   "addressDetails.state.state_name": { $in: stateArr },
            // }),
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
            // "requests.head_office_id": convertToObjecId(ho_id),
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
};

module.exports.getProcuredQtyAndAmount = async ( query = {}) => {
  const aggregationPipeline = [
    { $match: { ...query } },

    {
      $lookup: {
        from: "batches",
        localField: "_id",
        foreignField: "req_id",
        as: "batches",
        pipeline: [
          {
            $lookup: {
              from: "payments",
              localField: "_id",
              foreignField: "batch_id",
              as: "payment",
              pipeline: [
                { $project: { payment_status: 1 } },
              ],
            },
          },
          { $project: { qty: 1, totalPrice: 1, payment: 1, bo_approve_status: 1 } },
        ],
      },
    },

    // compute qtyPurchased, amountPayable, payment_status, approve_status
    {
      $addFields: {
        qtyPurchased: {
          $reduce: {
            input: "$batches",
            initialValue: 0,
            in: { $add: ["$$value", "$$this.qty"] },
          },
        },
        amountPayable: {
          $reduce: {
            input: "$batches",
            initialValue: 0,
            in: { $add: ["$$value", "$$this.totalPrice"] },
          },
        },
        payment_status: {
          $cond: {
            if: {
              $anyElementTrue: {
                $map: {
                  input: "$batches",
                  as: "batch",
                  in: {
                    $anyElementTrue: {
                      $map: {
                        input: "$$batch.payment",
                        as: "pay",
                        in: { $eq: ["$$pay.payment_status", "Pending"] },
                      },
                    },
                  },
                },
              },
            },
            then: "Pending",
            else: "Completed",
          },
        },
        approve_status: {
          $cond: {
            if: {
              $allElementsTrue: {
                $map: {
                  input: "$batches",
                  as: "batch",
                  in: { $eq: ["$$batch.bo_approve_status", "Approved"] },
                },
              },
            },
            then: "Approved",
            else: "Pending",
          },
        },
      },
    },

    {
      $project: {
        qtyPurchased: 1,
        amountPayable: 1,
        payment_status: 1,
        approve_status: 1,
      },
    },
  ];

  try {
    const requestData = await RequestModel.aggregate(aggregationPipeline);
    return requestData;
  } catch (err) {
    console.log(err);
    throw new Error(err.message);
  }
};
