const { logEmails } = require('@config/index');
const { sendMail } = require('@src/v1/utils/helpers/node_mailer');
const fs = require('fs');
const path = require('path');

module.exports.sendLog = () => {
    const filePath = path.join(__dirname, '../config/logs', 'error.log'); // Path to your file
    const backupDir = path.join(__dirname, '../config/logs/backup'); // Directory for backups

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    // Check if the error.log file has some content
    fs.stat(filePath, (err, stats) => {
        if (err) {
            console.error('Error checking file stats:', err);
            return;
        }

        if (stats.size === 0) {
            console.log('error.log is empty, no need to backup or send email.');
            return;
        }

        // Generate timestamp and backup file name
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Example: 2024-09-30T12-00-00
        const backupFilePath = path.join(backupDir, `error_${timestamp}.log`);

        // Read the error log file
        fs.readFile(filePath, 'utf-8', async (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                return;
            }

            // Create a backup file with the current timestamp
            fs.writeFile(backupFilePath, data, async (err) => {
                if (err) {
                    console.error('Error creating backup file:', err);
                    return;
                }
                console.log('Backup created at:', backupFilePath);
                // Send the email with the log file as an attachment
                await sendMail(logEmails, '', "Procurement_apis Server logs", '', [
                    {
                        filename: 'error.txt', // Name of the attachment
                        path: filePath, // Path of the file to be attached
                    }
                ]);

                console.log('Email sent with logs as an attachment');

                // Clear the original error log file
                fs.writeFile(filePath, '', (err) => {
                    if (err) {
                        console.error('Error clearing error log file:', err);
                        return;
                    }
                });
            });
        });
    });
};
