const { _collectionName, _userType } = require('@src/v1/utils/constants')
const mongoose = require('mongoose')

const userRoleSchema = new mongoose.Schema({

    userRoleName: { 
        type: String, 
        required: true
    },
    userAssigned: { 
        type: Number, 
        default: 0
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: _collectionName.MasterUser,
        default: null
    },
    updatedBy : { 
        type: mongoose.Schema.Types.ObjectId,
        ref: _collectionName.MasterUser,
        default: null
    },
    userRoleType: { 
        type:String,
    },
    isAdminUserRole: { 
        type: Boolean, 
        default:false
    },
    features: [
        {
            featureName: { 
                type: String
            },
            enabled : { 
                type: Boolean
            },
            subFeatures: [
                { 
                    subFeatureName: { 
                        type: String
                    },
                    enabled : { 
                        type: Boolean
                    },
                    permissions: {
                        
                        view : {
                            type: Boolean,
                            default: false
                        },
                        add : {
                            type: Boolean,
                            default: false
                        },
                        edit : {
                            type: Boolean,
                            default: false
                        },
                        delete : {
                            type: Boolean,
                            default: false
                        },
                        export : {
                            type: Boolean,
                            default: false
                        },
                        status : {
                            type: Boolean,
                            default: false
                        },
                        takeAction: {
                            type: Boolean,
                            default: false
                        }
                    },
                    components: [{
                        componentName: {type: String},
                        enabled: {type: Boolean}
                    }]
                }    
            ],
        }
    ],
    ipAddress: {type: String, default: null},
    history: {
        type: [mongoose.Schema.Types.Mixed], 
        default: [] 
    }
},
    { timestamps : true}
)

userRoleSchema.pre('save', async function (next) {
  
   const historyEntry = { ...this.toObject() };
   delete historyEntry.history
   delete historyEntry._id
   this.history.push(historyEntry);
   

   next();
});
 

const UserRole = mongoose.model(_collectionName.UserRole, userRoleSchema)
module.exports = UserRole