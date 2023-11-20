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
    survey_id: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    active: {
        type: Number,
        default: 1
    },

    required_question:{
        type:Boolean
    },
    question_description:{
        type:String
    }


}, { timestamps: true })

module.exports = model('question', questionsSchema)