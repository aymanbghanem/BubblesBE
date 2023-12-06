const express = require("express");
const router = express.Router();
const surveyModel = require('../models/survey.models')
const { hashPassword } = require('../helper/hashPass.helper')
const { myMulter } = require('../middleware/upload');
const config = require('../../config')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
const surveyReaderModel = require("../models/surveyReader.model");
const Question = require("../models/questions.models");
const Answer = require("../models/answers.model")
const QuestionController = require('../models/questions_controller.models')
const Location = require("../../src/models/location.models");
const questionsModels = require("../models/questions.models");
const Response = require("../models/response.model")
const mongoose = require('mongoose')
require('dotenv').config()

router.post('/api/v1/createSurvey', auth, async (req, res) => {
  try {
    let role = req.user.user_role;
    let department_id = req.user.department_id;
    let user = req.user
    const { survey, location, questions } = req.body;

    if (role === "admin") {
      // Process and store survey
      const storedSurvey = await processAndStoreSurvey(survey, user);

      // Process and store questions with the survey ID
      const storedQuestions = await processAndStoreQuestions(questions, storedSurvey._id);

      // Process and store location
      const storedLocation = await processAndStoreLocation(location, storedSurvey, req.user);

      // Respond with the stored data
      res.json({
        message: "Survey, location, and questions added successfully",
        survey: storedSurvey,
        location: storedLocation,
        questions: storedQuestions
      });
    } else {
      res.json({ message: "Sorry, you are unauthorized" });
    }
  } catch (error) {
    //console.error(error);
    res.status(500).json({ message: ' ' + error });
  }
});
async function processAndStoreSurvey(surveyData, user) {
  try {
    // Ensure survey name is unique within the department
    if (surveyData.survey_title.toLowerCase() === "seemiller") {
      return { message: "Seemiller is a reserved survey name. Please choose a different name." };
    }

    let existingSurvey = await surveyModel.findOne({ survey_title: surveyData.survey_title, department_id: user.department_id, active: 1 });

    if (existingSurvey) {
      throw new Error("Survey with the same name already exists in the department");
    } else {
      // Create a new survey
      let survey = await surveyModel.create({
        survey_title: surveyData.survey_title,
        survey_description: surveyData.survey_description,
        logo: surveyData.logo,
        department_id: user.department_id,
        created_by: user._id,
        company_id: user.company_id,
        background_color: surveyData.background_color,
        question_text_color: surveyData.question_text_color,
        submission_pwd: surveyData.submission_pwd
      });

      return survey;
    }
  } catch (error) {
    throw error;
  }
}
async function processAndStoreLocation(locationData, survey, user) {
  try {
    const idToLocationMap = new Map();

    for (const locData of flattenLocationTree(locationData.location_tree)) {
      const { id, name, parentId, description } = locData;

      const location = new Location({
        location_name: name,
        department_id: user.department_id,
        id: id,
        survey_id: survey._id,
        location_description: description
      });

      await location.save();

      // Store the MongoDB-generated ID for later reference
      locData.mongoId = String(location._id);

      // Store the location in the map for potential parent references
      idToLocationMap.set(id, location);
    }

    // Assign parent references based on the provided parent IDs
    for (const locData of flattenLocationTree(locationData.location_tree)) {
      const { id, parentId } = locData;

      const location = idToLocationMap.get(id);
      const parent = parentId !== null ? idToLocationMap.get(parentId) : null;

      // Check if location and parent exist before updating the parent reference
      if (location) {
        await Location.updateOne({ _id: location._id }, { parent_id: parent ? parent._id : null });
      }
    }

    return "Locations stored and parent references assigned successfully!";
  } catch (error) {
    throw error;
  }
}
async function processAndStoreAnswers(answerArray, questionId, questionType) {
  // Fetch question type ID from QuestionController table based on the provided question type
  const questionTypeObject = await QuestionController.findOne({ type: questionType });
  const questionTypeId = questionTypeObject ? questionTypeObject._id : null;

  const answerIdsAndTexts = await Promise.all(answerArray.map(async answerText => {
    const newAnswer = new Answer({ answer: answerText, question_id: questionId, question_type: questionTypeId });
    const savedAnswer = await newAnswer.save();
    return { id: savedAnswer._id, text: answerText, answer_id: savedAnswer._id };
  }));

  return answerIdsAndTexts;
}
async function processAndStoreQuestions(questions, survey) {
  const storedQuestions = [];

  // Save questions without dependencies and child questions
  for (const questionData of questions) {
    const { id, question_title, answers, question_type, ...otherFields } = questionData;

    // Fetch question type ID from QuestionController table based on the provided question type
    const questionTypeObject = await QuestionController.findOne({ question_type: question_type });
    const questionTypeId = questionTypeObject ? questionTypeObject._id : null;

    const newQuestion = new Question({
      id,
      survey_id: survey,
      question_title,
      question_type: questionTypeId,
      ...otherFields,
    });

    const answerIdsAndTexts = await processAndStoreAnswers(answers, newQuestion._id, question_type);
    newQuestion.answers = answerIdsAndTexts.map(answerData => answerData.id);

    // Save the question
    const savedQuestion = await newQuestion.save();
    storedQuestions.push(savedQuestion);
  }

  // Process child questions and dependencies after all questions are saved
  for (const savedQuestion of storedQuestions) {
    const { id, child_questions, question_dependency } = questions.find(q => q.id === savedQuestion.id);

    if (question_dependency && Array.isArray(question_dependency)) {
      savedQuestion.question_dependency = await processAndStoreQuestionDependencies(question_dependency, storedQuestions);
      await savedQuestion.save(); // Save the updated question with dependencies
    }
  }

  // Process child questions after all questions and dependencies are saved
  for (const savedQuestion of storedQuestions) {
    const { id, child_questions } = questions.find(q => q.id === savedQuestion.id);

    if (child_questions && Array.isArray(child_questions)) {
      savedQuestion.child_questions = await processAndStoreChildQuestions(child_questions, storedQuestions);
      await savedQuestion.save(); // Save the updated question with child questions
    }
  }

  return storedQuestions;
}

