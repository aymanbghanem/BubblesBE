const { Schema, model } = require('mongoose');

const questionsSchema = new Schema({
    id: Number,
    temp:{
        type: Schema.Types.ObjectId,
        ref: 'question',
    },
    drop_down:{
        type:Number,
        default:0
    },
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
        flag: Number,
        parent_id: {
            type: Schema.Types.ObjectId,
            ref: 'question',
        },
        comparisonOptions:String,
        sign:String,
        related_answer: String,
        text: String,
        question_title: String,
        parent_dummy_id:Number // Add this field to match your code
    }],
    deleted:{
        type:Number,
        default : 0,
    }

}, { timestamps: true });

module.exports = model('question', questionsSchema);
