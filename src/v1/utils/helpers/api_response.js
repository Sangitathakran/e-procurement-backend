function serviceResponse({ res,status, data, message, errors, errorCode, event }) {
    this.status = status || 200;
    this.data = data ? data : {};
    this.message = message || "";
    this.event = event || {}
    this.errorCode = errorCode || "";
    this.errors = errors ? errors : [];
    this.version = '1.0';
    res.status(status).json(this)
};

module.exports = { serviceResponse };
