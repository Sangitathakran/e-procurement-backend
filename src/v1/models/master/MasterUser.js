const { _collectionName, _userType, _statusType, _userAction } = require("@src/v1/utils/constants")
const mongoose = require("mongoose")

const { TypesModel } = require("@src/v1/models/master/Types")

const getType = async () => { 
    const type = await TypesModel.find()
    return type
}

const userSchema = new mongoose.Schema({

    firstName : { 
        type: String, 
    },
    lastName : { 
        type: String, 
    },
    isSuperAdmin: { 
        type: Boolean,
        default: false
    },
    isAdmin: { 
        type: Boolean,
        default: false
    },
    mobile: { 
        type: String
    },
    email : { 
        type: String, 
        required: true
    },
    userId : { 
        type: String,
    },
    isProfilePicUploaded : { 
        type: Boolean,
        default: false
    },
    ProfileKey : { 
        type: String,
        default: null
    },
    status: { 
        type: String,
        enum: Object.values(_statusType),
        default: _statusType.inactive
    },
    isPasswordChangeEmailSend: { 
        type: Boolean,
        default: false
    },
    isInitialPasswordChanged: { 
        type: Boolean, 
        default: false
    },
    password: { 
        type: String,
    },
    userType: { 
        type:String,
        enum: Object.values(_userType)
    },
    portalId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'portalRef' 
    },
    portalRef: {
        type: String 
    },
    userRole : [ { type: mongoose.Schema.Types.ObjectId , ref: _collectionName.UserRole } ],

    createdBy: {type: mongoose.Schema.Types.ObjectId , ref: _collectionName.MasterUser },

    history: {
        type: [mongoose.Schema.Types.Mixed], 
        default: [] 
    }
},

{ timestamps : true }


)

userSchema.pre('save', async function (next) {
     const typeData = await getType()
     console.log("typeData-->", typeData)
     typeData.forEach(item=> {
        
        if(this.userType === item.userType){
            this.portalRef = item.collectionName;
        }
        
    })

    next();
});
  

const MasterUser = mongoose.model(_collectionName.MasterUser, userSchema) // need to change the collection name

module.exports = {MasterUser}