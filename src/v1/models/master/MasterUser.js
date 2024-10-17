const { _collectionName, _userType, _statusType, _userAction } = require("@src/v1/utils/constants")
const mongoose = require("mongoose")

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

    history: [{
        data: {
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
            // sourceId: { 
            //     type : mongoose.Schema.Types.ObjectId,
            //     ref:  null
            // },
            userRole : [ { type: mongoose.Schema.Types.ObjectId , ref: _collectionName.UserRole } ],
        
            createdBy: {type: mongoose.Schema.Types.ObjectId , ref: _collectionName.MasterUser }
        },
        version: {
            type: Number,
            default: 1
        },
        updatedAt: { type: Date, default: Date.now },
        updatedBy : { 
            type: mongoose.Schema.Types.ObjectId,
            ref: _collectionName.MasterUser,
            default: null
        },
        actionTaken : { type: String, enum : Object.values(_userAction)},
        ipAddress: { type: String }
    }]
},

{ timestamps : true }

// userType collection featureType ... has to match with each other can should never change 

)

userSchema.pre('save', function (next) {
    switch (this.userType) {
        case _userType.ho:
            this.portalRef = _collectionName.HeadOffice;
            break;
        case _userType.bo:
            this.portalRef = _collectionName.Branch;
            break;
        case _userType.agent:
            this.portalRef = _collectionName.agency;
            break;
        case _userType.associate:
            this.portalRef = _collectionName.Users; // it should be associate , need to change it later
            break;
        default: 
            this.portalRef = null; 
            break;
    }

    next();
});
  

const MasterUser = mongoose.model(_collectionName.MasterUser, userSchema) // need to change the collection name

module.exports = {MasterUser}