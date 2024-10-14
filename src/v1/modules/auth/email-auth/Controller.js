
const MasterUser = require("@src/v1/models/master/MasterUser");
const { _auth_module, _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { FeatureList } = require("@src/v1/models/master/FeatureList");

module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Email') }] }));
        }
        if (!password) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Password') }] }));
        }

        const user = await MasterUser.findOne({ email: email }).populate('userRole')
        
        if (!user) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('User') }] }));
        }
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('Credentials') }] }));
        }


        const payload = { email: user.email, userType:user.userType }
        const expiresIn = 24 * 60 * 60;
        const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });

        const loginUser = JSON.parse(JSON.stringify(user))
        delete loginUser.password

        const userData = await getPermission(user)
        
        const data = {
            token: token,
            user: userData
        }
        return res.status(200).send(new serviceResponse({ status: 200, message: _auth_module.login('Account'), data: data }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

const getPermission = async (response) => { 

    const featureList = await FeatureList.find({})
    const resultArray = JSON.parse(JSON.stringify(response.userRole));

    const mergedResultsArray = [];

    resultArray.forEach((resultObject) => {
      const features = resultObject.features;

      features.forEach((feature) => {
        const existingFeature = mergedResultsArray.find(
          (mergedFeature) => mergedFeature.featureName === feature.featureName
        );

        if (!existingFeature) {
          // if the feature doesn't exist in the mergedResultsArray, add it
          mergedResultsArray.push({
            featureName: feature.featureName,
            enabled: feature.enabled,
            subFeatures: feature.subFeatures,
          });
        } else {
          // if the feature already exists in the mergedResultsArray, update it
          existingFeature.enabled =
            existingFeature.enabled || feature.enabled;

          // merge subFeatures by comparing and updating permissions
          feature.subFeatures.forEach((subFeature) => {
            const matchingSubFeature = existingFeature.subFeatures.find(
              (existingSubFeature) =>
                existingSubFeature.subFeatureName ===
                subFeature.subFeatureName
            );

            if (matchingSubFeature) {
              // Merge permissions for the matching subFeature
              matchingSubFeature.permissions = mergePermissions(
                matchingSubFeature.permissions,
                subFeature.permissions
              );
            } else {
              // if subFeature doesn't exist, add it
              existingFeature.subFeatures.push(subFeature);
            }
          });
        }
      });
    });

    // function to merge permissions for two subFeatures
    function mergePermissions(existingPermissions, newPermissions) {
      // set a permission to true if it's true in either set of permissions
      return Object.keys(newPermissions).reduce((merged, permission) => {
        merged[permission] =
          existingPermissions[permission] || newPermissions[permission];
        return merged;
      }, existingPermissions);
    }

    const arrayC = mergeArrays(featureList, mergedResultsArray);


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

    function convertPermissions(permissions) {
      const convertedPermissions = {};
      for (const key in permissions) {
        let newKey;
        switch (key) {
          case "view":
            newKey = "1";
            break;
          case "add":
            newKey = "2";
            break;
          case "edit":
            newKey = "3";
            break;
          case "delete":
            newKey = "4";
            break;
          case "export":
            newKey = "5";
            break;
          case "status":
            newKey = "6";
            break;
          case "takeAction":
            newKey = "7";
            break;
          default:
            newKey = key; // Keep the key as is if not recognized
        }
        convertedPermissions[newKey] = permissions[key];
      }
      return convertedPermissions;
    }

    // to change the userRole obj with short forms
    const transformedUserRole = arrayC.map((role) => {
      const featureName = generateFeatureCode(role.featureName);
      const subFeatures = role.subFeatures.map((subFeature) => ({
        subFeatureName: generateSubFeatureCode(subFeature.subFeatureName),
        enabled: subFeature.enabled,
        permissions: convertPermissions(subFeature.permissions),
      }));
      return {
        featureName,
        enabled: role.enabled,
        subFeatures,
      };
    });

    const plainResponse = JSON.parse(JSON.stringify(response));
    const newResponse = {
      ...plainResponse,
      userRole: transformedUserRole,
    };
    delete newResponse.password;

  
    return newResponse

}

function mergeObjects(obj1, obj2) {
    const merged = { ...obj1 };
  
  
    for (const key in obj2) {
      if (typeof obj2[key] === 'object' && !Array.isArray(obj2[key])) {
        // console.log(obj1[key])
        // console.log(obj2[key])
        merged[key] = mergeObjects(obj1[key], obj2[key]);
      } 
      
      else if (key === "subFeatures" && Array.isArray(obj1[key]) && Array.isArray(obj2[key])) 
      {
        const subFeatureNames = new Set();
        
        const mergedSubFeatures = obj1[key].map((subFeatureA) => {
          const matchingSubFeatureB = obj2[key].find(
            (subFeatureB) => subFeatureB.subFeatureName === subFeatureA.subFeatureName
          );
  
          if (matchingSubFeatureB) {
            subFeatureNames.add(subFeatureA.subFeatureName);
            return mergeObjects(subFeatureA, matchingSubFeatureB);
          } else {
            return { ...subFeatureA };
          }
        });
  
        obj2[key].forEach((subFeatureB) => {
          if (!subFeatureNames.has(subFeatureB.subFeatureName)) {
            mergedSubFeatures.push({ ...subFeatureB });
          }
        });
  
        merged[key] = mergedSubFeatures;
  
      } else {
        merged[key] = obj2[key];
        console.log(merged[key])
      }
    }
  
    return merged;
}
  
function mergeArrays(arrayA, arrayB) {
      
    const mergedArray = arrayA.map((itemA) => {
        
      const matchingItemB = arrayB.find((itemB) => itemB.featureName === itemA.featureName);
  
      if (matchingItemB) {
          return mergeObjects(itemA, matchingItemB);
      } else {
  
        // console.log("itemA-->", itemA)
        // console.log("{...itemA} --> ", { ...itemA})
  
        return { ...itemA };
      
      }
  
    });
  
    return mergedArray;
}
