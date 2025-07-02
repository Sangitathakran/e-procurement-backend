const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');


// Define log file paths
const accessLogPath = path.join(__dirname, 'logs/access.log');
const errorLogPath = path.join(__dirname, 'logs/error.log');
const combinedLogPath = path.join(__dirname, 'logs/combined.log');
const logDirectory = path.join(__dirname, 'logs');



// Create writable stream for combined logging
const combinedLogStream = {
    write: (message) => {
        combinedLogger.info(`/n ${message.trim()}`);
    },
};

// Configure Winston for access logging
const accessLogger = winston.createLogger({
    transports: [
        new winston.transports.File({ filename: accessLogPath })
    ]
});

// Configure Winston for error logging
const errorLogger = winston.createLogger({
    transports: [
        new winston.transports.File({ filename: errorLogPath, level: 'error' })
    ]
});

// Configure Winston for combined logging
const combinedLogger = winston.createLogger({
    transports: [
        new winston.transports.File({ filename: combinedLogPath })
    ]
});



// Create a rotating log file transport
const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
  filename: `${logDirectory}/app-%DATE%.log`,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
});

const agristackLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    dailyRotateFileTransport,
    new winston.transports.Console()
  ],
});

// Optional: HTTP transport (e.g., to a log collector)
// if (process.env.LOG_SERVER_URL) {
//   logger.add(new winston.transports.Http({
//     host: process.env.LOG_SERVER_URL,
//     port: 80,
//     path: '/log-endpoint',
//     ssl: false
//   }));
// }


module.exports = { accessLogger, errorLogger, combinedLogger, combinedLogStream, agristackLogger };
