const { checkSchema } = require('express-validator');

const validateLogin =  checkSchema({
    'email': {
      in: ['body'],
      isString: {
        errorMessage: 'Email  must be a string'
      },
      notEmpty: {
        errorMessage: 'Email is required'
      }
    },
    'password': {
      in: ['body'],
      isString: {
        errorMessage: 'Password  must be a alphanumeric'
      },
      notEmpty: {
        errorMessage: 'Password is required'
      }
    },
  });
  module.exports = {validateLogin};