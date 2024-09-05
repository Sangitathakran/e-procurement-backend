const exportTemplate = require("@src/v1/utils/constants/exportTemplate");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { dumpJSONToCSV, _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { thirdPartyGetApi } = require("@src/v1/utils/helpers/third_party_Api");
/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @returns 
 */


exports.getExcelTemplate = async (req, res) => {
    try {
        let { template_name, isxlsx = 1 } = req.query;
        let excel_headers = exportTemplate(template_name)
        if (isxlsx == 1) {
            dumpJSONToExcel(req, res, {
                data: [excel_headers],
                fileName: `${template_name}-template.xlsx`,
                worksheetName: `${template_name}`
            });

        } else {
            dumpJSONToCSV(req, res, {
                data: [excel_headers],
                fileName: `${template_name}-template.csv`,
                worksheetName: `${template_name}`
            });
        }
    } catch (error) {
        _handleCatchErrors(error, res)
    }
}
/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @returns 
 */
exports.getAddressByPincode = async (req, res) => {
    try {
        const { pincode } = req.query
        const url = `https://api.postalpincode.in/pincode/${pincode}`
        const records = await thirdPartyGetApi(url, {})

        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found() }))
    } catch (error) {
        _handleCatchErrors(error, res)
    }
}

