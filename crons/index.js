const cron = require('node-cron');
const { sendLog } = require('./sendLogs');


main().catch(err => console.log(err));

async function main() {

    cron.schedule('0 9-17/2 * * 1-5', () => {
        sendLog()
    });
}