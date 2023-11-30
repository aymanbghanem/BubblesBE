const { Schema, model } = require('mongoose')

const questionsSchema = new Schema({
    id:Number,
    question_title: {
        type: String
    },
    department_id: {
        type: Schema.Types.ObjectId,
        ref: 'department'
    },
    survey_id: {
        type: Schema.Types.ObjectId,
        ref: 'survey'
    },
    active: {
        type: Number,
        default: 1
    },
    required_question: {
        type: Boolean
    },
    question_subtitle: {
        type: String
    },
    phase: {
        type: Number,

    },
    question_type: {
        type: String
    },
    question_dependency: [{
        id: {
            type: Schema.Types.ObjectId,
            ref: 'question'
        },
        text: String,
        answer_id: {
            type: Schema.Types.ObjectId,
            ref: 'answer'
        },
        answer_text:String

    }],
    have_child:{
        type:Number , 
        default : 0
    }
}, { timestamps: true })

module.exports = model('question', questionsSchema)