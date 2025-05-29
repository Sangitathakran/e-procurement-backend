const mongoose = require("mongoose");
const {
  _collectionName,
} = require("@src/v1/utils/constants");
const { _commonKeys } = require("@src/v1/utils/helpers/collection");

const associateMandiNameSchema = new mongoose.Schema(
  {
    mandiName: { type: String },
    commisionAgentName: { type: String },    
    associate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: _collectionName.Users,
    }, 
    procurementCenter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: _collectionName.ProcurementCenter,
    },    
    ..._commonKeys,
  },
  { timestamps: true }
);

const AssociateMandiName = mongoose.model(
  _collectionName.associateMandiName,
  associateMandiNameSchema
);

module.exports = { AssociateMandiName };
