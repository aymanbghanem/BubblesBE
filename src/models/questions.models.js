const { Schema, model } = require('mongoose')

const questionsSchema = new Schema({
    question_title: {
        type: String
    },
    question_id: {
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
    survey_description:String,
    logo:{
        type:String
    }


}, { timestamps: true })

module.exports = model('question', questionsSchema)