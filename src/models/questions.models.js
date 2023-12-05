const { Schema, model } = require('mongoose');

const questionsSchema = new Schema({
    id: Number,
    question_title: String,
    
    have_child: {
        type: Number,
        default: 0,
    },

    answers: [String],

    child_questions: [{
        child_id: {
            type: Schema.Types.ObjectId,
            ref: 'question',
        },
        related_answer: String,
        child_phase: Number,
        question_title: String,
    }],
 

    question_dependency: [{
        parent_id: {
            type: Schema.Types.ObjectId,
            ref: 'question',
        },
        related_answer: String,
        text: String,
        question_title: String,
    }],

}, { timestamps: true });

module.exports = model('question', questionsSchema);
