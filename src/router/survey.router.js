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

// Create new survey 

router.post('/api/v1/createSurvey', auth, async (req, res) => {
  try {
    const { location_data, survey, location, questions } = req.body;
    const role = req.user.user_role;
    const department = req.user.department_id;

    if (role === 'admin') {
      // Process and store survey
      const storedSurvey = await processAndStoreSurvey(survey, req.user);

      // Process and store questions with the survey ID
      const storedQuestions = await processAndStoreQuestions(questions, storedSurvey._id, department);

      // Process and store location
      const storedLocation = await processAndStoreLocation(req.body.location_data, storedSurvey, req.user);

      res.status(200).json({
        message: 'Survey, location, and questions added successfully',
        survey: storedSurvey,
        location: storedLocation,
        questions: storedQuestions,
      });
    } else {
      res.json({ message: 'Sorry, you are unauthorized' });
    }
  } catch (error) {
    res.status(500).json({ message: ' ' + error });
  }
});
async function processAndStoreLocation(locationData, survey, user) {
  try {
    const department = user.department_id;

    const idToLocationMap = new Map();

    for (const flattenedLocation of flattenLocationData(locationData)) {
      const { id, location_name, location_description, parentId } = flattenedLocation;

      const location = new Location({
        location_name,
        department_id: department,
        id,
        location_description,
        survey_id: survey._id, // Link the location to the survey
      });

      await location.save();

      // Store the MongoDB-generated ID for later reference
      flattenedLocation.mongoId = String(location._id);

      // Store the location in the map for potential parent references
      idToLocationMap.set(id, location);
    }

    // Assign parent references based on the provided parent IDs
    for (const flattenedLocation of flattenLocationData(locationData)) {
      const { id, parentId } = flattenedLocation;

      const location = idToLocationMap.get(id);
      const parent = parentId !== null ? idToLocationMap.get(parentId) : null;

      // Check if location and parent exist before updating the parent reference
      if (location) {
        await Location.updateOne({ _id: location._id }, { parent_id: parent ? parent._id : null });
      }
    }

    return "Locations stored and parent references assigned successfully!";;
  } catch (error) {
    throw error;
  }
}

