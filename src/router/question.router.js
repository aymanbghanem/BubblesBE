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


// router.post('/api/v1/addQuestions', auth, async (req, res) => {
//     try {
//         let role = req.user.user_role;
//         if (role === "admin") {
//             // Assuming req.body contains the input data
//             const questionsData = req.body.questions;

//             const storedQuestions = await processAndStoreQuestions(questionsData);

//             res.json({ message: "Questions added successfully" });
//         } else {
//             res.json({ message: "Sorry, you are unauthorized" });
//         }
//     } catch (error) {
//         res.json({ message: "Catch error " + error });
//     }
// });

// async function processAndStoreQuestions(questions) {
//     const storedQuestions = [];

//     // Save questions without dependencies and child questions
//     for (const questionData of questions) {
//         const { id, flag, question_title, answers, question_type, ...otherFields } = questionData;

//         // Fetch question type ID from QuestionController table based on the provided question type
//         const questionTypeObject = await QuestionController.findOne({ question_type: question_type });
//         const questionTypeId = questionTypeObject ? questionTypeObject._id : null;

//         const newQuestion = new Question({
//             id,
//             flag: flag,
//             question_title,
//             question_type: questionTypeId,
//             ...otherFields,
//         });

//         switch (question_type) {
//             case "text":
//                 // No answers, dependencies, or child questions for text questions
//                 break;
//             case "single choice":
//             case "Multiple choice":
//             case "Range":
//                 // Process and store answers only for single-choice, multiple-choice, and range questions
//                 const answerIdsAndTexts = await processAndStoreAnswers(answers, newQuestion._id, question_type);
//                 newQuestion.answers = answerIdsAndTexts.map(answerData => answerData.id);
//                 break;
//             default:
//                 throw new Error(`Unsupported question type: ${question_type}`);
//         }

//         // Save the question
//         const savedQuestion = await newQuestion.save();
//         storedQuestions.push(savedQuestion);
//     }

//     // Process dependencies and child questions after all questions are saved
//     for (const savedQuestion of storedQuestions) {
//         const { id, child_questions, question_dependency } = questions.find(q => q.id === savedQuestion.id);

//         if (question_dependency && Array.isArray(question_dependency)) {
//             savedQuestion.question_dependency = await processAndStoreQuestionDependencies(question_dependency, storedQuestions);
//             await savedQuestion.save(); // Save the updated question with dependencies
//         }

//         if (child_questions && Array.isArray(child_questions)) {
//             savedQuestion.child_questions = await processAndStoreChildQuestions(child_questions, storedQuestions);
//             await savedQuestion.save(); // Save the updated question with child questions
//         }
//     }

//     return storedQuestions;
// }

// async function processAndStoreAnswers(answerArray, questionId, questionType) {
//     // Fetch question type ID from QuestionController table based on the provided question type
//     const questionTypeObject = await QuestionController.findOne({ question_type: questionType });
//     const questionTypeId = questionTypeObject ? questionTypeObject._id : null;

//     const answerIdsAndTexts = await Promise.all(answerArray.map(async answerText => {
//         const newAnswer = new Answer({
//             answer: answerText.text,
//             image: answerText.image,
//             question_id: questionId,
//             question_type: questionTypeId,
//         });
//         const savedAnswer = await newAnswer.save();
//         return { id: savedAnswer._id, text: answerText.text, answer_id: savedAnswer._id };
//     }));

//     return answerIdsAndTexts;
// }

// async function processAndStoreQuestionDependencies(dependencies, storedQuestions) {
//     const updatedDependencies = [];

//     for (const dependencyData of dependencies) {
//         const { parent_dummy_id, related_answer, ...otherFields } = dependencyData; // Added related_answer field

//         const correspondingQuestion = storedQuestions.find(question => question.id === parent_dummy_id);

//         if (correspondingQuestion) {
//             const newDependency = {
//                 ...otherFields,
//                 parent_id: correspondingQuestion._id,
//                 related_answer,
//             };
//             updatedDependencies.push(newDependency);
//         } else {
//             console.error(`Parent question with dummy id ${parent_dummy_id} not found.`);
//         }
//     }

//     return updatedDependencies;
// }




// router.post('/api/v1/addQuestion', auth, async (req, res) => {
//   try {
//     const role = req.user.user_role;
//     const { questions } = req.body;

//     if (role === "admin") {
//       // Process and store questions
//       const storedQuestions = await processAndStoreQuestions(questions);

