const logger = require('@common/logger/logger'); // use your existing logger class

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress || "";
  logger.info(`[REQUEST] ${req.method} ${req.url} - IP: ${ip}`);

  const originalSend = res.send;
  let responseBody;

  res.send = function (body) {
    responseBody = body; // capture response body
    return originalSend.call(this, body);
  };

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logMsg = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;

    const resSummary =
      typeof responseBody === 'object'
        ? JSON.stringify(responseBody)
        : String(responseBody).substring(0, 200); 

    const fullLog = `${logMsg}\nResponse: ${resSummary}`;

    if (res.statusCode >= 500) {
      logger.error(fullLog);
    } else if (res.statusCode >= 400) {
      logger.warn(fullLog);
    } else {
      logger.info(`[RESPONSE] ${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`);
    }
  });

  next();
};

module.exports = requestLogger;

