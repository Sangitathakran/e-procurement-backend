const mongoose = require("mongoose");
const { SchemeAssign } = require("@src/v1/models/master/SchemeAssign");

module.exports.AllScheme = async (req, res) => {
  try {
    const { user_id, portalId } = req;
    const portalObjectId = new mongoose.Types.ObjectId(portalId);

    const data = await SchemeAssign.aggregate([
      {
        $match: {
          deletedAt: null,
          bo_id: portalObjectId,
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
          _id: "$scheme_id",
          schemeName: {
            $first: {
              $concat: [
                { $ifNull: ["$schemeDetails.schemeName", ""] },
                " ",
                { $ifNull: ["$commodityDetails.name", ""] },
                " ",
                { $ifNull: ["$schemeDetails.season", ""] },
                " ",
                { $ifNull: ["$schemeDetails.period", ""] },
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          id: "$_id",
          schemeName: 1,
        },
      },
    ]);

    return res.status(200).json({
      status: 200,
      data,
    });
  } catch (err) {
    console.log("ERROR: ", err);
    return sendResponse({ status: 500, message: err.message });
  }
};


