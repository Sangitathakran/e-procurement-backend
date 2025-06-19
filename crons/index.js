const cron = require("node-cron");
const { sendLog } = require("./sendLogs");
const { default: axios } = require("axios");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

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
const { _paymentstatus } = require("@src/v1/utils/constants");

// variables for e-kharid
const mongoose = require("mongoose");
const BASE_URL = "http://localhost:4001/v1/ekhrid/batch";
const req_id = new mongoose.Types.ObjectId("67e1524fad7ee1581f97ac64");
const seller_ids = [
  "67e3dcfc16a8db907254eaec",
  "67e38f0516a8db907254c63a",
  "67ee2a3e07654b69eabda370",
];

// UPAG schedular 

const GET_API_URL = "http://localhost:4001/v1/upag/procurment/get-procurement"; //process.env.GET_API_URL;
const POST_API_URL = "http://localhost:4001/v1/upag/procurment/submit-procurement";//process.env.POST_API_URL;
const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywidXNlcm5hbWUiOiJqb2huZG9lIiwiaWF0IjoxNzUwMzExMzI2LCJleHAiOjE3NTAzOTc3MjZ9.4FkHJc1QZlZEEo868ZEG_KJvJXpKM49lANGDdTv2SW8"; //process.env.AUTH_TOKEN;

// Convert Date -> 'YYYY-MM-DD'
const formatDate = (date) => date.toISOString().slice(0, 10);

// Split range into chunks of 7 days
const splitDateRangeIntoChunks = (start, end) => {
  const chunks = [];
  let currentStart = new Date(start);

  while (currentStart <= end) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 6); // 7-day chunk

    if (currentEnd > end) currentEnd.setTime(end.getTime());

    chunks.push({
      startDate: formatDate(currentStart),
      endDate: formatDate(currentEnd),
    });

    currentStart.setDate(currentStart.getDate() + 7);
  }

  return chunks;
};

// Main processing function
const fetchAndPushProcurement = async (startDate, endDate) => {
  const dateChunks = splitDateRangeIntoChunks(new Date(startDate), new Date(endDate));

  for (const { startDate, endDate } of dateChunks) {
    console.log(`🔍 Processing chunk: ${startDate} to ${endDate}`);

    try {
      const getResponse = await axios.get(GET_API_URL, {
        params: { startDate, endDate },
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          token: "", // if needed
        },
      });

      const allowedCommodityCodes = [
  "UW1GW6", "TU24AR", "MAIZ13", "LENMA25",
  "BNG28G", "BGUB25J", "GGWG25J", "PCJUL74",
  "WHJUL74", "GGM0910"
];

const allRecords = getResponse.data?.data || [];
console.log(" allRecords ", allRecords );

const records = allRecords.filter(record =>
  allowedCommodityCodes.includes(record.commoditycode?.toUpperCase())
);

      console.log('>>>>>>>>>>>>>>>>>>>>', records.length);
      if (records.length === 0) {
        console.log(`No data for ${startDate} to ${endDate}`);
        continue;
      }


      for (const record of records) {
        try {
          const postResponse = await axios.post(POST_API_URL, record, {
            headers: { "Content-Type": "application/json" },
          });
          console.log(`✅ Pushed ${record.statecode}-${record.commoditycode}:`, postResponse.data.message);
        } catch (err) {
          console.error(`❌ Failed to push record: ${record.statecode}-${record.commoditycode}`, err.response?.data || err.message);
        }
      }
    } catch (err) {
      console.error(`❌ Failed to fetch for ${startDate} to ${endDate}:`, err.response?.data || err.message);
    }
  }
};

// Example: run with specific start-end range
const runProcurementJob = () => {
  const startDate = '2025-06-01';
  const endDate = '2025-06-18';
  fetchAndPushProcurement(startDate, endDate);
};


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

  // cron.schedule("* * * * *", async () => {
  //   for (const seller_id of seller_ids) {
  //     // await fetchAndProcessBatches(
  //     //   req_id,
  //     //   new mongoose.Types.ObjectId(seller_id)
  //     // );
  //   }
  // });

  cron.schedule('00 12 * * *', runProcurementJob)
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



