const express = require("express")
const userManagementRoutes = express.Router()
const { Auth } = require("@src/v1/middlewares/jwt")

//userRole routes
const { createUserRole, getFeatures , editUserRolePage, editUserRole, getUserRoles, getUserRoleList } = require("./Controller")

userManagementRoutes.get('/getFeatures/:type', Auth , getFeatures )
userManagementRoutes.post('/createUserRole' , Auth, createUserRole )
userManagementRoutes.get('/editUserRolePage/:id' ,Auth, editUserRolePage )
userManagementRoutes.put('/editUserRole' , Auth, editUserRole )
userManagementRoutes.get('/getUserRoles', Auth , getUserRoles )
userManagementRoutes.get('/getUserRoleList', Auth, getUserRoleList)


//user routes 
const { createUser, getUserPermission, editUser, toggleStatus, getUsersByUser, getSingleUser } = require("./Controller")

userManagementRoutes.post('/createUser', Auth, createUser )
userManagementRoutes.get('/getUserPermission',  getUserPermission )
userManagementRoutes.put('/editUser', Auth , editUser )
userManagementRoutes.put('/toggleStatus/:id', Auth , toggleStatus )
userManagementRoutes.get('/getUsersByUser', Auth , getUsersByUser)
userManagementRoutes.get('/getSingleUser/:id', Auth , getSingleUser)


//portal routes 
const { getAgency, getHo, getBo } = require("./Controller")
userManagementRoutes.get('/getAgency', Auth, getAgency)
userManagementRoutes.get('/getHo', Auth, getHo)
userManagementRoutes.get('/getBo', Auth, getBo)



module.exports = { userManagementRoutes }
