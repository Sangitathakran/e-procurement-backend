const Joi = require("joi");

exports.distilleryStatsSchema = Joi.object({
  totalDistilleriesRegistered: Joi.number().integer().min(0).required()
    .messages({
      "number.base": "Total distilleries registered must be a number",
      "number.integer": "Total distilleries registered must be an integer",
      "number.min": "Total distilleries registered cannot be negative",
      "any.required": "Total distilleries registered is required",
    }),

  totalPOsRaised: Joi.number().integer().min(0).required()
    .messages({
      "number.base": "Total POs raised must be a number",
      "number.integer": "Total POs raised must be an integer",
      "number.min": "Total POs raised cannot be negative",
      "any.required": "Total POs raised is required",
    }),

  totalProcurementMT: Joi.number().min(0).required()
    .messages({
      "number.base": "Total procurement (MT) must be a number",
      "number.min": "Total procurement (MT) cannot be negative",
      "any.required": "Total procurement (MT) is required",
    }),

  totalLiftingMT: Joi.number().min(0).required()
    .messages({
      "number.base": "Total lifting (MT) must be a number",
      "number.min": "Total lifting (MT) cannot be negative",
      "any.required": "Total lifting (MT) is required",
    }),

  totalPaymentByDistilleries: Joi.number().min(0).required()
    .messages({
      "number.base": "Total payment by distilleries must be a number",
      "number.min": "Total payment by distilleries cannot be negative",
      "any.required": "Total payment by distilleries is required",
    }),
});
