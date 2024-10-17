const { checkSchema } = require('express-validator');
const { _titles, _gender, _maritalStatus, _religion, _category, _status, _proofType, _areaUnit, _soilType, _distanceUnit, _yesNo, _seasons, _seedUsed, } = require('@src/v1/utils/constants');
    const validateFarmer =  checkSchema({
    'name': {
      notEmpty: {
        errorMessage: 'Name is required',
      },
      isString: {
        errorMessage: 'Name must be a string',
      },
      isLength: {
        options: { min: 3 },
        errorMessage: 'Name must be at least 3 characters long',
      },
    },
    'parents.father_name': {
        notEmpty: {
          errorMessage: 'Father Name is required',
        },
        isString: {
            errorMessage: 'Father Name must be a string',
          },
        isLength: {
          options: { min: 3 },
          errorMessage: 'Father Name must be at least 3 characters long',
        },
      },
    'title':  {
        isIn: {
          options: [Object.values(_titles)],
          errorMessage: 'Title must be one of the valid options',
        },
        optional: true,
      },
    'dob': {
      optional: true,
    },
    'gender': {
      isIn: {
        options: [Object.values(_gender)],
        errorMessage: 'Gender must be one of the valid options',
      },
      optional: true,
    },
    'marital_status': {
      isIn: {
        options: [Object.values(_maritalStatus)],
        errorMessage: 'Marital status must be one of the valid options',
      },
      optional: true,
    },
    'religion': {
      isIn: {
        options: [Object.values(_religion)],
        errorMessage: 'Religion must be one of the valid options',
      },
      optional: true,
    },
    'category': {
      isIn: {
        options: [Object.values(_category)],
        errorMessage: 'Category must be one of the valid options',
      },
      optional: true,
    },
    'education.highest_edu': {
      optional: true,
      trim: true,
    },
    'education.edu_details': {
      optional: true,
      isArray: {
        errorMessage: 'Education details must be an array of strings',
      },
      custom: {
        options: (value) => value.every(item => typeof item === 'string'),
        errorMessage: 'Each education detail must be a string',
      },
    },
    'mobile_no': {
      in: ['body'],
      optional: true,
      trim: true,
    },
    'email': {
      optional: true,
      isEmail: {
        errorMessage: 'Enter a valid email address',
      },
      trim: true,
    },
    'address.address_line': {
      notEmpty: {
        errorMessage: 'Address line is required',
      },
      isLength: {
        options: { min: 3 },
        errorMessage: 'Address line must be at least 3 characters long',
      },
    },
    'address.country': {
      optional: true,
      trim: true,
    },
    'address.state_id': {
      optional: true,
      isMongoId: {
        errorMessage: 'State ID must be a valid MongoDB ObjectId',
      },
    },
    'address.district_id': {
      optional: true,
      isMongoId: {
        errorMessage: 'District ID must be a valid MongoDB ObjectId',
      },
    },
    'address.block': {
      optional: true,
      trim: true,
    },
    'address.village': {
      optional: true,
      trim: true,
    },
    'address.pinCode': {
      optional: true,
      isLength: {
        options: { min: 5, max: 6 },
        errorMessage: 'Pin code must be 5-6 characters long',
      },
    },
    'proof.aadhar_no': {
      notEmpty: {
        errorMessage: 'Aadhar number is required',
      },
      isLength: {
        options: { min: 12, max: 12 },
        errorMessage: 'Aadhar number must be 12 characters long',
      },
    },
    'proof.type': {
      isIn: {
        options: [Object.values(_proofType)],
        errorMessage: 'Proof type must be one of the valid options',
      },
      optional: true,
    },
    'proof.doc': {
      optional: true,
      trim: true,
    },
    'status': {
      isIn: {
        options: [Object.values(_status)],
        errorMessage: 'Status must be one of the valid options',
      },
      optional: true,
    },
});
const validateLand = checkSchema({
    'farmer_id': {
      notEmpty: {
        errorMessage: 'Farmer ID is required',
      },
      isMongoId: {
        errorMessage: 'Farmer ID must be a valid MongoDB ObjectId',
      },
    },
    'cultivation_area': {
      optional: true,
      isFloat: {
        options: { min: 0 },
        errorMessage: 'Cultivated area must be a positive number',
      },
    },
    'total_area': {
      optional: true,
      isFloat: {
        options: { min: 0 },
        errorMessage: 'Total area must be a positive number',
      },
    },
    'area_unit': {
      isIn: {
        options: [Object.values(_areaUnit)],
        errorMessage: 'Area unit must be one of the valid options',
      },
      optional: true,
    },
    'khasra_no': {
      optional: true,
      trim: true,
      isLength: {
        options: { min: 1 },
        errorMessage: 'Khasra number must be at least 1 character long',
      },
    },
    'khatauni': {
      optional: true,
      trim: true,
    },
    'sow_area': {
      optional: true,
      trim: true,
    },
    'land_address.country': {
      optional: true,
      trim: true,
      default: 'India',
    },
    'land_address.state_id': {
      optional: true,
      isMongoId: {
        errorMessage: 'State ID must be a valid MongoDB ObjectId',
      },
    },
    'land_address.district_id': {
      optional: true,
      isMongoId: {
        errorMessage: 'District ID must be a valid MongoDB ObjectId',
      },
    },
    'land_address.sub_district': {
      optional: true,
      trim: true,
    },
    'document': {
      optional: true,
      trim: true,
    },
    'expected_production': {
      optional: true,
      trim: true,
    },
    'soil_type': {
      isIn: {
        options: [Object.values(_soilType)],
        errorMessage: 'Soil type must be one of the valid options',
      },
      optional: true,
    },
    'soil_tested': {
      isIn: {
        options: [Object.values(_yesNo)],
        errorMessage: 'Soil tested must be one of the valid options',
      },
      optional: true,
    },
    'soil_health_card': {
      isIn: {
        options: [Object.values(_yesNo)],
        errorMessage: 'Soil health card must be one of the valid options',
      },
      optional: true,
    },
    'soil_health_card_doc': {
      optional: true,
      trim: true,
    },
    'soil_testing_lab_name': {
      optional: true,
      trim: true,
    },
    'lab_distance_unit': {
      isIn: {
        options: [Object.values(_distanceUnit)],
        errorMessage: 'Lab distance unit must be one of the valid options',
      },
      optional: true,
    },
    'status': {
      isIn: {
        options: [Object.values(_status)],
        errorMessage: 'Status must be one of the valid options',
      },
      optional: true,
    },
  });
  const validateCrop = checkSchema({
    'farmer_id': {
      notEmpty: {
        errorMessage: 'Farmer ID is required',
      },
      isMongoId: {
        errorMessage: 'Farmer ID must be a valid MongoDB ObjectId',
      },
    },
    'sowing_date': {
      optional: true,
      notEmpty: {
        errorMessage: 'Sowing Date is required',
      },
      
    },
    'harvesting_date': {
      optional: true,
      notEmpty: {
        errorMessage: 'Harvesting Date is required',
      },
    },
    'crops_name': {
      notEmpty: {
        errorMessage: 'Crops name is required',
      },
      trim: true,
    },
    'production_quantity': {
      optional: true,
      isFloat: {
        options: { min: 0 },
        errorMessage: 'Production quantity must be a positive number',
      },
    },
    'area_unit': {
      optional: true,
      isIn: {
        options: [Object.values(_areaUnit)],
        errorMessage: 'Area unit must be one of the valid options',
      },
    },
    'total_area': {
      optional: true,
      isFloat: {
        options: { min: 0 },
        errorMessage: 'Total area must be a positive number',
      },
    },
    'productivity': {
      optional: true,
      isFloat: {
        options: { min: 0 },
        errorMessage: 'Productivity must be a positive number',
      },
    },
    'selling_price': {
      optional: true,
      isFloat: {
        options: { min: 0 },
        errorMessage: 'Selling price must be a positive number',
      },
    },
    'market_price': {
      optional: true,
      isFloat: {
        options: { min: 0 },
        errorMessage: 'Market price must be a positive number',
      },
    },
    'yield': {
      optional: true,
      trim: true,
    },
    'seed_used': {
      optional: true,
      isIn: {
        options: [Object.values(_seedUsed)],
        errorMessage: 'Seed used must be one of the valid options',
      },
      trim: true,
    },
    'fertilizer_used': {
      optional: true,
      isIn: {
        options: [Object.values(_yesNo)],
        errorMessage: 'Fertilizer used must be one of the valid options',
      },
      trim: true,
    },
    'fertilizer_name': {
      optional: true,
      trim: true,
    },
    'fertilizer_dose': {
      optional: true,
      trim: true,
    },
    'pesticide_used': {
      optional: true,
      isIn: {
        options: [Object.values(_yesNo)],
        errorMessage: 'Pesticide used must be one of the valid options',
      },
      trim: true,
    },
    'pesticide_name': {
      optional: true,
      trim: true,
    },
    'pesticide_dose': {
      optional: true,
      trim: true,
    },
    'insecticide_used': {
      optional: true,
      isIn: {
        options: [Object.values(_yesNo)],
        errorMessage: 'Insecticide used must be one of the valid options',
      },
      trim: true,
    },
    'insecticide_name': {
      optional: true,
      trim: true,
    },
    'insecticide_dose': {
      optional: true,
      trim: true,
    },
    'crop_insurance': {
      optional: true,
      isIn: {
        options: [Object.values(_yesNo)],
        errorMessage: 'Crop insurance must be one of the valid options',
      },
      trim: true,
    },
    'insurance_company': {
      optional: true,
      trim: true,
    },
    'insurance_worth': {
      optional: true,
      isFloat: {
        options: { min: 0 },
        errorMessage: 'Insurance worth must be a positive number',
      },
    },
    'crop_seasons': {
      optional: true,
      isIn: {
        options: [Object.values(_seasons)],
        errorMessage: 'Crop season must be one of the valid options',
      },
      trim: true,
    },
    'status': {
      optional: true,
      isIn: {
        options: [Object.values(_status)],
        errorMessage: 'Status must be one of the valid options',
      },
    },
  });
  const validateBank = checkSchema({
    'farmer_id': {
      notEmpty: {
        errorMessage: 'Farmer ID is required',
      },
      isMongoId: {
        errorMessage: 'Farmer ID must be a valid MongoDB ObjectId',
      },
    },
    'bank_name': {
      notEmpty: {
        errorMessage: 'Bank name is required',
      },
      isString: {
        errorMessage: 'Bank name must be a string',
      },
      isLength: {
        options: { min: 3 },
        errorMessage: 'Bank name must be at least 3 characters long',
      },
    },
    'account_holder_name': {
      notEmpty: {
        errorMessage: 'Account holder name is required',
      },
      isString: {
        errorMessage: 'Account holder name must be a string',
      },
      isLength: {
        options: { min: 3 },
        errorMessage: 'Account holder name must be at least 3 characters long',
      },
    },
    'account_no': {
      notEmpty: {
        errorMessage: 'Account number is required',
      },
      isLength: {
        options: { min: 10, max: 20 },
        errorMessage: 'Account number must be between 10 and 20 characters long',
      },
      isNumeric: {
        errorMessage: 'Account number must be a numeric value',
      },
    },
    'ifsc_code': {
      notEmpty: {
        errorMessage: 'IFSC code is required',
      },
      isLength: {
        options: { min: 8, max: 11 },
        errorMessage: 'IFSC code must be 11 characters long',
      },
      isAlphanumeric: {
        errorMessage: 'IFSC code must be alphanumeric',
      },
    },
    'branch_address.bank_state_id': {
      optional: true,
      isMongoId: {
        errorMessage: 'Bank state ID must be a valid MongoDB ObjectId',
      },
    },
    'branch_address.bank_district_id': {
      optional: true,
      isMongoId: {
        errorMessage: 'Bank district ID must be a valid MongoDB ObjectId',
      },
    },
    'branch_address.city': {
      optional: true,
      isString: {
        errorMessage: 'City must be a string',
      },
      isLength: {
        options: { min: 2 },
        errorMessage: 'City must be at least 2 characters long',
      },
    },
    'branch_address.bank_block': {
      optional: true,
      isString: {
        errorMessage: 'Bank block must be a string',
      },
      isLength: {
        options: { min: 2 },
        errorMessage: 'Bank block must be at least 2 characters long',
      },
    },
    'branch_address.bank_pincode': {
      optional: true,
      isLength: {
        options: { min: 5, max: 6 },
        errorMessage: 'Bank pincode must be 5 or 6 characters long',
      },
      isNumeric: {
        errorMessage: 'Bank pincode must be a numeric value',
      },
    },
    'document': {
      optional: true,
      isURL: {
        errorMessage: 'Document must be a valid URL',
      },
    },
  });



