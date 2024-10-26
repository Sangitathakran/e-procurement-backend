const { sendResponse, serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { FeatureList } = require("@src/v1/models/master/FeatureList");
const UserRole = require("@src/v1/models/master/UserRole");
const {MasterUser} = require("@src/v1/models/master/MasterUser")
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const bcrypt = require("bcrypt");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const { _featureType, _frontendLoginRoutes, _userType } = require("@src/v1/utils/constants");
const { TypesModel } = require("@src/v1/models/master/Types");
const getIpAddress = require("@src/v1/utils/helpers/getIPAddress");
const { generateRandomPassword } = require("@src/v1/utils/helpers/randomGenerator");
const { Agency } = require("@src/v1/models/app/auth/Agency");
const { _response_message } = require("@src/v1/utils/constants/messages");
const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");




exports.getFeatures = async (req, res) =>{

    try {
     const typeData = await TypesModel.find()
     const type = typeData.reduce((acc, item)=>[...acc, item.featureType], [])
     const featureType = req.params.type 
     if(!type.includes(featureType)){
        return sendResponse({ res, status:400, message: "Invalid feature type"})
     }
     const features = await FeatureList.find({featureType:featureType})
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

        const isUserRoleExist = await UserRole.findOne({userRoleName:userRole, createdBy:req.user._id})
        if(isUserRoleExist){
            return sendResponse({res, status: 400, message: "user role is already exist"})
        }

        const newUserRole = new UserRole({ 
            userRoleName: userRole, 
            createdBy: req?.user?._id,
            userRoleType: req?.user?.user_type,
            features : features,
            ipAddress: getIpAddress(req)
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
        const typeData = await TypesModel.find()
        const type = typeData.reduce((acc, item)=>[...acc, item.featureType], [])
        const user_type = typeData.find(item=>item.user_type===response.userRoleType)
        const featureType = user_type.featureType

        if(!type.includes(featureType)){
          return sendResponse({ res, status:400, message: "Invalid feature type"})
        }

        const features = await FeatureList.find({featureType:featureType})
      
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
  
function mergeArrays(arrayA, arrayB) {
      
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

        if(features.length > 0 && userRoleName){
            userRole.userRoleName = userRoleName
            userRole.features = features
            userRole.updatedBy = req.user._id
            userRole.ipAddress = getIpAddress(req)

            const response = await userRole.save()
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

        let query = search ? makeSearchQuery(searchFields) : {}
        const records = { count: 0, rows: [] };

        query = {...query, createdBy: req.user._id}

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
        return sendResponse({res,status: 200,data: [] ,message: "no user role found"});
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

        const { firstName, lastName, mobile, email, userRole } = req.body
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

        const isUserAlreadyExist = await MasterUser.findOne({ $or: [{mobile:mobileNumber},{email:email}]})
        if(isUserAlreadyExist){
          return sendResponse({res, status: 400, message: "user already existed with this mobile number or email"})
        }

        const password = generateRandomPassword();
        const salt = await bcrypt.genSalt(8);
        const hashPassword = await bcrypt.hash(password, salt); // hashing the uniqueUserId as password

        const newUser = new MasterUser({ 
            firstName: firstName, 
            lastName:lastName,
            mobile: mobile,
            email:email,
            // isSuperAdmin: true,
            // userId: uniqueUserId,
            user_type: req?.user?.user_type,
            password: hashPassword,
            createdBy: req?.user?._id,
            userRole: userRole,
            portalId: req?.user?.portalId,
            ipAddress: getIpAddress(req)
        })

        const savedUser = await newUser.save()

        //assigned user role increment 
        savedUser.userRole.map(async (role) => {
          await UserRole.findOneAndUpdate(
            { _id: role },
            { $inc: { userAssigned: 1 } }
          );
        });

        const reversedUserType = Object.fromEntries(
          Object.entries(_userType).map(([key, value]) => [value, key])
        );

        const login_url = `${process.env.FRONTEND_URL}${_frontendLoginRoutes[reversedUserType[req.user.user_type]]}`
        await emailService.sendUserCredentialsEmail({email, firstName, password, login_url})

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
          const typeData = await TypesModel.find()
    
          return sendResponse({res, status: 200, data: {permissions: newResponse, typeData: typeData}, message: "user found successfully"})
        } else {
            return sendResponse({res, status: 400, message: "no user found..."})
        }
      } catch (error) {
        _handleCatchErrors(error, res);
    }
}

const getPermission = async (response) => { 

    const typeData = await TypesModel.find()
    const type = typeData.reduce((acc, item)=>[...acc, item.featureType], [])
    const user_type = typeData.find(item=>item.user_type===response.user_type)
    const featureType = user_type.featureType 
    if(!type.includes(featureType)){
        return sendResponse({ res, status:400, message: "Invalid feature type"})
    }

    const featureListDoc = await FeatureList.find({featureType:featureType})
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
                existingSubFeature.subFeatureName.toLowerCase() === subFeature.subFeatureName.toLowerCase()
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
      const previousUser = await MasterUser.findOne({_id:userId})
      user.ipAddress = getIpAddress(req)
      user.updatedBy = req.user._id
      const updatedUser = await user.save()


      if(previousUser &&  updatedUser){
        // checking the removal of userRole
        previousUser.userRole.forEach(async (beforeRole) => {
          if (!updatedUser.userRole.includes(beforeRole)) {
            await UserRole.findOneAndUpdate(
              { _id: beforeRole },
              { $inc: { userAssigned: -1 } }
            );
          }
        });

        //checking the addition of userRole
        updatedUser.userRole.forEach(async (afterRole) => {
          if (!previousUser.userRole.includes(afterRole)) {
            await UserRole.findOneAndUpdate(
              { _id: afterRole },
              { $inc: { userAssigned: 1 }},
              
            );
          }
        });
      }

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
      const userRoles = await MasterUser.find(query,{password: 0}).populate({path:"userRole", select: "_id userRoleName"}).skip(skip).limit(parseInt(limit))
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

module.exports.getAgency = async (req, res) => {

  try {
      const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
      let query = {
          ...(search ? { first_name: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
      };

      query = {...query, _id: { $ne: req.user.portalId } }

      const records = { count: 0 };
      records.rows = paginate == 1
          ? await Agency.find(query).sort(sortBy).skip(skip).limit(parseInt(limit))
          : await Agency.find(query).sort(sortBy);

      records.count = await Agency.countDocuments(query);

      if (paginate == 1) {
          records.page = page
          records.limit = limit
          records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
      }

      return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Agency") }));

  } catch (error) {
      _handleCatchErrors(error, res);
  }
}

module.exports.getHo = async (req, res) => {

  try {
      const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
      let query = {
          ...(search ? { 'company_details.name': { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
      };

      if (paginate == 0) {
          query.active = true
      }
      const records = { count: 0 };
      records.rows = await HeadOffice.aggregate([
          { $match: query },
          {
              $lookup: {
                  from: 'branches', // Name of the Branches collection in the database
                  localField: '_id',
                  foreignField: 'headOfficeId',
                  as: 'branches'
              }
          },
          {
              $addFields: {
                  branchCount: { $size: '$branches' }
              }
          },
          {
              ...(paginate == 1 && {
                  $project: {
                      _id: 1,
                      office_id: 1,
                      'company_details.name': 1,
                      registered_time: 1,
                      branchCount: 1,
                      'point_of_contact.name': 1,
                      'point_of_contact.email': 1,
                      'point_of_contact.mobile': 1,
                      'point_of_contact.designation': 1,
                      registered_time: 1,
                      head_office_code: 1,
                      active: 1,
                      address: 1,
                      createdAt: 1,
                      updatedAt: 1
                  }
              }),
              ...(paginate == 0 && {
                  $project: {
                      _id: 1,
                      office_id: 1,
                      'company_details.name': 1,
                      'point_of_contact.name': 1,
                      'point_of_contact.email': 1,
                      'point_of_contact.designation': 1,
                      head_office_code: 1,
                  }
              })
          },
          { $sort: sortBy },
          ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : []) // Pagination if required
      ]);

      records.count = await HeadOffice.countDocuments(query);

      if (paginate == 1) {
          records.page = page
          records.limit = limit
          records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
      }

      return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Head Office") }));

  } catch (error) {
      _handleCatchErrors(error, res);
  }
}

module.exports.getBo = async (req, res) => {
  try {
    const { limit = 10, skip = 0 , paginate = 1, search = '', page = 1 } = req.query;

    // Adding search filter
    const searchQuery = search ? {
      branchName: { $regex: search, $options: 'i' }        // Case-insensitive search for branchName
     } : {};

    // Count total documents for pagination purposes, applying search filter
    const totalCount = await Branches.countDocuments(searchQuery);

     // Determine the effective limit
    const effectiveLimit = Math.min(parseInt(limit), totalCount);

    // Fetch paginated branch data with search and sorting
    let branches = await Branches.find(searchQuery)
      .limit(effectiveLimit)    // Limit the number of documents returned
      .skip(parseInt(skip))      // Skip the first 'n' documents based on pagination
      .sort({ createdAt: -1 });  // Sort by createdAt in descending order by default

    // If paginate is set to 0, return all branches without paginating
    if (paginate == 0) {
      branches = await Branches.find(searchQuery).sort({ createdAt: -1 });
    }

    // Calculate total pages for pagination
    const totalPages = Math.ceil(totalCount / limit);

    // Return the branches along with pagination info
    return res.status(200).send(
      new serviceResponse({
        status: 200,
        message: "Branches fetched successfully",
        data: {
          branches: branches,
          totalCount: totalCount,
          totalPages: totalPages,
          limit: effectiveLimit,
          page: parseInt(page)
        },
      })
    );
  } catch (err) {
    return res.status(500).send(new serviceResponse({ status: 500, errors: [{ message: err.message }] }));
  }
};



