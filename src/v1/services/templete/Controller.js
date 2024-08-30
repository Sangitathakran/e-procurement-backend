const exportTemplate = require("@src/v1/utils/constants/exportTemplate");
const { dumpJSONToCSV, _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
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