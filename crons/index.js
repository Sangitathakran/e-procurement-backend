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
const importAssociates = require("./associateImportJob");
const { _paymentstatus } = require("@src/v1/utils/constants");
const { saveExternalFarmerData } = require("@src/v1/modules/localFarmers/controller");
const { getState, getDistrict, generateFarmerId } = require("@src/v1/utils/helpers");
const { generateFarmersIdLogger } = require("@config/logger");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
main().catch((err) => console.log(err));
//update
async function main() {
  // cron.schedule("0 9-17/2 * * 1-5", () => {
  //   sendLog();
  // });
  //0 */3 * * *
  //*/30 * * * * *

  // cron.schedule("0 */3 * * *", async () => {
  //   await downloadAgentFile();
  // });
  // cron.schedule("0 */3 * * *", async () => {
  //   await downloadFarmerFile();
  // });

  // cron.schedule("*/30 * * * * *", async () => {
  //   await downloadAgentFile();
  // });
  // cron.schedule("*/30 * * * * *", async () => {
  //   await downloadFarmerFile();
  // });

  //await downloadFarmerFile();

   // Schedule the API call at 11 PM daily
  //  cron.schedule("0 23 * * *", async () => {
  //   await callExternalFarmerAPI(); //saveExternalFarmerData();
  // });


  // cron.schedule("0 3 * * *", async () => {
  //   console.log("Running scheduled task to genearte farmer id at 3 AM...");
  //   await updateFarmersWithFarmerId(); 
  // });

  // cron.schedule("* 13 * * *", async () => {
  //   console.log("Running scheduled task to remove duplicate haryana farmers entries at 6 AM...");
  //   await removeDuplicateFarmers(); 
  // });

}

async function downloadAgentFile() {

  try {

    console.log("Agent file download running");

    let fileDetails = await AgentPaymentFile.find({ file_status: "upload" });

    for (let item of fileDetails) {
      try {

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

          let rowsDetails = [];


          for (let item2 of sheetData) {
            rowsDetails.push({ ...item2 });
          }

          item["received_file_details"] = rowsDetails[0];
          item.file_status = "download";
          await item.save();
        });
      } catch (err) {
        if (err.response && err.response.status === 400) {
          console.error(`Error Skipping to next index.`);
        } else {
          console.error(`Error at index `, err.message);
        }
        continue
      }
    }

  } catch (err) {
    console.log('error', err)
  }
}


async function downloadFarmerFile() {

  console.log("farmer file download running");

  let fileDetails = await FarmerPaymentFile.find({ file_status: "upload" });

  for (let item of fileDetails) {

    try {

      const url = `https://testbank.navbazar.com/v1/download-file?fileName=R_${item.fileName}`;

      const response = await axios.get(url, {
        responseType: "stream",
        headers: {
          "x-api-key": process.env.API_KEY,
        },
      });

      const filePath = `./src/v1/download/R_${item.fileName}`;

      if (!fs.existsSync(filePath)) {
        console.error('File does not exist:', filePath);
      }

      // Check if the directory exists, and create it if not
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];

          const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
          // this sheetData will contain json of all the payment status of each farmer
          // this file have real time payment status from bank [Reverse File]
          let rowsDetails = []

      await Promise.all(
        sheetData.map(async (item2) => {

          let paymentDetails = await Payment.findById(item2.SENDER_TO_RECEIVER_INFO1).populate("farmer_id");

          rowsDetails.push({ ...item2 });

          if (
            item2.ADDR_5 === "Paid" || item2.LIQ_STATUS === "Paid" &&
            paymentDetails?.farmer_id?.bank_details?.account_no.toString() === item2.BENEF_ACCOUNT_NMBR.toString()
          ) {
            console.log('item2.SENDER_TO_RECEIVER_INFO1 Paid-->', item2.SENDER_TO_RECEIVER_INFO1)
            paymentDetails.payment_status = _paymentstatus.completed;
            paymentDetails.transaction_id = item2.SENDER_TO_RECEIVER_INFO1
          }

          // open status case handling 
          else if (
            item2.ADDR_5 === "Open" || item2.LIQ_STATUS === "Open" &&
            paymentDetails?.farmer_id?.bank_details?.account_no.toString() === item2.BENEF_ACCOUNT_NMBR.toString()
          ) {


            paymentDetails.transaction_id = item2.SENDER_TO_RECEIVER_INFO1
          }

          else {

            paymentDetails.payment_status = _paymentstatus.rejected;
            paymentDetails.transaction_id = item2.SENDER_TO_RECEIVER_INFO1
          }
          await paymentDetails.save();

          const farmerOrder = await FarmerOrders.findById(paymentDetails.farmer_order_id);
          if (farmerOrder) {
            farmerOrder.payment_status = paymentDetails.payment_status;
            farmerOrder.payment_date = item2.INST_DATE
            await farmerOrder.save();
          }
        })
      );

      item.file_status = "download"
      item.received_file_details = rowsDetails;
      await item.save();

    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.error(`Error Skipping to next index.`);
      } else {
        console.error(`Error at`, err.message);
      }
      continue
    }

  }
}

