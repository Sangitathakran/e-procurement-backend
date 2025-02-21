const { _collectionName, _status, _season, _period, _centralNodalAgency } = require("@src/v1/utils/constants");

const mongoose = require("mongoose");

const SchemeSchema = new mongoose.Schema(
  {
    schemeId: { type: String, unique: true },
    schemeName: { type: String, required: true },
    season: { type: String, enum: Object.values(_season), default: _season.Kharif },
    period: { type: String, enum: Object.values(_period), default: _period.currentYear },
    centralNodalAgency: { type: String, enum: Object.values(_centralNodalAgency), default: _centralNodalAgency.nodal1 },
    procurement: { type: Number, required: true },
    commodity_id:{
      type: mongoose.Schema.Types.ObjectId,
      ref: _collectionName.Commodity,
      required: true,
    },
    procurementDuration: { type: String, required: true },
    schemeApprovalLetter: { type: String },
    status: { type: String, enum: Object.values(_status), default: _status.active },
  },
  { timestamps: true }
);
const Scheme = mongoose.model(
  _collectionName.Scheme,
  SchemeSchema
);
module.exports = { Scheme };

