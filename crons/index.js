const cron = require("node-cron");
const { sendLog } = require("./sendLogs");
const { default: axios } = require("axios");
const fs = require("fs");
const {
  AgentPaymentFile,
} = require("@src/v1/models/app/payment/agentPaymentFile");
const {
  FarmerPaymentFile,
} = require("@src/v1/models/app/payment/farmerPaymentFile");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const xlsx = require("xlsx");
main().catch((err) => console.log(err));

async function main() {
  cron.schedule("0 9-17/2 * * 1-5", () => {
    sendLog();
  });
  //0 */3 * * *
  //*/30 * * * * *
  cron.schedule("0 */3 * * *", async () => {
    await downloadAgentFile();
  });
  cron.schedule("0 */3 * * *", async () => {
    await downloadFarmerFile();
  });
}
async function downloadAgentFile() {
  console.log("Agent file download running");
  let fileDetails = await AgentPaymentFile.find({ file_status: "upload" });
  //let fileDetails=[{fileName:"AIZER29102024002.xlsx"}]
  for (let item of fileDetails) {
    const url = `https://testbank.navbazar.com/v1/download-file?fileName=R_${item.fileName}`; // Replace with your URL

    const response = await axios.get(url, {
      responseType: "stream",
      headers: {
        "x-api-key": "6719ec42cddd1222948d48f3",
      },
    });
    const filePath = `./src/v1/download/R_${item.fileName}`;
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    writer.on("finish", async () => {
      console.log("File downloaded.");
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      console.log(sheetData);
      let rowsDetails = [];
      console.log("item", item);
      for (let item2 of sheetData) {
        rowsDetails.push({ ...item2 });

        // CORPORATION_CODE: '101923545',
        // CLIENT_CODE: 'NCCFMAIZER',
        // ACCOUNT_NMBR: '2244102000000055',
        // BENEF_ACCOUNT_NMBR: '034301539698',
        // BENEF_DESCRIPTION: 'MANNAVA SRIKANTH',
        // INSTRUMENT_AMNT: 1,
        // PIR_DATE: '29-10-24',
        // BENE_IFSC_CODE: 'HDFC0000982',
        // PIR_REFERENCE_NMBR: 'rakhi123',
        // LIQ_STATUS: 'Paid',
        // UTR_SR_NO: 'ICMS2410300BZA7T',
        // INST_DATE: '29-10-24',
        // PRODUCT_CODE: 'NEFT'
      }
      item.bank_payment_details = [...rowsDetails];
      item.file_status = "download";
      await item.save();
    });
  }
}
async function downloadFarmerFile() {
  console.log("farmer file download running");
  let fileDetails = await FarmerPaymentFile.find({ file_status: "upload" });

  // console.log(fileDetails)
  //let fileDetails=[{fileName:"AIZER29102024002.xlsx"}]
  for (let item of fileDetails) {
    item.fileName = item.fileName;
    await item.save();
    let paymentDetails = await Payment.findById(item.payment_id).populate(
      "farmer_id"
    );

    const url = `https://testbank.navbazar.com/v1/download-file?fileName=R_${item.fileName}`; // Replace with your URL

    const response = await axios.get(url, {
      responseType: "stream",
      headers: {
        "x-api-key": process.env.API_KEY,
      },
    });
    const filePath = `./src/v1/download/R_${item.fileName}`;
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    writer.on("finish", async () => {
      console.log("File downloaded.");
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      console.log(sheetData);
      let rowsDetails = [];
      // console.log("item", item);
      for (let item2 of sheetData) {
        rowsDetails.push({ ...item2 });
        if (
          item2.LIQ_STATUS == "Paid" &&
          paymentDetails.farmer_id.bank_details.account_no ==
            item2.BENEF_ACCOUNT_NMBR
        ) {
          paymentDetails.payment_status = "Completed";
          paymentDetails.transaction_id = item2.UTR_SR_NO;
          await paymentDetails.save();
        }
        // CORPORATION_CODE: '101923545',
        // CLIENT_CODE: 'NCCFMAIZER',
        // ACCOUNT_NMBR: '2244102000000055',
        // BENEF_ACCOUNT_NMBR: '034301539698',
        // BENEF_DESCRIPTION: 'MANNAVA SRIKANTH',
        // INSTRUMENT_AMNT: 1,
        // PIR_DATE: '29-10-24',
        // BENE_IFSC_CODE: 'HDFC0000982',
        // PIR_REFERENCE_NMBR: 'rakhi123',
        // LIQ_STATUS: 'Paid',
        // UTR_SR_NO: 'ICMS2410300BZA7T',
        // INST_DATE: '29-10-24',
        // PRODUCT_CODE: 'NEFT'
      }
      item.bank_payment_details = [...rowsDetails];
      item.file_status = "download";
      await item.save();
    });
  }
}