async function callExternalFarmerAPI() {
  console.log('local farmer api is called ..');
  try {
    //const date = new Date().toISOString().split("T")[0]; // Get current date (YYYY-MM-DD);

    const previousDate = new Date();
    previousDate.setDate(previousDate.getDate() - 1); // Subtract 1 day
    const formattedDate = previousDate.toISOString().split("T")[0];

    const baseUrl = process.env.NODE_ENV === 'local' ? process.env.LOCAL_URL : process.env.LOCAL_FARMER_PROD_URL;
    const apiUrl = `${baseUrl}/v1/localFarmers/save_external_farmer_data`;

    console.log(`Sending POST request to API at 11 PM: ${apiUrl}`);

    const response = await axios.post(apiUrl, {
      dates: [formattedDate],
      isExport: 0,
    }); 

    console.log("✅ API Response:", response.data);
  } catch (error) {
    console.error("❌ Error calling API:", error.message);
  }
}

// Function to update farmers with missing farmer_id
async function updateFarmersWithFarmerId() {
  try {
    // Step 1: Find farmers with external_farmer_id but missing farmer_id
    const farmers = await farmer.find({
      external_farmer_id: { $exists: true },
      $or: [{ farmer_id: null }, { farmer_id: '' }],
    }, { address: 1, farmer_id: 1} );

    generateFarmersIdLogger.info(`Found ${farmers.length} farmers to update.`);

    // Step 2: Iterate over each farmer and generate farmer_id
    for (const farmer of farmers) {
      const state = await getState(farmer.address.state_id);
      const district = await getDistrict(farmer.address.district_id);

      let obj = {
        _id: farmer._id,
        address: {
          state: state.state_title,
          district: district.district_title,
        },
      };

      // Step 3: Generate and update farmer_id
      farmer.farmer_id = await generateFarmerId(obj);
      await farmer.save();
      generateFarmersIdLogger.info(
        `Updated farmer ${farmer._id} with farmer_id: ${farmer.farmer_id}`
      );
    }

    generateFarmersIdLogger.info('✅ All farmers updated successfully!');
  } catch (error) {
    generateFarmersIdLogger.error('❌ Error updating farmers:', error);
  }
}

// remove duplicate haryana farmers
async function removeDuplicateFarmers() {
  try {
    console.log("Fetching duplicate farmers...");
    let duplicates = await farmer.aggregate([
      {
        $match: {
          external_farmer_id: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$external_farmer_id",
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);
    let duplicateFarmersCount = 0;
    duplicates = duplicates.slice(0, 20000);
    for (const dup of duplicates) {
      const [keep, ...remove] = dup.ids; // Keep one, delete the rest
      console.log(
        `Keeping farmer ${keep}, removing ${remove.length} duplicates...`
      );

      duplicateFarmersCount = duplicateFarmersCount + remove.length;

      // Delete associated lands and crops
      await Land.deleteMany({ farmer_id: { $in: remove } });
      await Crop.deleteMany({ farmer_id: { $in: remove } });

      // Delete duplicate farmers
      await farmer.deleteMany({ _id: { $in: remove } });
    }

    console.log(
      "Duplicate farmers and associated records deleted successfully."
    );
    
  } catch (error) {
    console.error("Error cleaning up duplicates:", error);
  }
}





// In farmerpaymentfiles collection, "fileName" consists of following pattern-
// ex:  AIZER181124006.csv
// here, starting 5 letters are client code - `AIZER`
// and then next 6 digits are the date of file upload in DDMMYY format - `181124`
// and rest 3 digits are the random values defining no of attempts made to finish the process* - `006`

// *:this process includes generating the name of the file, uploading it etc. 


//sample reverse file data

  // CORPORATION_CODE: '101923545',
  // CLIENT_CODE: 'NCCFMAIZER',
  // ACCOUNT_NMBR: '2244102000000055',
  // BENEF_ACCOUNT_NMBR: '034301539698',
  // BENEF_DESCRIPTION: 'MANNAVA SRIKANTH',
  // INSTRUMENT_AMNT: 1,
  // PIR_DATE: '29-10-24',
  // BENE_IFSC_CODE: 'HDFC0000982',
  // PIR_REFERENCE_NMBR: 'rakhi123',
  // LIQ_STATUS || ADDR_5: 'Paid',
  // UTR_SR_NO: 'ICMS2410300BZA7T',
  // INST_DATE: '29-10-24',
  // PRODUCT_CODE: 'NEFT'
 cron.schedule("0 11,16,2 * * *", () => {
  console.log("🕒 Running scheduled import job at", new Date().toLocaleString());
  importAssociates();
});