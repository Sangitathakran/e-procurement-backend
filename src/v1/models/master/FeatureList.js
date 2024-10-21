const mongoose = require("mongoose");
const { _collectionName , _featureType } = require("@src/v1/utils/constants/index")
const { _commonKeys } = require("@src/v1/utils/helpers/collection")

const featureListSchema = new mongoose.Schema({

    featureType: { type: String, enum: Object.values(_featureType) },
    featureName: { type: String },  // need to change to moduleName
    featureCode: { type: String },
    enabled: { type: Boolean , default: false },
    subFeatures:[ {
        subFeatureName: { type: String },  // need to change to subModuleName 
        subFeatureCode: { type: String },
        enabled: { type: Boolean , default: false },
        permissions : {
            view: { type: Boolean },            // 1
            add: { type: Boolean },             // 2
            edit: { type: Boolean },            // 3
            delete: { type: Boolean },          // 4
            export: { type: Boolean },          // 5
            status: { type: Boolean },          // 6
            takeAction: { type: Boolean }       // 7

        },
        components: [{
            componentName: {type: String},
            enabled: {type: Boolean}
        }]
    }]


}, { timestamps: true });


const FeatureList = mongoose.model(_collectionName.FeatureList, featureListSchema);

module.exports = { FeatureList }; 