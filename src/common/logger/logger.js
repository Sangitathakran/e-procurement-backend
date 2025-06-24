class Logger {
  constructor() {
    this.colors = {
      info: '\x1b[32m',   // Green
      warn: '\x1b[33m',   // Yellow
      error: '\x1b[31m',  // Red
    };
    this.resetColor = '\x1b[0m';
  }

  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  }

  info(message) {
    const formatted = this.formatMessage('info', message);
    console.log(this.colors.info + formatted + this.resetColor);
  }

  warn(message) {
    const formatted = this.formatMessage('warn', message);
    console.warn(this.colors.warn + formatted + this.resetColor);
  }

  error(message) {
    const formatted = this.formatMessage('error', message);
    console.error(this.colors.error + formatted + this.resetColor);
  }
}

module.exports = new Logger();

//========== For example we can Implement like this  ============= //

// const logger = require('./logger');

// logger.info('Server started');
// logger.warn('Disk space running low');
// logger.error('Unable to connect to database');