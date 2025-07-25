
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { body } = require("express-validator");

/**
 * @param {'upload' | 'delete'} type
 */
exports.s3ValSchema = (type) => {
    console.log("sdfg")
    switch (type) {
        case "upload":
            return [
                body('folder_name', 'folder_name should not be null').notEmpty(),
                validateErrors
            ]
        case "delete":
            return [
                body('keys').isArray().not().withMessage('keys should be in array'),
                validateErrors
            ]
        default:
            break;
    }
}