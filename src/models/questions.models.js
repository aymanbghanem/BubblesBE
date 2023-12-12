const { Schema, model } = require('mongoose');

const questionsSchema = new Schema({
    id: Number,
    question_title: String,
    phase: Number,
    required:{
       type:Number,
       default:0
    },
    active:{
        type:Number,
        default:1
    },
    answers: [String],

    survey_id: {
        type: Schema.Types.ObjectId,
        ref: 'survey',
    },
    question_type:{
        type: Schema.Types.ObjectId,
        ref: 'question_controller',
    },
    department_id:{
        type: Schema.Types.ObjectId,
        ref: 'department'
    },
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
    flag:Number

}, { timestamps: true });

module.exports = model('question', questionsSchema);
