const { _handleCatchErrors } = require(".")
/**
* 
* @param {any} error 
* @param {any} res 
* @param {import("express").NextFunction} next 
*/

module.exports.asyncErrorHandler = (func) => {
    return (req, res, next) => { func(req, res, next).catch((error) => { _handleCatchErrors(error, res, next) }) }
}