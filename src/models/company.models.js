const { Schema, model } = require('mongoose')

const companySchema = new Schema({
    company_name: {
        type: String
    },

    active: {
        type: Number,
        default: 1
    },
    company_logo:String,

        // basic:{
        //     type: Number,
        //     default:1,
        //     min:[0,'invalid number'],
        //     max:[1,'invalid number']
        // },
        dashboard:{
            type: Number,
            default:0,
            min:[0,'invalid number'],
            max:[1,'invalid number']
        }
        ,
        notifier:{
            type: Number,
            default:0,
            min:[0,'invalid number'],
            max:[1,'invalid number']
        }

    
}, { timestamps: true })

module.exports = model('company', companySchema)