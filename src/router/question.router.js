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


// router.post('/api/v1/addQuestion', auth, async (req, res) => {
//     try {
//         let role = req.user.user_role;
//         const { questions } = req.body;

//         if (role === "admin") {
//             // Process and store questions
//             const storedQuestions = await processAndStoreQuestions(questions);

//             // Respond with the stored questions
//             res.json({ message: "Questions added successfully", questions: storedQuestions });
//         } else {
//             res.json({ message: "Sorry, you are unauthorized" });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });

// async function processAndStoreAnswers(answerArray, questionId) {
//     const answerIdsAndTexts = [];

//     for (const answerText of answerArray) {
//         const newAnswer = new Answer({ answer: answerText, question_id: questionId });
//         const savedAnswer = await newAnswer.save();
//         answerIdsAndTexts.push({ id: savedAnswer._id, text: answerText, answer_id: savedAnswer._id });
//     }

//     return answerIdsAndTexts;
// }

// async function processAndStoreQuestions(questions) {
//     const storedQuestions = [];

//     for (const questionData of questions) {
//         const { id, question_title, answers, question_dependency, ...otherFields } = questionData;

//         // Create the question
//         const newQuestion = new Question({
//             id,
//             question_title,
//             ...otherFields,
//         });

//         // Process and store answers
//         const answerIdsAndTexts = await processAndStoreAnswers(answers, newQuestion._id);

//         // Set answer IDs in the question
//         newQuestion.answers = answerIdsAndTexts.map(answerData => answerData.id);

//         // Check if there is a dependency
//         if (question_dependency && Array.isArray(question_dependency)) {
//             const dependencies = [];

//             for (const dep of question_dependency) {
//                 const { parent_id, text, answer_id, answer_text } = dep;
                
//                 // Find the parent question by ID
//                 const parentQuestion = await Question.findOne({ id: parent_id });

//                 // Find the correct answer ID from the processed answers
//                 const correspondingAnswer = answerIdsAndTexts.find(answerData => answerData.text === answer_text);

//                 // Add dependency to the new question
//                 const dependency = {
//                     id: parentQuestion._id, // Assuming MongoDB ObjectId is used
//                     text,
//                     answer_id: correspondingAnswer && correspondingAnswer.id,
//                     answer_text,
//                 };

//                 dependencies.push(dependency);
//             }

//             newQuestion.question_dependency = dependencies;
//         }

//         // Save the question
//         const savedQuestion = await newQuestion.save();
//         storedQuestions.push(savedQuestion);
//     }

//     return storedQuestions;
// }

module.exports = router;


// router.post('/api/v1/addQuestion', auth, async (req, res) => {
//     try {
//         const { questions } = req.body;

//         if (questions && Array.isArray(questions)) {
//             const dummyIdMap = new Map(); // To store the mapping between dummy and actual MongoDB ObjectIds

//             for (const q of questions) {
//                 // Create Question
//                 const question = new Question({
//                     question_title: q.question_title,
//                     required_question: q.required_question,
//                     phase: q.phase,
//                     question_type: q.question_type,
//                     // ... other question fields
//                 });

//                 try {
//                     const savedQuestion = await question.save();
//                     dummyIdMap.set(q.dummyId, savedQuestion._id); // Store the mapping
//                     console.log(`Question saved to database with dummy id: ${q.dummyId}`);

//                     // Create Answers for the Question
//                     if (q.answers && Array.isArray(q.answers)) {
//                         for (const answerText of q.answers) {
//                             const answer = new Answer({
//                                 question_id: savedQuestion._id,
//                                 answer: answerText,
//                             });
//                             const savedAnswer = await answer.save();
//                             console.log(`Answer saved to database with _id: ${savedAnswer._id}`);
//                         }
//                     }
//                 } catch (error) {
//                     console.error('Error saving question to database:', error.message);
//                 }
//             }

//             // Update the questions with the correct dependencies
//             for (const q of questions) {
//                 const savedQuestion = await Question.findOne({ question_title: q.question_title });

//                 if (savedQuestion && q.question_dependency && Array.isArray(q.question_dependency)) {
//                     const updatedDependencies = q.question_dependency.map(dep => ({
//                         parent_id: dummyIdMap.get(dep.dummyId), // Use the mapped MongoDB ObjectId
//                         parent_text: dep.parent_text,
//                         answer_id: null, // Placeholder, will be updated later
//                         // ... other dependency fields
//                     }));

//                     // Update the question with the dependency placeholder
//                     await Question.findOneAndUpdate(
//                         { _id: savedQuestion._id },
//                         { $push: { question_dependency: { $each: updatedDependencies } } }
//                     );

//                     // Update answer_id based on actual Answer ObjectId
//                     for (const dep of updatedDependencies) {
//                         const answer = await Answer.findOne({
//                             question_id: savedQuestion._id,
//                             answer_text: dep.parent_text, // Assuming parent_text corresponds to answer_text
//                         });
//                         if (answer) {
//                             dep.answer_id = answer._id;
//                         }
//                     }

//                     // Fetch the updated question with the correct dependencies
//                     const updatedQuestion = await Question.findOne({ _id: savedQuestion._id });

//                     // Update the question with the correct dependencies
//                     updatedQuestion.question_dependency.forEach(async (dep, index) => {
//                         const updatedDep = updatedDependencies.find(ud => ud.parent_text === dep.parent_text);
//                         if (updatedDep) {
//                             updatedQuestion.question_dependency[index].answer_id = updatedDep.answer_id;
//                         }
//                     });

//                     await updatedQuestion.save();

//                     console.log(`Dependencies updated for question with dummy id: ${q.dummyId}`);
//                 }
//             }

//             res.json({ message: 'Questions and dependencies saved successfully' });
//         } else {
//             res.status(400).json({ message: 'Invalid request or missing questions array' });
//         }
//     } catch (error) {
//         console.error('Catch error:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// });

//module.exports = router

/*

{
  "questions": [
    {
      "dummyId": 1,
      "question_title": "What is your favorite color?",
      "required_question": true,
      "phase": 1,
      "question_type": "Multiple Choice",
      "answers": ["Red", "Blue", "Green"],
      "question_dependency": [
        {
          "dummyId": 2,
          "parent_text": "Blue"
        },
        {
          "dummyId": 3,
          "parent_text": "Green"
        }
      ]
    },
    {
      "dummyId": 2,
      "question_title": "Why do you like Blue?",
      "required_question": false,
      "phase": 2,
      "question_type": "Text",
      "question_dependency": [
        {
          "dummyId": 1,
          "parent_text": "Blue",
          "parent_answer": null
        }
      ]
    },
    {
      "dummyId": 3,
      "question_title": "Why do you like Green?",
      "required_question": false,
      "phase": 2,
      "question_type": "Text",
      "question_dependency": [
        {
          "dummyId": 1,
          "parent_text": "Green",
          "parent_answer": null
        }
      ]
    },
    {
      "dummyId": 4,
      "question_title": "Additional Comments",
      "required_question": false,
      "phase": 3,
      "question_type": "Text",
      "question_dependency": [
        {
          "dummyId": 2,
          "parent_text": "Blue",
          "parent_answer": null
        },
        {
          "dummyId": 3,
          "parent_text": "Green",
          "parent_answer": null
        }
      ]
    }
  ]
}


*/