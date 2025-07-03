const cron = require("node-cron");
const { sendLog } = require("./sendLogs");
const { default: axios } = require("axios");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { VERFICATION } = require("@config/index");
const { AgentPaymentFile,} = require("@src/v1/models/app/payment/agentPaymentFile");
const { FarmerPaymentFile} = require("@src/v1/models/app/payment/farmerPaymentFile");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const xlsx = require("xlsx");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { _paymentstatus } = require("@src/v1/utils/constants");
const logger = require('@src/common/logger/logger');
// variables for e-kharid
const mongoose = require("mongoose");
const BASE_URL = "http://localhost:4001/v1/ekhrid/batch";
const req_id = new mongoose.Types.ObjectId("67e1524fad7ee1581f97ac64");
const seller_ids = [
  "67e3dcfc16a8db907254eaec",
  "67e38f0516a8db907254c63a",
  "67ee2a3e07654b69eabda370",
];
main().catch((err) => console.log(err));
const { runBankVerificationJob } = require('./verifyDraftJob');



//update
async function main() {
  const VERFICATIONS = VERFICATION || "OFF";

  if (VERFICATIONS === "ON") {
    logger.info("[Cron Init] Bank verification scheduler initialized...");

    cron.schedule("*/5 * * * *", async () => {
      logger.info("[Cron Start] Running bank verification cron...");
      try {
        await runBankVerificationJob();
        logger.info("[Cron Success] Bank verification cron finished.");
      } catch (err) {
        logger.error("[Cron Error] Error running bank verification cron:", {
          message: err.message,
          stack: err.stack,
        });
      }
    });
  } else {
    logger.warn("[Cron Skipped] VERFICATION flag is OFF. Cron not started.");
  }
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

  // cron.schedule("* * * * *", async () => {
  //   for (const seller_id of seller_ids) {
  //     // await fetchAndProcessBatches(
  //     //   req_id,
  //     //   new mongoose.Types.ObjectId(seller_id)
  //     // );
  //   }
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
          const sheetData = xlsx.utils.sheet_to_json(
            workbook.Sheets[sheetName]
          );

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
        continue;
      }
    }
  } catch (err) {
    console.log("error", err);
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
        console.error("File does not exist:", filePath);
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
      let rowsDetails = [];

      await Promise.all(
        sheetData.map(async (item2) => {
          let paymentDetails = await Payment.findById(
            item2.SENDER_TO_RECEIVER_INFO1
          ).populate("farmer_id");

          rowsDetails.push({ ...item2 });

          if (
            item2.ADDR_5 === "Paid" ||
            (item2.LIQ_STATUS === "Paid" &&
              paymentDetails?.farmer_id?.bank_details?.account_no.toString() ===
              item2.BENEF_ACCOUNT_NMBR.toString())
          ) {
            console.log(
              "item2.SENDER_TO_RECEIVER_INFO1 Paid-->",
              item2.SENDER_TO_RECEIVER_INFO1
            );
            paymentDetails.payment_status = _paymentstatus.completed;
            paymentDetails.transaction_id = item2.SENDER_TO_RECEIVER_INFO1;
          }

          // open status case handling
          else if (
            item2.ADDR_5 === "Open" ||
            (item2.LIQ_STATUS === "Open" &&
              paymentDetails?.farmer_id?.bank_details?.account_no.toString() ===
              item2.BENEF_ACCOUNT_NMBR.toString())
          ) {
            paymentDetails.transaction_id = item2.SENDER_TO_RECEIVER_INFO1;
          } else {
            paymentDetails.payment_status = _paymentstatus.rejected;
            paymentDetails.transaction_id = item2.SENDER_TO_RECEIVER_INFO1;
          }
          await paymentDetails.save();

          const farmerOrder = await FarmerOrders.findById(
            paymentDetails.farmer_order_id
          );
          if (farmerOrder) {
            farmerOrder.payment_status = paymentDetails.payment_status;
            farmerOrder.payment_date = item2.INST_DATE;
            await farmerOrder.save();
          }
        })
      );

      item.file_status = "download";
      item.received_file_details = rowsDetails;
      await item.save();
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.error(`Error Skipping to next index.`);
      } else {
        console.error(`Error at`, err.message);
      }
      continue;
    }
  }
}

async function fetchAndProcessBatches(req_id, seller_id) {
  let loop = true;
  let totalOrders = 0;

  while (loop) {
    try {
      // Call GET API with query parameters
      const getResponse = await axios.get(`${BASE_URL}/getFarmerOrders`, {
        params: { req_id: req_id.toString(), seller_id: seller_id.toString() },
        headers: { "Content-Type": "application/json" },
      });

      const batch = getResponse.data?.data?.[0];
      if (batch && batch.farmerData && batch.farmerData.length > 0) {
        console.log(
          `Found ${batch.farmerData.length} farmer orders for seller ${seller_id}. Creating batch...`
        );
        totalOrders += batch.farmerData.length;

        // Call POST API
        const postResponse = await axios.post(
          `${BASE_URL}/create-batch`,
          {
            req_id: batch.req_id,
            seller_id: batch.seller_id,
            truck_capacity: 666,
            farmerData: batch.farmerData,
          },
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        console.log(
          `Batch created for seller ${seller_id}:`,
          postResponse.data.message,
          { totalOrders }
        );
      } else {
        console.log(
          `No farmer data found for seller ${seller_id}. Exiting scheduler.`,
          { totalOrders }
        );
        loop = false;
      }
    } catch (error) {
      console.error(
        `Error in processing batch for seller ${seller_id}:`,
        error
      );
      loop = false;
    }
  }
  console.log(
    `Signing off for seller ${seller_id}. Total orders processed: ${totalOrders}`
  );
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



