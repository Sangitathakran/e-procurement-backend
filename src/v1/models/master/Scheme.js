const { _collectionName, _status, _season, _period, _centralNodalAgency } = require("@src/v1/utils/constants");

const mongoose = require("mongoose");
const SchemeSchema = new mongoose.Schema(
  {
    // agent_id: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: _collectionName.Agency,
    //   required: true,
    // },
    schmeCode: { type: String, unique: true },
    schemeName: { type: String, required: true },
    // season: { type: String, enum: ["Kharif", "Rabi", "Zaid"] },
    // period: { type: String, enum: ["2024", "2024-2025", "2025"] },
    // centralNodalAgency: { type: String, enum: ["nodal1", "nodal2", "nodal3"] },

    season: { type: String, enum: Object.values(_season), default: _season.Kharif },
    period: { type: String, enum: Object.values(_period), default: _period.currentYear },
    centralNodalAgency: { type: String, enum: Object.values(_centralNodalAgency), default: _centralNodalAgency.nodal1 },
    procurement: { type: Number, required: true },
    commodity: { type: String, required: true },
    status: { type: String, enum: Object.values(_status), default: _status.active },
  },
  { timestamps: true }
);
const Scheme = mongoose.model(
  _collectionName.Scheme,
  SchemeSchema
);
module.exports = { Scheme };

