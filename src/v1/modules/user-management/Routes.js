const express = require("express")
const userManagementRoutes = express.Router()
const { verifyJwtToken } = require("@src/v1/middlewares/jwt")

//userRole routes
const { createUserRole, getFeatures , editUserRolePage, editUserRole, getUserRoles, getUserRoleList } = require("./Controller")

userManagementRoutes.get('/getFeatures/:type', verifyJwtToken , getFeatures )
userManagementRoutes.post('/createUserRole' , verifyJwtToken, createUserRole )
userManagementRoutes.get('/editUserRolePage/:id',verifyJwtToken ,  editUserRolePage )
userManagementRoutes.put('/editUserRole', verifyJwtToken , editUserRole )
userManagementRoutes.get('/getUserRoles', verifyJwtToken , getUserRoles )
userManagementRoutes.get('/getUserRoleList', verifyJwtToken, getUserRoleList)


//user routes 
const { createUser, getUserPermission, editUser, toggleStatus, getUsersByUser, getSingleUser } = require("./Controller")

userManagementRoutes.post('/createUser', verifyJwtToken, createUser )
userManagementRoutes.get('/getUserPermission',verifyJwtToken ,  getUserPermission )
userManagementRoutes.put('/editUser', verifyJwtToken , editUser )
userManagementRoutes.put('/toggleStatus/:id', verifyJwtToken , toggleStatus )
userManagementRoutes.get('/getUsersByUser', verifyJwtToken , getUsersByUser)
userManagementRoutes.get('/getSingleUser/:id', verifyJwtToken , getSingleUser)



module.exports = { userManagementRoutes }
