const { Schema, model } = require('mongoose');

const questionsSchema = new Schema({
    id: Number,
    question_title: String,
    phase: Number,
    required: {
        type: Number,
        default: 0
    },
    active: {
        type: Number,
        default: 1
    },
    answers: [String],

    survey_id: {
        type: Schema.Types.ObjectId,
        ref: 'survey',
    },
    question_type: {
        type: Schema.Types.ObjectId,
        ref: 'question_controller',
    },
    department_id: {
        type: Schema.Types.ObjectId,
        ref: 'department'
    },

    question_dependency: [{
        parent_id: {
            type: Schema.Types.ObjectId,
            ref: 'question',
        },
        related_answer: String,
        text: String,
        question_title: String,
        parent_dummy_id: String // Add this field to match your code
    }],
    flag: Number
}, { timestamps: true });

module.exports = model('question', questionsSchema);
