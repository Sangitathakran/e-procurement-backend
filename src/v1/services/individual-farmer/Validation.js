const { checkSchema } = require('express-validator');

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
const validateFarmer = async (req, res, next) => {
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


module.exports = {validateFarmer,validateRegisterDetail};
