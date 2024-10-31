const cron = require('node-cron');
const { sendLog } = require('./sendLogs');
const { default: axios } = require("axios");
const fs = require('fs');
const { AgentInvoice } = require("@src/v1/models/app/payment/agentInvoice");
const xlsx = require("xlsx");
main().catch(err => console.log(err));

async function main() {

    cron.schedule('0 9-17/2 * * 1-5', () => {
        sendLog()
    });

    cron.schedule('0 */3 * * *', async() => {
        await downloadFile();
        
    });

}
async function downloadFile(){
    console.log('file download running')
    let fileDetails=[{fileName:"R_AIZER29102024002.xlsx"}]
    for(let item of fileDetails){
        const url = `https://testbank.navbazar.com/v1/download-file?fileName=${item.fileName}`; // Replace with your URL

   axios.get(url, { responseType: 'stream' ,headers: {
    "x-api-key": "6719ec42cddd1222948d48f3"
  }
})
  .then((response) => {
    const filePath = `./src/v1/download/${item.fileName}`;
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);


    writer.on('finish', () => {
      console.log('File downloaded.');
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      console.log(sheetData);
      for(let item of sheetData){
          console.log(item)
      }
    });
  })
  .catch((error) => {
    console.error('Error downloading the file:', error);
  });

          
    }
}