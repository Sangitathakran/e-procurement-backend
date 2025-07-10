const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');

const distillerDraftSchema = new mongoose.Schema({
  data: { type: Object, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  status: { type: String, default: 'pending' }
}, { timestamps: true });

const DistillerDraft = mongoose.model(
  (_collectionName && _collectionName.DistillerDraft) ? _collectionName.DistillerDraft : 'DistillerDraft',
  distillerDraftSchema
);

const distillerOnboardingDraftSchema = new mongoose.Schema({
  mobile_no: { type: String, required: true },
  onboarding: { type: Object, default: {} },
  po_receipt: { type: Object, default: {} },
  batches: { type: [Object], default: [] },
  status: { type: Boolean, default: false },
  source_by: { type: String, default: 'NAFED' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
}, { timestamps: true });

const DistillerOnboardingDraft = mongoose.model('DistillerOnboardingDraft', distillerOnboardingDraftSchema);

module.exports = { DistillerDraft, DistillerOnboardingDraft }; 