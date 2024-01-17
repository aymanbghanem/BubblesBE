const { Schema, model } = require('mongoose')

const departmentSchema = new Schema({
    department_name: {
        type: String
    },

    active: {
        type: Number,
        default: 1
    },
    company_id:{
        type:Schema.Types.ObjectId,
        ref:'company'
    },
    deleted:{
        type: Number,
        default: 0
    }
}, { timestamps: true })

module.exports = model('department', departmentSchema)