function flattenLocationData(locationData, parentId = null) {
  let result = [];
  for (const item of locationData) {
    result.push({
      id: item.id,
      location_name: item.location_name,
      location_description: item.location_description || "",
      parentId: parentId !== null ? parentId : null,
    });
    if (item.subLocations && item.subLocations.length > 0) {
      result = result.concat(flattenLocationData(item.subLocations, item.id));
    }
  }
  return result;
}
async function processAndStoreSurvey(surveyData, user) {
  try {


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
async function processAndStoreAnswers(answerArray, questionId, questionType, survey) {
  // Fetch question type ID from QuestionController table based on the provided question type
  const questionTypeObject = await QuestionController.findOne({ type: questionType });
  const questionTypeId = questionTypeObject ? questionTypeObject._id : null;

  const answerIdsAndTexts = await Promise.all(answerArray.map(async answerText => {
    const newAnswer = new Answer({ answer: answerText.text, image: answerText.image, question_id: questionId, question_type: questionTypeId, survey_id: survey });
    const savedAnswer = await newAnswer.save();
    return { id: savedAnswer._id, text: answerText.text, answer_id: savedAnswer._id };
  }));

  return answerIdsAndTexts;
}
async function processAndStoreQuestions(questions, survey, department_id) {
  const storedQuestions = [];

  // Save questions without dependencies and child questions
  for (const questionData of questions) {
    const { id, question_title, answers, question_type, ...otherFields } = questionData;

    // Fetch question type ID from QuestionController table based on the provided question type
    const questionTypeObject = await QuestionController.findOne({ question_type: question_type });
    const questionTypeId = questionTypeObject ? questionTypeObject._id : null;

    const newQuestion = new Question({
      id,
      department_id: department_id,
      survey_id: survey,
      question_title,
      question_type: questionTypeId,
      ...otherFields,
    });

    const answerIdsAndTexts = await processAndStoreAnswers(answers, newQuestion._id, question_type, survey);
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

// Update the existing survey

router.put('/api/v1/updateSurvey', auth, async (req, res) => {
  try {
    let role = req.user.user_role;
    let surveyId = req.headers['survey_id'];

    if (role === 'admin') {
      const { updatedSurveyData, locationData, questionsUpdates } = req.body;

      // Update survey information
      const existingSurvey = await surveyModel.findOne({ _id: surveyId, active: 1 });

      if (!existingSurvey) {
        return res.status(404).json({ message: `Survey with ID ${surveyId} not found` });
      }

      // Update the survey information
      await surveyModel.updateOne({ _id: surveyId }, updatedSurveyData);

      // Update locations
      const updateLocations = async (locations, parentId = null) => {
        for (const location of locations) {
          const { id, location_name, description, children } = location;

          // Check if the provided location_id exists
          const existingLocation = await Location.findOne({ _id: id, active: 1, survey_id: surveyId });

          if (!existingLocation) {
            return res.status(404).json({ message: `Location with ID ${id} not found` });
          }

          // Update the location information
          await Location.updateOne({ _id: id }, {
            location_name,
            active: 1,
            location_description: description,
            parentId,
          });

          // Recursively update sub-locations
          if (children && children.length > 0) {
            await updateLocations(children, id);
          }
        }
      };

      await updateLocations(locationData);

      // Update questions
      for (const questionUpdate of questionsUpdates) {
        const { _id, question_title, active, required } = questionUpdate;

        // Check if the provided question_id exists
        const existingQuestion = await Question.findOne({ _id: _id, active: 1 });

        if (!existingQuestion) {
          return res.status(404).json({ message: `Question with ID ${_id} not found` });
        }

        // Update the question information
        await Question.updateOne({ _id: _id }, { question_title, active, required });
      }

      res.status(200).json({ message: 'Survey, locations, and questions updated successfully!' });
    } else {
      res.status(403).json({ message: 'Unauthorized access' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating survey, locations, and questions: ' + error.message });
  }
});

//Get the questions which is in the first phase
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
    }).populate({
      path: 'answers',
      model: 'answer',
      select: 'answer image'
    }).select('question_title answers');

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

//Get the questions according to the answers
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
      const responses = await Promise.all(eligibleQuestions.map(async (eligibleQuestion) => {
        const answer = await Answer.findOne({ question_id: eligibleQuestion._id }).select('image');
        return {
          child_id: eligibleQuestion._id,
          question_text: eligibleQuestion.question_title,
          phase: eligibleQuestion.phase,
          image: answer ? answer.image : null,
        };
      }));

      return res.json(responses);
    } else {
      return res.json({ message: 'No child questions found.' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.delete('/api/v1/deleteSurvey', auth, async (req, res) => {
  try {
    let role = req.user.user_role
    let survey_id = req.headers['survey_id']
    if (role == "admin") {
      let deleteSurvey = await surveyModel.findOneAndUpdate({ _id: survey_id, active: 1 }, { active: 0 })
      let deleteLocations = await Location.updateMany({ survey_id: survey_id, active: 1 }, { active: 0 })
      let deleteQuestions = await Question.updateMany({ survey_id: survey_id, active: 1 }, { active: 0 })
      let deleteAnswers = await Answer.updateMany({ survey_id: survey_id, active: 1 }, { active: 0 })
      res.json({ message: "The survey and it is data deleted successfully" })
    }
    else {
      res.json({ message: "sorry, you are unauthorized" })
    }
  } catch (error) {
    res.json({ message: "catch error " + error })
  }
})

router.get('/api/v1/getSurveyById', auth, async (req, res) => {
  try {
    const survey_id = req.headers['survey_id'];
    const userRole = req.user.user_role;

    if (userRole === "admin") {
      const survey = await surveyModel.findOne({ _id: survey_id, active: 1 }).populate({
        path:"company_id",
        select:"company_name"
      })
      .select('survey_title survey_description logo submission_pwd background_color question_text_color company_id');
       let company_name = survey.company_id.company_name
       let questions = await questionsModels.find({
        survey_id:survey_id,
        active:1
       })
      if (survey) {
        let response = {
          survey_title:survey.survey_title,
          survey_description:survey.survey_description,
          submission_pwd:survey.submission_pwd,
          background_color:survey.background_color,
          question_text_color:survey.question_text_color,
          logo :`${company_name}/${survey.logo}`
        }
        res.json({ message: response,questions});
      } else {
        res.json({ message: "The survey you are looking for does not exist" });
      }
    } else {
      res.status(403).json({ message: "Sorry, you are unauthorized" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

module.exports = router