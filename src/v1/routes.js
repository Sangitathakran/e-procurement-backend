// Call Your Routes
const { S3Router } = require("./services/aws/routes");
const { templateRoutes } = require("./services/templete/Routes");
const { userRouter } = require("./services/auth/Routes");
const { eventEmitter } = require("./utils/websocket/server");
const { asyncErrorHandler } = require("./utils/helpers/asyncErrorHandler");
const { _webSocketEvents } = require("./utils/constants");
const { masterRoutes } = require("./services/master/Routes");
const { handlePagination } = require("./middlewares/express_app");
const ExpressApp = require("express")();
/**
 * 
 * @param {ExpressApp} app 
 */
module.exports = (app) => {
    /* Define Your Routes */

    app.use('/auth', userRouter)
    app.use('/aws', S3Router)

    app.use("/master", masterRoutes);
    app.use('/import-templete', templateRoutes)
    app.post('/event', asyncErrorHandler(async (req, res, next) => {
        const { message } = req.body;
        eventEmitter.emit(_webSocketEvents.product, message);
        return res.send('message product sent to all WebSocket clients');
    }));
}

