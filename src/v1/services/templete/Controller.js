const { dumpJSONToCSV, _handleCatchErrors } = require("@src/v1/utils/helpers");
const { exportTemplate } = require("@src/v1/utils/helpers/exportTemplate");
/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @returns 
 */


exports.getExcelTemplate = async (req, res) => {
    try {
        let { template_name } = req.query;
        let excel_headers = exportTemplate(template_name)
        dumpJSONToCSV(req, res, {
            data: [excel_headers],
            fileName: `${template_name}-template.csv`,
            worksheetName: `${template_name}`
        });
    } catch (error) {
        _handleCatchErrors(error, res)
    }
}