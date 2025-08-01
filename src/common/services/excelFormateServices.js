const xlsx = require("xlsx");
const logger = require("@common/logger/logger");

/**
 * Parses XLSX or CSV file buffer and extracts records and headers
 * @param {Buffer} fileBuffer - The file buffer
 * @param {boolean} isXlsx - True if file is XLSX, false if CSV
 * @returns {{ headers: string[], records: object[] }} Parsed data or empty on failure
 */
function formatCheck(fileBuffer, isXlsx) {
    try {
        if (!fileBuffer) {
            logger.warn("No file buffer provided.");
            return { headers: [], records: [] };
        }
        console.log(fileBuffer)

        let records = [];
        let headers = [];

        if (isXlsx) {
            const workbook = xlsx.read(fileBuffer.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            records = xlsx.utils.sheet_to_json(worksheet);
            headers = Object.keys(records[0]);
        } else {
            const csvContent = fileBuffer.buffer.toString('utf8');
            const lines = csvContent.split('\n');
            headers = lines[0].trim().split(',');
            records = lines.slice(1).map(line => {
                const values = line.trim().split(',');
                return headers.reduce((obj, key, index) => {
                    obj[key] = values[index] || null;
                    return obj;
                }, {});
            });
        }

        console.log("Parsed Records:", records);
        return { headers, records };
    } catch (error) {
        console.log(error.message)
        logger.error("Error in formatCheck:", error);
        return { headers: [], records: [] };
    }
}



module.exports = {
    formatCheck,
};
