const { _collectionName } = require('@src/v1/utils/constants')
const mongoose = require('mongoose')

const typeSchema = new mongoose.Schema({

    featureType: { 
        type: String, 
    },
    userType: { 
        type: String,
    },
    collectionName: { 
        type: String
    },
    adminUserRoleId : { 
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'collectionName',
    },
    
},
    { timestamps : true}
)

const TypesModel = mongoose.model(_collectionName.Types, typeSchema)
module.exports = {TypesModel}