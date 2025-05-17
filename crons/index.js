const cron = require("node-cron");
const { sendLog } = require("./sendLogs");
const { default: axios } = require("axios");
const fs = require("fs");
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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

const hashedAadhars = require('@src/v1/modules/agristack/files/aadhaar_hashes.json');
const { agristackLogger } = require("@config/logger");

const URL = 'https://ufsi.agristack.gov.in/agristack/seek';
const SENDER_ID = 'edcb446e-3f86-419d-a07d-026554592a97';
const AUTH_TOKEN = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJvX19yR0o3dHZLYjNGeUQzVmJYR1NJaTgwYUFUOFA2eDNlVm51YUJobllzIn0.eyJleHAiOjE3NDc1MjIyMDcsImlhdCI6MTc0NzQ3OTAwNywianRpIjoiYWZiYzgxYmYtZjQ1OC00NjJjLWI0NTgtOWUzNTYxZTU3MzNlIiwiaXNzIjoiaHR0cDovLzEwLjEuMC4xMTo3MDgxL2F1dGgvcmVhbG1zL3N1bmJpcmQtcmMiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiZGNhYzUzZjgtMDFiYi00OGQyLTgzODgtNzk4ODc0N2U4N2U4IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoicmVnaXN0cnktZnJvbnRlbmQiLCJzZXNzaW9uX3N0YXRlIjoiZmZiMmE3NDAtZjNmYS00M2JlLWI3MWItNzE0N2E0NTYyNWIwIiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwczovL2RldmVsb3Blci5hZ3Jpc3RhY2suZ292LmluIiwiaHR0cDovL2xvY2FsaG9zdDozMDAwIl0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJvZmZsaW5lX2FjY2VzcyIsImRlZmF1bHQtcm9sZXMtc3VuYmlyZC1yYyIsIlBhcnRpY2lwYW50cyIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJlbWFpbCBwcm9maWxlIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJuY2NmX3JhZGlhbnQiLCJlbWFpbCI6Im1hbmFzLmdob3NoQG5jY2YtaW5kaWEuY29tIn0.GMN26J3hvHCyU-TuTnibMMySuA8RIb1ZWgkI_UVkAFA-sneyYmwP6Kk_DnLcxx5AlStcQs9vXjYsHlH1H6x6x3KVivEmc3Wj_7KSsmt-Tg2XTsmyDoRnjo3GSCzyLVwl2rn1YyHD7RE25JVlnTy2LJxd2sTaOwqC4iPkgrcsBzsGjBZHYXwe4Max4ffqlgtYJiPnVtIkQnWcWOYlPWav9A4E_WU-DRHcnZnEeLmlvuZgOcW4g6jsl_mf82tWimSMSqqp6dRhXmt4EJ18HR_cKVyvgqfyocIbAqq_afOE3km4NDdQlX9sI3-S9JeiKYEBSXM_p9dATYaEXRDdagWhUA'; 
const STATE_LGD_CODE = '9';

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

  cron.schedule("0 51 17 * * * *", async () => {
  let total = 0;
  for (const hash of hashedAadhars) {
    await callAgriStackAPI(hash.aadhaar_hash);
    total++;
  }
  console.log({ total });
});


  //await downloadFarmerFile();

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

async function callAgriStackAPI(hash) {
  const messageId = uuidv4();
  const timestamp = new Date().toISOString();

  const requestPayload = {
    header: {
      message_id: messageId,
      message_ts: timestamp,
      sender_id: SENDER_ID,
      sender_uri: 'https://api.testing.admin.khetisauda.com/farmer-registry-api-up-qa/agristack/v1/api/central/seekerOnSeek',
      total_count: 1
    },
    message: {
      transaction_id: messageId,
      search_request: [
        {
          reference_id: messageId,
          timestamp,
          search_criteria: {
            query_type: 'predicateQuery',
            reg_type: 'agristack_farmer',
            query: {
              mapper_id: 'i1002:o1001',
              query_params: [
                {
                  aadhaar_hash: hash,
                  aadhaar_type: 'E',
                  state_lgd_code: STATE_LGD_CODE
                }
              ]
            },
            pagination: {
              page_size: 200,
              page_number: 1
            },
            consent: {
              consent_required: true
            }
          },
          locale: 'en'
        }
      ]
    }
  };

  try {
    const response = await axios.post(URL, requestPayload, {
      headers: {
        'Content-Type': 'application/json',
        'sender_id': SENDER_ID,
        'Authorization': AUTH_TOKEN
      }
    });

    agristackLogger.info({
      aadhaar_hash: hash,
      request: requestPayload,
      response: response.data
    });

    console.log(`✅ Success: ${hash}`);
  } catch (error) {
    agristackLogger.error({
      aadhaar_hash: hash,
      request: requestPayload,
      error: {
        message: error.message,
        response: error.response?.data || null
      }
    });

    console.error(`❌ Error: ${hash}`);
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