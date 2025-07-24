const express = require("express")
const userManagementRoutes = express.Router()
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")
//userRole routes
const { createUserRole, getFeatures , editUserRolePage, editUserRole, getUserRoles, getUserRoleList } = require("./Controller")

userManagementRoutes.get('/getFeatures/:type', Auth , getFeatures )
userManagementRoutes.post('/createUserRole' ,authenticateUser,authorizeRoles(_userType.ho ,_userType.warehouse ,_userType.admin ,_userType.bo,_userType.nccf,_userType.distiller), Auth, createUserRole )
userManagementRoutes.get('/editUserRolePage/:id',authenticateUser,authorizeRoles(_userType.ho ,_userType.warehouse ,_userType.admin ,_userType.bo,_userType.nccf,_userType.distiller) ,Auth, editUserRolePage )
userManagementRoutes.put('/editUserRole',authenticateUser,authorizeRoles(_userType.ho ,_userType.warehouse ,_userType.admin ,_userType.bo,_userType.nccf,_userType.distiller) , Auth, editUserRole )
userManagementRoutes.get('/getUserRoles', Auth , getUserRoles )
userManagementRoutes.get('/getUserRoleList', Auth, getUserRoleList)


//user routes 
const { createUser, getUserPermission, editUser, toggleStatus, getUsersByUser, getSingleUser } = require("./Controller")

userManagementRoutes.post('/createUser',authenticateUser,authorizeRoles(_userType.ho ,_userType.warehouse ,_userType.admin ,_userType.bo,_userType.nccf,_userType.distiller), Auth, createUser )
userManagementRoutes.get('/getUserPermission',Auth ,  getUserPermission )
userManagementRoutes.put('/editUser',authenticateUser,authorizeRoles(_userType.ho ,_userType.warehouse ,_userType.admin ,_userType.bo,_userType.nccf,_userType.distiller), Auth , editUser )
userManagementRoutes.put('/toggleStatus/:id',authenticateUser,authorizeRoles(_userType.ho ,_userType.warehouse ,_userType.admin ,_userType.bo,_userType.nccf,_userType.distiller), Auth , toggleStatus )
userManagementRoutes.get('/getUsersByUser', Auth , getUsersByUser)
userManagementRoutes.get('/getSingleUser/:id',authenticateUser,authorizeRoles(_userType.ho ,_userType.warehouse ,_userType.admin ,_userType.bo,_userType.nccf,_userType.distiller), Auth , getSingleUser)


//portal routes 
const { getAgency, getHo, getBo } = require("./Controller")
userManagementRoutes.get('/getAgency',authenticateUser,authorizeRoles(_userType.admin), Auth, getAgency)
userManagementRoutes.get('/getHo',authenticateUser,authorizeRoles(_userType.admin), Auth, getHo)
userManagementRoutes.get('/getBo',authenticateUser,authorizeRoles(_userType.admin), Auth, getBo)



module.exports = { userManagementRoutes }
