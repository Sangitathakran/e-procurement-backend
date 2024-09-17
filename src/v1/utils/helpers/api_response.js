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
function sendResponse({ res,status, data, message, errors, errorCode, event }) {
   
    return res.status(status).json({data, message, errors, errorCode, event})
    
};
module.exports = { serviceResponse,sendResponse };
