const express = require("express")
const userManagementRoutes = express.Router()
const { auth } = require("@src/v1/middlewares/jwt")

//userRole routes
const { createUserRole, getFeatures , editUserRolePage, editUserRole, getUserRoles , getUsersByUser } = require("./Controller")

userManagementRoutes.get('/getFeatures/:type', auth , getFeatures )
userManagementRoutes.post('/createUserRole', auth , createUserRole )
userManagementRoutes.get('/editUserRolePage/:id',auth ,  editUserRolePage )
userManagementRoutes.put('/editUserRole', auth , editUserRole )
userManagementRoutes.get('/getUserRoles', auth , getUserRoles )


//user routes 
const { createUser, getUserPermission, editUser, toggleStatus } = require("./Controller")

userManagementRoutes.post('/createUser', auth , createUser )
userManagementRoutes.get('/getUserPermission/:id',auth ,  getUserPermission )
userManagementRoutes.put('/editUser', auth , editUser )
userManagementRoutes.put('/toggleStatus/:id', auth , toggleStatus )
userManagementRoutes.get('/getUsersByUser', auth , getUsersByUser)



module.exports = { userManagementRoutes }
