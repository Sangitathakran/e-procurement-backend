 const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const dumpJSONToExcel = (data, fileName, worksheetName = "Sheet1", folderPath = path.join(__dirname, "../../logs")) => {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, worksheetName);

  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);

  const filePath = path.join(folderPath, fileName);
  xlsx.writeFile(wb, filePath);
  // console.log("📄 Excel written:", filePath);
};

module.exports = dumpJSONToExcel;
