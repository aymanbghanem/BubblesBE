const { Schema, model } = require('mongoose');

const questionsSchema = new Schema({
    id: Number,
    question_title: String,
    have_child: {
        type: Number,
        default: 0,
    },
    child_questions: [{
        child_id: {
            type: Schema.Types.ObjectId,
            ref: 'question',
        },
        answer_text: String,
        child_phase: Number,
        question_title:String,
    }],
    answers: [String], // Store answer texts directly
    question_dependency: [{
        parent_id: {
            type: Schema.Types.ObjectId,
            ref: 'question',
        },
        answers: [String], // Store answer texts directly
        text: String,
        question_title:String,
    }],
}, { timestamps: true });

module.exports = model('question', questionsSchema);
