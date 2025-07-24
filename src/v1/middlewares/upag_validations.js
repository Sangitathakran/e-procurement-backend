const { body, validationResult } = require('express-validator');

const validateProcurement = [
  body('statecode').isString().notEmpty(),
  body('statename').isString().notEmpty(),
  body('commoditycode').isString().notEmpty(),
  body('scheme').isString().notEmpty(),
  body('sanctionqty').isNumeric().notEmpty(),
  body('quantityprocuredyesterday').isNumeric().notEmpty(),
  body('progressiveprocurement').isNumeric().notEmpty(),
  body('prognooffarmersbenefitted').isNumeric().notEmpty(),
  body('paymentamount').isNumeric().notEmpty(),
  body('lastupdateddate').isISO8601().withMessage('Invalid date format for lastupdateddate'),
  body('procstartdate').isISO8601().withMessage('Invalid date format for procstartdate'),
  body('procenddate').isISO8601().withMessage('Invalid date format for procenddate'),
  body('msp').isNumeric().notEmpty(),
  body('year').isInt({ min: 2000, max: 3000 }),
  body('season').isString().notEmpty(),
  body('uom_of_qty').isString().notEmpty(),
  body('price').isNumeric().notEmpty(),
  body('uom_of_no_of_farmers_benifited').isNumeric().notEmpty(),

  // Final validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ message: 'Validation failed', errors: errors.array() });
    }
    next();
  }
];

const validateStock = [
  body('statecode').isString().notEmpty(),
  body('statename').isString().notEmpty(),
  body('commoditytype').isString().notEmpty(),
  body('commoditycode').isString().notEmpty(),
  body('scheme').isString().notEmpty(),
  body('availableqtypss').isNumeric().notEmpty(),
  body('availableqtypsf').isNumeric().notEmpty(),
  body('ageofstockpss').isString().notEmpty(),
  body('ageofstockpsf').isString().notEmpty(),
  body('lastupdateddate').isISO8601().withMessage('Invalid lastupdateddate format'),
  body('year').isInt({ min: 2000, max: 3000 }),
  body('season').isString().notEmpty(),
  body('uom_of_qty').isString().notEmpty(),
  body('uom_of_age_of_stock').isString().notEmpty(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ message: 'Validation failed', errors: errors.array() });
    }
    next();
  }
];

module.exports = { validateProcurement, validateStock };
