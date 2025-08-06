const { FeatureList } = require("@src/v1/models/master/FeatureList")
const { TypesModel } = require("@src/v1/models/master/Types")


module.exports.getPermission = async (response) => {
  const typeData = await TypesModel.find()
  const type = typeData.reduce((acc, item) => [...acc, item.featureType], [])
  const user_type = typeData.find(item => item.user_type === response.user_type)
  const featureType = user_type.featureType
  if (!type.includes(featureType)) {
    throw new Error('Invalid feature type')
  }
  const featureListDoc = await FeatureList.find({ featureType: featureType })
  const featureList = JSON.parse(JSON.stringify(featureListDoc))
  const resultArray = JSON.parse(JSON.stringify(response.userRole));

  const mergedResultsArray = [];

  resultArray.forEach((resultObject) => {
    const features = resultObject.features;

    features.forEach((feature) => {
      const existingFeature = mergedResultsArray.find(
        (mergedFeature) => mergedFeature.featureName.toLowerCase() === feature.featureName.toLowerCase()
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
              existingSubFeature.subFeatureName.toLowerCase() ===
              subFeature.subFeatureName.toLowerCase()
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

  const arrayC = this.mergeArrays(featureList, mergedResultsArray);


  const generateFeatureCode = (featureName) => {

    const featureNameArray = featureName.split(" ")
    const featureCode = featureNameArray.reduce((code, item) => code.concat(item.trim().slice(0, 2)), '')

    if (featureCode.length < 3) {
      const modifiedFeatureCode = featureCode.concat('FE')
      return modifiedFeatureCode.toUpperCase()
    } else {
      return featureCode.toUpperCase()
    }
  }
  const generateSubFeatureCode = (subFeatureName) => {

    const subFeatureNameArray = subFeatureName.split(" ")
    const subFeatureCode = subFeatureNameArray.reduce((code, item) => code.concat(item.trim().slice(0, 2)), '')

    if (subFeatureCode.length < 3) {
      const modifiedSubFeatureCode = subFeatureCode.concat('SF')
      return modifiedSubFeatureCode.toUpperCase()
    } else {
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
  // console.log("arrayC-->", arrayC)
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

    else if (key === "subFeatures" && Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
      const subFeatureNames = new Set();

      const mergedSubFeatures = obj1[key].map((subFeatureA) => {
        const matchingSubFeatureB = obj2[key].find(
          (subFeatureB) => subFeatureB.subFeatureName.toLowerCase() === subFeatureA.subFeatureName.toLowerCase()
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
      // console.log(merged[key])
    }
  }

  return merged;
}

module.exports.mergeArrays = (arrayA, arrayB) => {

  const mergedArray = arrayA.map((itemA) => {

    const matchingItemB = arrayB.find((itemB) => itemB.featureName.toLowerCase() === itemA.featureName.toLowerCase());

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