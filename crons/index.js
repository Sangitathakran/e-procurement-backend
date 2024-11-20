const cron = require("node-cron");
const { sendLog } = require("./sendLogs");
const { default: axios } = require("axios");
const fs = require("fs");
const path = require('path');
const {
  AgentPaymentFile,
} = require("@src/v1/models/app/payment/agentPaymentFile");
const {
  FarmerPaymentFile,
} = require("@src/v1/models/app/payment/farmerPaymentFile");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const xlsx = require("xlsx");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
main().catch((err) => console.log(err));
//update
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

  // cron.schedule("*/30 * * * * *", async () => {
  //   await downloadAgentFile();
  // });
  // cron.schedule("*/30 * * * * *", async () => {
  //   await downloadFarmerFile();
  // });
  
}

async function downloadAgentFile() {
  try{

 
  console.log("Agent file download running");
  let fileDetails = await AgentPaymentFile.find({ file_status: "upload" });
  // let fileDetails = await AgentPaymentFile.find({ _id:"673b09983e809c62989a9731" });
  console.log("fileDetails--->", fileDetails)
  // let fileDetails=[{fileName:"AIZER181124004.csv"}]
  for (let item of fileDetails) {
    try{

   
    const url = `https://testbank.navbazar.com/v1/download-file?fileName=R_${item.fileName}`; // Replace with your URL

    const response = await axios.get(url, {
      responseType: "stream",
      headers: {
        "x-api-key": process.env.API_KEY,
      },
    });
    // console.log("response-->", response.data)
    const filePath = `./src/v1/download/R_${item.fileName}`;

    // Check if the directory exists, and create it if not
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

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
      item["received_file_details"] = rowsDetails[0];
      item.file_status = "download";
      await item.save();
    });
  }catch(err){
    if (err.response && err.response.status === 400) {
      console.error(`Error Skipping to next index.`);
    } else {
      console.error(`Error at index ${i}:`, err.message);
    }
    continue
  }
  }
}catch(err){
  console.log('error',err)
}
}
async function downloadFarmerFile() {
  console.log("farmer file download running");
  let fileDetails = await FarmerPaymentFile.find({ file_status: "upload" });
    console.log('fileDetails',fileDetails)
  for (let item of fileDetails) {
    try{
    let rowsDetails = []

    for ( let farmer of item.send_file_details ){

      let paymentDetails = await Payment.findById(farmer.payment_id).populate(
        "farmer_id"
      );
      console.log('paymentDetails',paymentDetails)
      const url = `https://testbank.navbazar.com/v1/download-file?fileName=R_${item.fileName}`; // Replace with your URL
  
      const response = await axios.get(url, {
        responseType: "stream",
        headers: {
          "x-api-key": process.env.API_KEY,
        },
      });
      const filePath = `./src/v1/download/R_${item.fileName}`;

      // Check if the directory exists, and create it if not
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }


      const writer = fs.createWriteStream(filePath);
  
      response.data.pipe(writer);
  
      writer.on("finish", async () => {
        console.log("File downloaded.");
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        console.log(sheetData);
        ;
        // console.log("item", item);
        for (let item2 of sheetData) {
          rowsDetails.push({ ...item2 });
          if (
            item2.ADDR_5 == "Paid" &&
            paymentDetails.farmer_id.bank_details.account_no ==
              item2.BENEF_BRANCH_CODE
          ) {
            paymentDetails.payment_status = "Completed";
            paymentDetails.transaction_id = item2.UTR_SR_NO;
            await paymentDetails.save();

            //updateing the FarmerOrders collection 
            console.log('farmer_order_id',paymentDetails.farmer_order_id)
            const farmerOrder = await FarmerOrders.findOne({_id:paymentDetails.farmer_order_id});
            
            farmerOrder.payment_status = "Completed"
            await farmerOrder.save()
          }

          else{
            paymentDetails.payment_status = "Failed";
            paymentDetails.transaction_id = item2.UTR_SR_NO;
            await paymentDetails.save();

            //updateing the FarmerOrders collection 
            const farmerOrder = await FarmerOrders.findOne({_id:paymentDetails.farmer_order_id})
            farmerOrder.payment_status = "Failed"
            await farmerOrder.save()
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
      
      });

    }

    item.received_file_details = rowsDetails;
    item.file_status = "download";
    await item.save();
  }catch(err){
    if (err.response && err.response.status === 400) {
      console.error(`Error Skipping to next index.`);
    } else {
      console.error(`Error at`, err.message);
    }
    continue
  }
    
  }
}


