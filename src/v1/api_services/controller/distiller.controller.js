const distillerService = require('@src/v1/api_services/services/distiller.service');
const { _handleCatchErrors } = require('@src/v1/utils/helpers');

exports.createDistiller = async (req, res) => {
  try {
    await distillerService.createDistiller(req, res);
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};
