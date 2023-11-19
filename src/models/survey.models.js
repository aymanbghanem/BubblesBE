const { Schema, model } = require('mongoose')

const surveySchema = new Schema({
    survey_title: {
        type: String
    },
    company_id: {
        type: Schema.Types.ObjectId,
        ref: 'company'
    },
    department_id: {
        type: Schema.Types.ObjectId,
        ref: 'department'
    },
    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    company_logo: String,

    active: {
        type: Number,
        default: 1
    },
    survey_description:String


}, { timestamps: true })

module.exports = model('survey', surveySchema)