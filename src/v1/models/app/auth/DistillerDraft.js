const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');

const distillerDraftSchema = new mongoose.Schema({
  onboarding: { type: Object, default: {} },
  po_receipt: { type: Object, default: {} },
  batches: { type: [Object], default: [] },
  mobile_no: { type: String, required: true },
  status: { type: Boolean, default: false },
  source_by: { type: String, default: 'NAFED' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
}, { timestamps: true, minimize: false });

const DistillerDraft = mongoose.model(
  (_collectionName && _collectionName.DistillerDraft) ? _collectionName.DistillerDraft : 'DistillerDraft',
  distillerDraftSchema
);

module.exports = { DistillerDraft }; 