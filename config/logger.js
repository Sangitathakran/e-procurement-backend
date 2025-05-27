const winston = require('winston');
const path = require('path');

// Define log file paths
const accessLogPath = path.join(__dirname, 'logs/access.log');
const errorLogPath = path.join(__dirname, 'logs/error.log');
const combinedLogPath = path.join(__dirname, 'logs/combined.log');


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

module.exports = { accessLogger, errorLogger, combinedLogger, combinedLogStream };