const validationSchemas = {
  basic_details:  {
    'basic_details.name': {
      notEmpty: {
        errorMessage: 'Name is required',
      },
      isLength: {
        options: { min: 3 },
        errorMessage: 'Name must be at least 3 characters long',
      },
    },

    'basic_details.email': {
      notEmpty: {
        errorMessage: 'Email is required',
      },
      isEmail: {
        errorMessage: 'Enter a valid email address',
      },
      isLength: {
        options: { min: 3 },
        errorMessage: 'Email must be at least 3 characters long',
      },
    },
    'basic_details.father_husband_name': {
      notEmpty: {
        errorMessage: 'Father/Husband name is required',
      },
    },
    'basic_details.mobile_no': {
      notEmpty: {
        errorMessage: 'Mobile number is required',
      },
    },
    'basic_details.category': {
      notEmpty: {
        errorMessage: 'Category is required',
      },
    },
    'basic_details.dob': {
      notEmpty: {
        errorMessage: 'Date of birth is required',
      },
    },
    'basic_details.farmer_type': {
      notEmpty: {
        errorMessage: 'Farmer type is required',
      },
    },
    'basic_details.gender': {
      notEmpty: {
        errorMessage: 'Gender is required',
      },
    },
  },

  address:  {
    'address.address_line_1': {
      notEmpty: {
        errorMessage: 'Address line 1 is required',
      },
      isLength: {
        options: { min: 3 },
        errorMessage: 'Address line 1 must be at least 3 characters long',
      },
    },
    'address.address_line_2': {
      notEmpty: {
        errorMessage: 'Address line 2 is required',
      },
    },
    'address.country': {
      notEmpty: {
        errorMessage: 'Country is required',
      },
    },
    'address.state': {
      notEmpty: {
        errorMessage: 'State is required',
      },
    },
    'address.district': {
      notEmpty: {
        errorMessage: 'District is required',
      },
    },
    'address.block': {
      notEmpty: {
        errorMessage: 'Block is required',
      },
    },
    'address.village': {
      notEmpty: {
        errorMessage: 'Village is required',
      },
    },
    'address.pinCode': {
      notEmpty: {
        errorMessage: 'Pin code is required',
      },
      isLength: {
        options: { min: 5, max: 6 },
        errorMessage: 'Pin code must be 5-6 characters long',
      },
    },
  },

  land_details:  {
    'land_details.area': {
      notEmpty: {
        errorMessage: 'Area is required',
      },
    },
    'land_details.area_unit': {
      notEmpty: {
        errorMessage: 'area_unit is required',
      },
    },
    'land_details.pinCode': {
      notEmpty: {
        errorMessage: 'Pin code is required',
      },
      isLength: {
        options: { min: 5, max: 6 },
        errorMessage: 'Pin code must be 5-6 characters long',
      },
    },
    'land_details.state': {
      notEmpty: {
        errorMessage: 'State is required',
      },
    },
    'land_details.district': {
      notEmpty: {
        errorMessage: 'District is required',
      },
    },
    'land_details.village': {
      notEmpty: {
        errorMessage: 'Village is required',
      },
    },
    'land_details.block': {
      notEmpty: {
        errorMessage: 'Block is required',
      },
    },
    'land_details.ghat_number': {
      notEmpty: {
        errorMessage: 'Ghat number is required',
      },
    },
    'land_details.khasra_number': {
      notEmpty: {
        errorMessage: 'Khasra number is required',
      },
    },
    'land_details.Khasra_doc_key': {
      notEmpty: {
        errorMessage: 'Khasra_doc_key is required',
      },
    },
    'land_details.kharif_crops': {
      notEmpty: {
        errorMessage: 'Kharif crops is required',
      },
    },
    'land_details.rabi_crops': {
      notEmpty: {
        errorMessage: 'Rabi crops is required',
      },
    },
    'land_details.zaid_crops': {
      notEmpty: {
        errorMessage: 'Zaid crops is required',
      },
    },
  },

  documents:  {
    'documents.aadhar_number': {
      notEmpty: {
        errorMessage: 'Aadhar number is required',
      },
      isLength: {
        options: { min: 12, max: 12 },
        errorMessage: 'Aadhar number must be 12 characters long',
      },
    },
    'documents.aadhar_front_doc_key': {
      notEmpty: {
        errorMessage: 'aadhar_front_doc_key is required',
      },
    },
    'documents.aadhar_back_doc_key': {
      notEmpty: {
        errorMessage: 'aadhar_back_doc_key is required',
      },
    },
    'documents.pan_number': {
      notEmpty: {
        errorMessage: 'PAN number is required',
      },
      isLength: {
        options: { min: 10, max: 10 },
        errorMessage: 'PAN number must be 10 characters long',
      },
    },
    'documents.pan_doc_key': {
      notEmpty: {
        errorMessage: 'pan_doc_key is required',
      },
    },
  },

  bank_details:  {
    'bank_details.bank_name': {
      notEmpty: {
        errorMessage: 'Bank name is required',
      },
    },
    'bank_details.branch_name': {
      notEmpty: {
        errorMessage: 'Branch name is required',
      },
    },
    'bank_details.account_holder_name': {
      notEmpty: {
        errorMessage: 'Account holder name is required',
      },
    },
    'bank_details.ifsc_code': {
      notEmpty: {
        errorMessage: 'IFSC code is required',
      },
      isLength: {
        options: { min: 11, max: 11 },
        errorMessage: 'IFSC code must be 11 characters long',
      },
    },
    'bank_details.account_no': {
      notEmpty: {
        errorMessage: 'Account number is required',
      },
    },
    'bank_details.proof_doc_key': {
      notEmpty: {
        errorMessage: 'Proof document key is required',
      },
    },
  },
};
//update
const validateIndFarmer = async (req, res, next) => {
  if (!req?.query?.screenName) {
    return res.status(400).json({ message: 'Please Provide Screen Name' });
  }
               await checkSchema(validationSchemas[req?.query?.screenName]).run(req);

  next();
};
const validateRegisterDetail =  checkSchema({
  'registerName': {
    in: ['body'],
    isString: {
      errorMessage: 'Register name must be a string'
    },
    notEmpty: {
      errorMessage: 'Register name is required'
    }
  }
});


module.exports = { validateFarmer,validateLand, validateCrop, validateBank,validateRegisterDetail,validateIndFarmer };