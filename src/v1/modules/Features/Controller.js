const { FeatureList } = require("@src/v1/models/master/FeatureList");
const { _featureType } = require("@src/v1/utils/constants");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");


exports.createFeature = async (req, res) => {
    try {
        
        const featureDetails = req.body

        if(!Object.values(_featureType).includes(featureDetails.featureType)){
            return sendResponse({res,status: 400, message: "invalid feature type" });
        }

        const generateFeatureCode = (featureName) => {

            const featureNameArray = featureName.split(" ")
            const featureCode = featureNameArray.reduce((code, item)=> code.concat(item.trim().slice(0,2)), '')
            
            if(featureCode.length < 3){
                const modifiedFeatureCode = featureCode.concat('FE')
                return modifiedFeatureCode.toUpperCase()
            }else{
                return featureCode.toUpperCase()
            }
        }

        const featureCode = generateFeatureCode(featureDetails.featureName)

        const isExistingFeatureCode = await FeatureList.findOne({featureCode: featureCode, featureType: featureDetails.featureType})
        if(isExistingFeatureCode){
            return sendResponse({res,status: 400, message: "feature code error, please try again" });
        }

        const newFeature = new FeatureList({ 
            featureType: featureDetails.featureType,
            featureName: featureDetails.featureName, 
            featureCode: featureCode,
        })

        const feature = await newFeature.save()
        return sendResponse({res,status: 200, message: "feature created successfully", data: feature });

    } catch (error) {
        _handleCatchErrors(error, res)
    }
}

exports.createSubFeature = async (req, res) => {
    try {
        
        const subFeatureDetails = req.body
        const featureCode = req.params.featureCode

        if(!Object.values(_featureType).includes(subFeatureDetails.featureType)){
            return sendResponse({res,status: 400, message: "invalid feature type" });
        }

        const generateSubFeatureCode = (subFeatureName) => {

            const subFeatureNameArray = subFeatureName.split(" ")
            const subFeatureCode = subFeatureNameArray.reduce((code, item)=> code.concat(item.trim().slice(0,2)), '')
            
            if(subFeatureCode.length < 3){
                const modifiedSubFeatureCode = subFeatureCode.concat('SF')
                return modifiedSubFeatureCode.toUpperCase()
            }else{
                return subFeatureCode.toUpperCase()
            }
        }

        const subFeatureCode = generateSubFeatureCode(subFeatureDetails.subFeatureName)

        const feature = await FeatureList.findOne({featureCode: featureCode, featureType: subFeatureDetails.featureType})
        if(!feature){
            return sendResponse({res,status: 400, message: "invalid feature code, please try again" });
        }

        if(feature.subFeatures.length > 0){
            const existingSubFeature = feature.subFeatures.reduce((acc, item)=>[...acc, item.subFeatureCode], [])
            if(existingSubFeature.includes(subFeatureCode)){
                return sendResponse({res,status: 400, message: "invalid sub-feature code, please try again" });
            }
        }

        const subFeature = { 
            subFeatureName: subFeatureDetails.subFeatureName,
            subFeatureCode: subFeatureCode,
            permissions: {
                view: false, 
                add: false, 
                edit: false, 
                delete: false, 
                export: false, 
                status: false, 
                takeAction: false
            }
        }

        feature.subFeatures.push(subFeature)
        const subFeatureSaved = await feature.save()

        return sendResponse({res,status: 200, message: `sub feature created successfully in ${feature.featureName}`, data: subFeatureSaved });

    } catch (error) {
        _handleCatchErrors(error, res)
    }
}