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
}, { timestamps: true })

module.exports = model('department', departmentSchema)