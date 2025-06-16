const winston = require('winston');
const path = require('path');

// Define log file paths
const accessLogPath = path.join(__dirname, 'logs/access.log');
const errorLogPath = path.join(__dirname, 'logs/error.log');
const combinedLogPath = path.join(__dirname, 'logs/combined.log');
const localFarmersLogPath = path.join(__dirname, 'logs/localFarmers.log');
const generateFIdsLogPath = path.join(__dirname, 'logs/updateFarmersWithFarmerId.log');
const adharLoggerPath = path.join(__dirname, 'logs/adharAPILog.log')




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

// Configure Winston logger for local farmers 
const localFarmersLogger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.colorize(), // Enable colorized logs
        winston.format.timestamp({
          format: () =>
            new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), // Set IST timezone
        }),
      winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
      })
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: localFarmersLogPath })
    ],
  });

// Configure Winston logger for local farmers 
const generateFarmersIdLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
      winston.format.colorize(), // Enable colorized logs
      winston.format.timestamp({
        format: () =>
          new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), // Set IST timezone
      }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: generateFIdsLogPath })
  ],
});

// Configure Winston for combined logging for aadhar apis
const adharLogger = winston.createLogger({
    transports: [
        new winston.transports.File({ filename: adharLoggerPath })
    ]
});

  

module.exports = { accessLogger, errorLogger, combinedLogger, combinedLogStream, localFarmersLogger, generateFarmersIdLogger, adharLogger };
