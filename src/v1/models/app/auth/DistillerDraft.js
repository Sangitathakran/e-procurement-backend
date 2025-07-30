const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');

const distillerDraftSchema = new mongoose.Schema({
  distiller_details: { type: Object, required: true },
  po_details: { type: [Object], default: [] },
}, { timestamps: true });

const DistillerDraft = mongoose.model(
  (_collectionName && _collectionName.DistillerDraft) ? _collectionName.DistillerDraft : 'DistillerDraft',
  distillerDraftSchema
);

module.exports = { DistillerDraft }; 