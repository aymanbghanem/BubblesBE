const express = require("express");
const router = express.Router();
var mongoose = require("mongoose");
const surveyModel = require('../models/survey.models')
const { hashPassword } = require('../helper/hashPass.helper')
const { myMulter } = require('../middleware/upload');
const config = require('../../config')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
const Question = require("../models/questions.models");
const Answer = require("../models/answers.model")
const QuestionController = require('../models/questions_controller.models')
require('dotenv').config()


router.post('/api/v1/addQuestions', auth, async (req, res) => {
    try {
        let role = req.user.user_role;
        if (role === "admin") {
            // Assuming req.body contains the input data
            const questionsData = req.body.questions;

            const storedQuestions = await processAndStoreQuestions(questionsData);

            res.json({ message: "Questions added successfully" });
        } else {
            res.json({ message: "Sorry, you are unauthorized" });
        }
    } catch (error) {
        res.json({ message: "Catch error " + error });
    }
});

async function processAndStoreQuestions(questions) {
    const storedQuestions = [];

    // Save questions without dependencies and child questions
    for (const questionData of questions) {
        const { id, flag, question_title, answers, question_type, ...otherFields } = questionData;

        // Fetch question type ID from QuestionController table based on the provided question type
        const questionTypeObject = await QuestionController.findOne({ question_type: question_type });
        const questionTypeId = questionTypeObject ? questionTypeObject._id : null;

        const newQuestion = new Question({
            id,
            question_title,
            question_type: questionTypeId,
            ...otherFields,
        });

        switch (question_type) {
            case "text":
                // No answers, dependencies, or child questions for text questions
                break;
            case "Single selection":
            case "Multiple selection":
            case "Range":
                // Process and store answers only for single-choice, multiple-choice, and range questions
                const answerIdsAndTexts = await processAndStoreAnswers(answers, newQuestion._id, question_type);
                newQuestion.answers = answerIdsAndTexts.map(answerData => answerData.id);
                break;
            default:
                throw new Error(`Unsupported question type: ${question_type}`);
        }

        // Save the question
        const savedQuestion = await newQuestion.save();
        storedQuestions.push(savedQuestion);
    }

    // Process dependencies and child questions after all questions are saved
    for (const savedQuestion of storedQuestions) {
        const { id, child_questions, question_dependency } = questions.find(q => q.id === savedQuestion.id);

        if (question_dependency && Array.isArray(question_dependency)) {
            savedQuestion.question_dependency = await processAndStoreQuestionDependencies(question_dependency, storedQuestions);
            await savedQuestion.save(); // Save the updated question with dependencies
        }

        if (child_questions && Array.isArray(child_questions)) {
            savedQuestion.child_questions = await processAndStoreChildQuestions(child_questions, storedQuestions);
            await savedQuestion.save(); // Save the updated question with child questions
        }
    }

    return storedQuestions;
}

async function processAndStoreAnswers(answerArray, questionId, questionType) {
    // Fetch question type ID from QuestionController table based on the provided question type
    const questionTypeObject = await QuestionController.findOne({ question_type: questionType });
    const questionTypeId = questionTypeObject ? questionTypeObject._id : null;

    const answerIdsAndTexts = await Promise.all(answerArray.map(async answerText => {
        const newAnswer = new Answer({
            answer: answerText.text,
            image: answerText.image,
            question_id: questionId,
            question_type: questionTypeId,
        });
        const savedAnswer = await newAnswer.save();
        return { id: savedAnswer._id, text: answerText.text, answer_id: savedAnswer._id };
    }));

    return answerIdsAndTexts;
}

async function processAndStoreQuestionDependencies(dependencies, storedQuestions) {
    const updatedDependencies = [];

    for (const dependencyData of dependencies) {
        const { flag,parent_dummy_id, sign, related_answer, ...otherFields } = dependencyData; // Added related_answer field

        const correspondingQuestion = storedQuestions.find(question => question.id === parent_dummy_id);

        if (correspondingQuestion) {
            const newDependency = {
                ...otherFields,
                sign,
                flag,
                parent_id: correspondingQuestion._id,
                related_answer,
            };
            updatedDependencies.push(newDependency);
        } else {
            console.error(`Parent question with dummy id ${parent_dummy_id} not found.`);
        }
    }

    return updatedDependencies;
}




module.exports = router;