async function processAndStoreChildQuestions(childQuestions, storedQuestions) {
  const updatedChildQuestions = [];

  for (const childQuestionData of childQuestions) {
    const { child_dummy_id, child_questions, related_answer, ...parentFields } = childQuestionData;

    const correspondingParent = storedQuestions.find(question => question.id == parentFields.parent_id);
    const correspondingChild = storedQuestions.find(question => question.id == child_dummy_id);

    if (correspondingParent && correspondingChild) {
      // Check if the child question already exists
      const existingChildQuestion = await Question.findOne({ id: child_dummy_id });

      if (existingChildQuestion) {
        // Update the existing child question with the correct child_id
        const updatedChildQuestion = { ...parentFields, child_id: correspondingChild._id, related_answer };
        updatedChildQuestions.push(updatedChildQuestion);

        await Question.updateOne({ _id: existingChildQuestion._id }, updatedChildQuestion);
      } else {
        if (child_questions && Array.isArray(child_questions)) {
          const processedChildQuestions = await processAndStoreChildQuestions(child_questions, storedQuestions);
          parentFields.child_questions = processedChildQuestions;
        }

        // Create a new child question with the correct child_id
        const newChildQuestion = { ...parentFields, child_id: correspondingChild._id, related_answer };
        updatedChildQuestions.push(newChildQuestion);

        // Save the new child question
        const savedChildQuestion = new Question(newChildQuestion);
        await savedChildQuestion.save();

        // Update parent question with child information
        correspondingParent.child_questions = correspondingParent.child_questions || [];
        correspondingParent.child_questions.push(savedChildQuestion);
        await correspondingParent.save(); // Save the updated parent question
      }
    } else {
      console.error(`Parent question with dummy id ${parentFields.parent_id} or child question with dummy id ${child_dummy_id} not found.`);
    }
  }

  return updatedChildQuestions;
}

// Similarly, modify processAndStoreQuestionDependencies function using a similar approach.


async function processAndStoreQuestionDependencies(dependencies, storedQuestions) {
  const updatedDependencies = [];

  for (const dependencyData of dependencies) {
    const { parent_dummy_id, related_answer, ...otherFields } = dependencyData; // Added related_answer field

    const correspondingQuestion = storedQuestions.find(question => question.id === parent_dummy_id);

    if (correspondingQuestion) {
      const newDependency = {
        ...otherFields,
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
function flattenLocationTree(locationTree) {
  return Array.isArray(locationTree[0]) ? locationTree.flat() : locationTree;
}
router.post('/api/v1/getInitialQuestions', async (req, res) => {
  try {
    const { survey_id, phase, answers } = req.body;

    // Validate survey existence and active status
    const existingSurvey = await surveyModel.findOne({
      _id: survey_id,
      active: 1,
    });

    if (!existingSurvey) {
      return res.status(404).json({ message: "The survey does not exist or is not active." });
    }

    // Fetch questions for the first phase
    const firstPhaseQuestions = await Question.find({
      survey_id: survey_id,
      active: 1,
      phase: 1,
    });

    if (!firstPhaseQuestions || firstPhaseQuestions.length === 0) {
      return res.status(404).json({ message: "No questions found for the first phase." });
    }

    // You can implement your logic to handle answers and find matching questions here
    // For now, let's assume all questions in the first phase should be returned

    res.json({ questions: firstPhaseQuestions, nextPhase: 2 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post('/api/v1/getQuestions', async (req, res) => {
  const { currentQuestion } = req.body;

  const currentQuestionId = currentQuestion._id;
  const selectedAnswer = currentQuestion.answers[0]; // Assuming you want the first answer

  try {
    const question = await Question.findById(currentQuestionId);

    // Fetch the next phase questions from the database
    const nextPhaseQuestions = await Question.find({ phase: question.phase + 1 });

    // Collect all eligible questions (with and without dependencies)
    const eligibleQuestions = nextPhaseQuestions.filter((nextQuestion) => {
      if (nextQuestion.question_dependency.length === 0) {
        return true; // Include questions without dependencies
      } else {
        // Include questions with dependencies if the dependency matches
        const hasMatchingDependency = nextQuestion.question_dependency.some(
          (dependency) => {
            const isMatchingParentId = dependency.parent_id.toString() === currentQuestionId;
            const isMatchingAnswer = dependency.related_answer === selectedAnswer;
            return isMatchingParentId && isMatchingAnswer;
          }
        );
        return hasMatchingDependency;
      }
    });

    if (eligibleQuestions.length > 0) {
      // Create an array of responses for all eligible questions
      const responses = eligibleQuestions.map((eligibleQuestion) => {
        return {
          child_id: eligibleQuestion._id,
          question_text: eligibleQuestion.question_title,
          phase: eligibleQuestion.phase,
        };
      });

      return res.json(responses);
    } else {
      return res.json({ message: 'No child questions found.' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});



module.exports = router