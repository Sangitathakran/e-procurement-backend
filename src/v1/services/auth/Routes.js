const express = require('express');
const { register, login, resetPassword, sendResetPage, forgot_password, logout, createAccount, loginAccount } = require('./Controller');
const { body } = require('express-validator');
const { validateErrors } = require('@src/v1/utils/helpers/express_validator');
const { verifyJwtToken } = require('@src/v1/middlewares/jwt');
const { handleRateLimit } = require('@src/v1/middlewares/express_app');
const userRouter = express.Router();

userRouter.use(handleRateLimit)
userRouter.post("/create", [
    body("user_name", "Please enter user name.").not().isEmpty().trim(),
    body("company_name", "Please enter company name.").not().isEmpty().trim(),
    body("email", "Please enter company email.").not().isEmpty().trim(),
    body("password", "Please enter password of atleast 8 length.").not().isEmpty().trim().isLength({ min: 8, max: 40 }),
], validateErrors, createAccount)

userRouter.post("/login", [
    body("user_name", "Please enter company name.").not().isEmpty().trim(),
    body("password", "Please enter password of atleast 8 length.").not().isEmpty().trim().isLength({ min: 8, max: 40 }),
], validateErrors, loginAccount)
userRouter.post('/register', [
    body('name', "name can't be null").notEmpty().isString().not().trim(),
    body('username', "username can't be null").notEmpty().isString().not().trim(),
    body('email', "email can't be null").notEmpty().isEmail().not().withMessage("email is not in valid format").trim(),
    body('mobile_number', "mobile_number can't be null").notEmpty().isMobilePhone().not().withMessage("mobile_numberF is not in valid format").trim(),
    body('password', "password can't be null").notEmpty().trim()
], validateErrors, register)

userRouter.post('/login', [
    body('username', "username can't be null").notEmpty().isString().not().trim(),
    body('password', "password can't be null").notEmpty().trim()
], validateErrors, login)

userRouter.post('/logout', logout)

userRouter.post('/forgot-password', [
    body('email', "email can't be null").notEmpty().isEmail().not().withMessage("email is not in valid format").trim(),
], validateErrors, forgot_password)
userRouter.get('/reset/:token', sendResetPage);
userRouter.post('/reset/:token', resetPassword);

module.exports = { userRouter }