
const mongoose = require("mongoose");
const { Schema } = mongoose;
const {_collectionName} = require("@src/v1/utils/constants");
const { _commonKeys } = require("@src/v1/utils/helpers/collection");
                                                                                                                                                                                                                                                                                                                          
const distillerStatsHistorySchema = new Schema(
  {
    distilleryStatsId: {
      type: Schema.Types.ObjectId,
      ref: "distilleryStats",
      required: true,
    },
    changes: {
      old: { type: Object, required: true },
      new: { type: Object, required: true },
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "masterUser", // track who made the update
    },
    ..._commonKeys,
  },
  { timestamps: true }
);
const distillerStatsSchema = new Schema(
  {
    totalDistilleriesRegistered: {
      type: Number,
      default: 0,
    },
    totalPOsRaised: {
      type: Number,
      default: 0,
    },
    totalProcurementMT: {
      type: Number,
      default: 0,
    },
    totalLiftingMT: {
      type: Number,
      default: 0,
    },
    totalPaymentByDistilleries: {
      type: Number,
      default: 0,
    },
    ..._commonKeys,
  },
  { timestamps: true }
);

module.exports = {
  NafedStats: mongoose.model(_collectionName.nafedstats, distillerStatsSchema),
  NafedStatsHistory: mongoose.model(_collectionName.nafedstatshistory, distillerStatsHistorySchema),
};
