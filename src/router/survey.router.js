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
      res.status(500).json({ message:' '+error });
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

async function processAndStoreAnswers(answerArray, questionId) {
  const answerIdsAndTexts = [];

  for (const answerText of answerArray) {
    const newAnswer = new Answer({ answer: answerText, question_id: questionId });
    const savedAnswer = await newAnswer.save();
    answerIdsAndTexts.push({ id: savedAnswer._id, text: answerText, answer_id: savedAnswer._id });
  }

  return answerIdsAndTexts;
}

async function processAndStoreQuestions(questions, surveyId) {
  const storedQuestions = [];

  for (const questionData of questions) {
      const { id, question_title,have_child, answers, question_dependency, ...otherFields } = questionData;

      // Create the question with the associated survey ID
      const newQuestion = new Question({
          id,
          question_title,
          survey_id: surveyId,
          have_child:have_child,
          ...otherFields,
      });

      // Process and store answers
      const answerIdsAndTexts = await processAndStoreAnswers(answers, newQuestion._id);

      // Set answer IDs in the question
      newQuestion.answers = answerIdsAndTexts.map(answerData => answerData.id);

      // Check if there is a dependency
      if (question_dependency && Array.isArray(question_dependency)) {
          const dependencies = [];

          for (const dep of question_dependency) {
              const { parent_id, text, answer_id, answer_text } = dep;

              // Find the parent question by ID
              const parentQuestion = await Question.findOne({ id: parent_id, survey_id: surveyId });

              // Find the correct answer ID from the processed answers
              const correspondingAnswer = answerIdsAndTexts.find(answerData => answerData.text === answer_text);

              // Add dependency to the new question
              const dependency = {
                  id: parentQuestion._id, // Assuming MongoDB ObjectId is used
                  text,
                  answer_id: correspondingAnswer && correspondingAnswer.id,
                  answer_text,
              };

              dependencies.push(dependency);
          }

          newQuestion.question_dependency = dependencies;
      }

      // Save the question
      const savedQuestion = await newQuestion.save();
      storedQuestions.push(savedQuestion);
  }

  return storedQuestions;
}

function flattenLocationTree(locationTree) {
  return Array.isArray(locationTree[0]) ? locationTree.flat() : locationTree;
}

module.exports = router
