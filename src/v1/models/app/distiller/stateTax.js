const mongoose = require("mongoose");
const { _collectionName } = require("@src/v1/utils/constants");
 
const stateTaxSchema = new mongoose.Schema(
  {
    state_name: {
      type: String,
      required: true,
      trim: true,
    },
    state_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "State", // Optional reference
    },
    mandi_tax: {
      type: Number,
      required: true,
      min: 0,
    },
    token_percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);
 
const StateTaxModel = mongoose.model(_collectionName.statewisemanditax, stateTaxSchema);
 
module.exports = { StateTaxModel };