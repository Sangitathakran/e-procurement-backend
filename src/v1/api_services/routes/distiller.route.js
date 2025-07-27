const express = require('express');
const router = express.Router();
const distillerController = require('@src/v1/controllers/distiller.controller');
const validate = require('@src/v1/middlewares/validate');
const { createDistillerSchema } = require('@src/v1/validators/distiller.validator');

router.post('/create', validate(createDistillerSchema), distillerController.createDistiller);

module.exports = router;
