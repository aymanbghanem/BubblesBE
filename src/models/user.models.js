const { Schema, model } = require('mongoose')

const userSchema = new Schema({
    user_name: {
        type: String
    },
    user_role: {
        type: String,

    },
    active: {
        type: Number,
        default: 1
    },
    token: {
        type: String
    },
    email_address:{
        type:String
    },
    password:String,
    company_id:{
        type:Schema.Types.ObjectId,
        ref:'company'
    },
    department_id:{
        type:Schema.Types.ObjectId,
        ref:'department'
    },
    image:{
        type:String,
        default:''
    }
    
    
}, { timestamps: true })

module.exports = model('user', userSchema)