//       // Respond with the stored questions
//       res.json({ message: "Questions added successfully", questions: storedQuestions });
//     } else {
//       res.json({ message: "Sorry, you are unauthorized" });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });

// async function processAndStoreAnswers(answerArray, questionId) {
//   const answerIdsAndTexts = await Promise.all(answerArray.map(async answerText => {
//     const newAnswer = new Answer({ answer: answerText, question_id: questionId });
//     const savedAnswer = await newAnswer.save();
//     return { id: savedAnswer._id, text: answerText, answer_id: savedAnswer._id };
//   }));

//   return answerIdsAndTexts;
// }

// async function processAndStoreQuestions(questions) {
//   const storedQuestions = [];

//   // Save questions without dependencies and child questions
//   for (const questionData of questions) {
//     const { id, question_title, answers, ...otherFields } = questionData;

//     const newQuestion = new Question({
//       id,
//       question_title,
//       ...otherFields,
//     });

//     const answerIdsAndTexts = await processAndStoreAnswers(answers, newQuestion._id);
//     newQuestion.answers = answerIdsAndTexts.map(answerData => answerData.id);

//     // Save the question
//     const savedQuestion = await newQuestion.save();
//     storedQuestions.push(savedQuestion);
//   }

//   // Process child questions and dependencies after all questions are saved
//   for (const savedQuestion of storedQuestions) {
//     const { id, child_questions, question_dependency } = questions.find(q => q.id === savedQuestion.id);

//     if (question_dependency && Array.isArray(question_dependency)) {
//       savedQuestion.question_dependency = await processAndStoreQuestionDependencies(question_dependency, storedQuestions);
//       await savedQuestion.save(); // Save the updated question with dependencies
//     }
//   }

//   // Process child questions after all questions and dependencies are saved
//   for (const savedQuestion of storedQuestions) {
//     const { id, child_questions } = questions.find(q => q.id === savedQuestion.id);

//     if (child_questions && Array.isArray(child_questions)) {
//       savedQuestion.child_questions = await processAndStoreChildQuestions(child_questions, storedQuestions);
//       await savedQuestion.save(); // Save the updated question with child questions
//     }
//   }

//   return storedQuestions;
// }

// async function processAndStoreChildQuestions(childQuestions, storedQuestions) {
//   const updatedChildQuestions = [];

//   for (const childQuestionData of childQuestions) {
//     const { child_dummy_id, child_questions, related_answer, ...parentFields } = childQuestionData; // Added related_answer field

//     const correspondingParent = storedQuestions.find(question => question.id == parentFields.parent_id);
//     const correspondingChild = storedQuestions.find(question => question.id == child_dummy_id);

//     if (correspondingParent && correspondingChild) {
//       if (child_questions && Array.isArray(child_questions)) {
//         // Process and store child questions recursively
//         const processedChildQuestions = await processAndStoreChildQuestions(child_questions, storedQuestions);
//         parentFields.child_questions = processedChildQuestions;
//       }

//       // Create a new child question with the correct child_id
//       const newChildQuestion = { ...parentFields, child_id: correspondingChild._id, related_answer };
//       updatedChildQuestions.push(newChildQuestion);

//       // Save the new child question
//       const savedChildQuestion = new Question(newChildQuestion);
//       await savedChildQuestion.save();

//       // Update parent question with child information
//       correspondingParent.child_questions = correspondingParent.child_questions || [];
//       correspondingParent.child_questions.push(savedChildQuestion);
//       await correspondingParent.save(); // Save the updated parent question
//     } else {
//       console.error(`Parent question with dummy id ${parentFields.parent_id} or child question with dummy id ${child_dummy_id} not found.`);
//     }
//   }

//   return updatedChildQuestions;
// }

// async function processAndStoreQuestionDependencies(dependencies, storedQuestions) {
//   const updatedDependencies = [];

//   for (const dependencyData of dependencies) {
//     const { parent_dummy_id, related_answer, ...otherFields } = dependencyData; // Added related_answer field

//     const correspondingQuestion = storedQuestions.find(question => question.id === parent_dummy_id);

//     if (correspondingQuestion) {
//       const newDependency = {
//         ...otherFields,
//         parent_id: correspondingQuestion._id,
//         related_answer,
//       };
//       updatedDependencies.push(newDependency);
//     } else {
//       console.error(`Parent question with dummy id ${parent_dummy_id} not found.`);
//     }
//   }

//   return updatedDependencies;
// }
module.exports = router;

