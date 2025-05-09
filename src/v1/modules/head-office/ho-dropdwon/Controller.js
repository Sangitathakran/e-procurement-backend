const mongoose = require("mongoose");
const { SchemeAssign } = require("@src/v1/models/master/SchemeAssign");

module.exports.HoAllScheme = async (req, res) => {
  try {
    const { user_id, portalId } = req;
   
     const portalObjectId = new mongoose.Types.ObjectId(portalId);
    const data = await SchemeAssign.aggregate([
      {
        $match: {
          deletedAt: null,
          ho_id : portalObjectId
        },
      },
      {
        $lookup: {
          from: "schemes",
          localField: "scheme_id",
          foreignField: "_id",
          as: "schemeDetails",
        },
      },
      {
        $unwind: {
          path: "$schemeDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "commodities",
          localField: "schemeDetails.commodity_id",
          foreignField: "_id",
          as: "commodityDetails",
        },
      },
      {
        $unwind: {
          path: "$commodityDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
            _id : 0,
          scheme: {
            $addToSet: {
              id: "$scheme_id",
              name: {
                $concat: [
                  { $ifNull: ["$schemeDetails.schemeName", ""] },
                  "  ",
                  { $ifNull: ["$commodityDetails.name", ""] },
                  { $ifNull: ["$commodityDetails.name", ""] },
                  "  ",
                  { $ifNull: ["$schemeDetails.season", ""] },
                  "  ",
                  { $ifNull: ["$schemeDetails.period", ""] },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          scheme: 1,
        },
      },
    ]);

    return res.status(200).json({
      status: 200,
      data: data,
    });
  } catch (error) {
    console.error("Aggregation Error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
};
