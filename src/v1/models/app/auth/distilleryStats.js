
const mongoose = require("mongoose");
const { Schema } = mongoose;
                                                                                                                                                                                                                                                                                                                          
const distilleryStatsHistorySchema = new Schema(
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
  },
  { timestamps: true }
);
const distilleryStatsSchema = new Schema(
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
    }
  },
  { timestamps: true }
);

module.exports = {
  DistilleryStats: mongoose.model("distilleryStats", distilleryStatsSchema),
  DistilleryStatsHistory: mongoose.model("distilleryStatsHistory", distilleryStatsHistorySchema),
};
