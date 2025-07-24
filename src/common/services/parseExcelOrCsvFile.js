const xlsx = require("xlsx");
const csv = require("csv-parser");
const { Readable } = require("stream");

function parseExcel(buffer) {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  return Promise.resolve(data);
}

function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString("utf8"));
    stream.pipe(csv())
      .on("data", (data) => {
        if (Object.values(data).some((val) => val.trim() !== "")) {
          results.push(data);
        }
      })
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

module.exports = async function parseExcelOrCsvFile(file, isxlsx) {
  if (!file?.buffer) throw new Error("Invalid file");
  return isxlsx ? parseExcel(file.buffer) : parseCSV(file.buffer);
};
