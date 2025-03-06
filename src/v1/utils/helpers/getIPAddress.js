const getIpAddress = (req) => { 

    // const ipAddress = req.headers['x-forwarded-for']
    //     ? req.headers['x-forwarded-for'].split(',')[0].trim()
    //     : req.connection.remoteAddress || req.socket.remoteAddress || req.ip;

    const ipAddress = req.body.ipAddress|| null

    return ipAddress;
};

module.exports = getIpAddress;
 