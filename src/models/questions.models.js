const { Schema, model } = require('mongoose')

const questionsSchema = new Schema({
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
    }
}, { timestamps: true })

module.exports = model('question', questionsSchema)