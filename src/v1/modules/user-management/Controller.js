const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { FeatureList } = require("@src/v1/models/master/FeatureList");
const UserRole = require("@src/v1/models/master/UserRole");
const {MasterUser} = require("@src/v1/models/master/MasterUser")
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const bcrypt = require("bcrypt");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const { _featureType } = require("@src/v1/utils/constants");




exports.getFeatures = async (req, res) =>{

    try {
     const featureType = req.params.type || null 
     const query = featureType ? {} : {featureType: featureType}
     const features = await FeatureList.find(query)
     return sendResponse({ res, status:200, data: features , message: `${features.length} features in ${featureType}` });
        
    } catch (error) {
        _handleCatchErrors(error, res);
    }
    
}

exports.createUserRole = async (req, res) => {

    try {

        const { userRoleName, features } = req.body
        if(!userRoleName){
            return sendResponse({res, status: 400, message: "user role name not provided"})
        }
        if(features.length < 1 ){
            return sendResponse({res, status: 400, message: "no feature provided"})
        }

        const userRole = userRoleName.trim().toLowerCase()

        const isUserRoleExist = await UserRole.findOne({userRoleName:userRole})
        if(isUserRoleExist){
            return sendResponse({res, status: 400, message: "user role is already exist"})
        }

        const newUserRole = new UserRole({ 
            userRoleName: userRole, 
            createdBy: req?.user?._id ?? null,
            features : features
        })

        const savedUserRole = await newUserRole.save()
        return sendResponse({res,status: 200, data: savedUserRole, message: "New user role created successfully"})



    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

exports.editUserRolePage = async (req, res) => { 
    try {

        const userRoleId  = req.params.id
        if(!userRoleId){
            return sendResponse({res, status: 400, message: "user role id not provided"})
        }
        const response = await UserRole.findOne({_id:userRoleId})
        const features = await FeatureList.find({featureType:Object.values(_featureType)})
      
        if(response){

            const cleanResponse = JSON.parse(JSON.stringify(response.features))
            const cleanFeature = JSON.parse(JSON.stringify(features))

            const arrayC = mergeArrays(cleanFeature, cleanResponse);
            response.features = arrayC
            
            return sendResponse({res, status: 200, data: response, message: "edit role page"})
        }
        else{ 
            return sendResponse({res, status: 400, message: "user role not exist or wrong user role id"})
        }


    } catch (error) {
        _handleCatchErrors(error, res);
    }
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

exports.editUserRole = async ( req, res, next) =>{
    try {

        const userRoleId  = req.body.userRoleId
        if(!userRoleId){
            return sendResponse({res, status: 400, message: "user role id not provided"})
        }
        const userRole = await UserRole.findOne({_id:userRoleId})
        if(!userRole){
            return sendResponse({res, status: 400, message: "user role not exist or wrong user role id"})
        }

        const features = req.body.features
        const userRoleName = req.body.userRoleName || userRole.userRoleName
        console.log('userRoleName--->', userRoleName)
        if(features.length > 0 && userRoleName){
            const response = await UserRole.findOneAndUpdate({_id:userRoleId}, {userRoleName: userRoleName, features:features }, { new: true})
            if(response){
                return sendResponse({res, status: 200, data: response, message: "user role edited successfully"})
            }
        }   
        else{ 
            return sendResponse({res, status: 400, message: "user role name not provided or no feature provided"})
        }
        
    } catch (error) {
      _handleCatchErrors(error, res);
    }
}

exports.getUserRoles = async (req, res) => { 
    try {

        const { page = 1, limit = 10, search = ''} = req.query;
        const skip = (page - 1) * limit;
        const searchFields = ['userRoleName']

        const makeSearchQuery = (searchFields) => {
            let query = {}
            query['$or'] = searchFields.map(item => ({ [item]: { $regex: search, $options: 'i' } }))
            return query
        }

        const query = search ? makeSearchQuery(searchFields) : {}
        const records = { count: 0, rows: [] };

        const userRoles = await UserRole.find(query).skip(skip).limit(parseInt(limit))
        if(userRoles.length < 1){
            return sendResponse({res, status: 400, message: "no user role found"})
        }

        records.rows = userRoles

        records.count =  await UserRole.countDocuments(query);


        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;


        return sendResponse({res,status: 200,data: records,message: "user role list"});


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

exports.getUserRoleList = async (req, res) => { 
  try {

      const userRoles = await UserRole.find({createdBy: req.user._id}).select("_id userRoleName")
      if(userRoles.length < 1){
        return sendResponse({res,status: 200,data: [] ,message: "no user found"});
      }
      return sendResponse({res,status: 200,data: userRoles ,message: "user role list"});


  } catch (error) {
      _handleCatchErrors(error, res);
  }
}

/////////////////////////////////////////////////////////////////////////
// user 

exports.createUser = async (req, res) => {

    try {

        const { firstName, lastName, mobile, email, userType, userRole, isSuperAdmin, password } = req.body
        if(!firstName){
            return sendResponse({res, status: 400, message: "first name not provided"})
        }
        if(!lastName){
            return sendResponse({res, status: 400, message: "last name not provided"})
        }
        if(!mobile){
            return sendResponse({res, status: 400, message: "mobile number not provided"})
        }
        if(!email){
            return sendResponse({res, status: 400, message: "email address not provided"})
        }
   
        const mobileNumber = mobile.trim().toLowerCase()
        
        let uniqueUserId;
        while (true) {
            const userId = generateUserId();

            const isUserAlreadyExist = await MasterUser.findOne({ userId: userId });
            
            if (!isUserAlreadyExist) {
                uniqueUserId = userId;
                break; 
            }
        }

        const isUserAlreadyExist = await MasterUser.findOne({ $or: [{mobile:mobileNumber}]})
        if(isUserAlreadyExist){
          return sendResponse({res, status: 400, message: "user already existed with this mobile number"})
        }

        const salt = await bcrypt.genSalt(8);
        const hashPassword = await bcrypt.hash(password, salt);

        const newUser = new MasterUser({ 
            firstName: firstName, 
            lastName:lastName,
            mobile: mobile,
            email:email,
            isSuperAdmin: isSuperAdmin || false,
            userId: uniqueUserId,
            userType: userType,
            password: hashPassword,
            createdBy: req?.user?._id || null,
            userRole: userRole,
            portalId: req?.user?.portalId || null
        })

        const savedUser = await newUser.save()

        await emailService.sendUserCredentialsEmail({email, firstName, password})

        delete savedUser.password
        return sendResponse({res,status: 200, data: savedUser, message: "New user created successfully"})



    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

exports.getUserPermission = async (req, res) => {

    try {    
        const response = await MasterUser
          .findOne({ _id: req.user._id })
          .populate(["portalId","userRole"])

        if (response) {
          const newResponse = await getPermission(response)
    
          return sendResponse({res, status: 200, data: newResponse, message: "user found successfully"})
        } else {
            return sendResponse({res, status: 400, message: "no user found..."})
        }
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

exports.editUser = async ( req, res) =>{
  try {

      const userId  = req.body.userId
      if(!userId){
          return sendResponse({res, status: 400, message: "user id not provided"})
      }
      const user = await MasterUser.findOne({_id:userId})
      if(!user){
          return sendResponse({res, status: 400, message: "user not exist or wrong user id"})
      }

      if(req.body?.firstName) {
        user.firstName = req.body.firstName.trim();
      }
    
      if(req.body?.lastName) {
          user.lastName = req.body.lastName.trim();
      }
      if(req.body?.userRole.length > 0){
        user.userRole = req.body?.userRole;
      }
      const updatedUser = await user.save()

      return sendResponse({res, status: 200, data: updatedUser, message: "user edited successfully"})
      
  } catch (error) {
      _handleCatchErrors(error, res);
  }
}

exports.toggleStatus = async (req, res) => {
  try {
    const userId  = req.params.id; 
    if(!userId){
      return sendResponse({res, status: 400, message: "user id not provided"})
    }
    const user = await MasterUser.findById(userId);
    if(!user){
      return sendResponse({res, status: 400, message: "user not exist or wrong user id"})
    }

    user.status = user.status === 'active' ? 'inactive' : 'active';

    const updatedUser = await user.save();
    return sendResponse({res, status: 200, data: updatedUser, message: "user status changed successfully"})

  } catch (err) {
    _handleCatchErrors(error, res);
  }
};

exports.getUsersByUser = async (req, res) => { 
  try {

      const { page = 1, limit = 10, search = ''} = req.query;
      const skip = (page - 1) * limit;
      const searchFields = ['firstName']

      const makeSearchQuery = (searchFields) => {
          let query = { createdBy : req.user._id }
          query['$or'] = searchFields.map(item => ({ [item]: { $regex: search, $options: 'i' } }))
          return query
      }

      const query = search ? makeSearchQuery(searchFields) : {createdBy : req.user._id}
      const records = { count: 0, rows: [] };
      const userRoles = await MasterUser.find(query).skip(skip).limit(parseInt(limit))
      if(userRoles.length < 1){
          return sendResponse({res, status: 400, message: "no user found"})
      }

      records.rows = userRoles

      records.count =  await MasterUser.countDocuments(query);


      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;


      return sendResponse({res,status: 200,data: records,message: "user list"});


  } catch (error) {
      _handleCatchErrors(error, res);
  }
}

exports.getSingleUser = async ( req, res) =>{
  try {

      const userId  = req.params.id
      if(!userId){
          return sendResponse({res, status: 400, message: "user id not provided"})
      }
      const user = await MasterUser.findOne({_id:userId}).populate({path:"userRole", select: "_id userRoleName"})
      if(!user){
          return sendResponse({res, status: 400, message: "user not exist or wrong user id"})
      }

      return sendResponse({res, status: 200, data: user, message: "fetched user successfully"})
      
  } catch (error) {
      _handleCatchErrors(error, res);
  }
}


function generateUserId() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const getRandomLetters = () => {
      let result = '';
      for (let i = 0; i < 3; i++) {
          result += letters.charAt(Math.floor(Math.random() * letters.length));
      }
      return result;
  };

  const getRandomNumbers = () => {
      return Math.floor(1000 + Math.random() * 9000).toString();
  };

  return getRandomLetters() + getRandomNumbers();
}



