const { Schema, model } = require('mongoose')

const reportSchema = new Schema({
    active: {
        type: Number,
        default: 1
    },
    created_by : {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    location_id: {
        type: Schema.Types.ObjectId,
        ref: 'survey'
    },
    survey_id: {
        type: Schema.Types.ObjectId,
        ref: 'survey'
    },
    question_id: {
        type: Schema.Types.ObjectId,
        ref: 'question'
    },
    company_id: {
        type: Schema.Types.ObjectId,
        ref: 'company'
    },
    department_id: {
        type: Schema.Types.ObjectId,
        ref: 'department'
    },
    chart_type:{
        type:String
    },
    start_date:{
      type:Date
    },
    end_date:{
       type:Date
    }

}, { timestamps: true })

module.exports = model('report', reportSchema)