const mongoose = require('mongoose');
const {
  _collectionName,
} = require("@src/v1/utils/constants");
const centerProjectionSchema = new mongoose.Schema({
  state: {
    type: String,
    required: true,
  },
  district: {
    type: String,
    required: true,
  },
  center_location: {
    type: String,
    required: true,
  },
  current_projection: {
    type: Number, // or String if it's not strictly numeric
    required: true,
  },
   qty_booked: {
    type: Number, // or String if it's not strictly numeric
    required: false,
  }
}, {
  timestamps: true,
});

const CenterProjection =mongoose.model(_collectionName.centerProjection, centerProjectionSchema);


module.exports = { CenterProjection };