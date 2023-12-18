const express = require("express");
const router = express.Router();

const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
const surveyModel = require('../models/survey.models')
const surveyReaderModel = require("../models/surveyReader.model");
const Question = require("../models/questions.models");
const Answer = require("../models/answers.model")
const QuestionController = require('../models/questions_controller.models')
const Location = require("../../src/models/location.models");
const locationModel = require("../../src/models/location.models");
const questionsModels = require("../models/questions.models");
const Response = require("../models/response.model")
const mongoose = require('mongoose');
const questions_controllerModels = require("../models/questions_controller.models");
require('dotenv').config()

// Create new survey 
router.post('/api/v1/createSurvey', auth, async (req, res) => {
  let session;
  let storedSurvey, storedLocation, storedQuestions;

  try {
    const { location_data, survey, location, questions } = req.body;
    const role = req.user.user_role;
    const department = req.user.department_id;

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Sorry, you are unauthorized' });
    }

    // Start a MongoDB transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Process and store survey
    storedSurvey = await processAndStoreSurvey(survey, req.user, session);

    // Process and store questions with the survey ID
    storedQuestions = await processAndStoreQuestions(questions, storedSurvey._id, department, session);

    // Process and store location
    storedLocation = await processAndStoreLocation(location_data, storedSurvey, req.user, session);

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: 'Survey, location, and questions added successfully',
      survey: storedSurvey,
      location: storedLocation,
      questions: storedQuestions,
    });
  } catch (error) {
    // Rollback in case of an error
    try {
       
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      if (storedQuestions) {

        await rollbackQuestions(storedQuestions);

      }
      if (storedLocation) {
        await rollbackLocation(storedLocation);
      }
      if (storedSurvey) {
        await rollbackSurvey(storedSurvey);
      }
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError);
    }

    res.status(500).json({ message: 'Error: ' + error.message });
  }
});

// Rest of the code remains unchanged...

async function rollbackQuestions(questions, session) {
  console.log('Inside rollbackQuestions');
  console.log('Number of questions in rollbackQuestions:', questions.length);

  if (questions.length === 0) {
    console.log('No questions to rollback in rollbackQuestions');
    return;
  }

  for (const question of questions) {
    console.log('Processing question in rollbackQuestions:', question._id);

    try {
      await rollbackQuestion(question, session);
      console.log('Question rolled back successfully in rollbackQuestions');
    } catch (error) {
      console.error('Error during rollbackQuestion in rollbackQuestions:', error);
    }
  }

  console.log('After rollbackQuestions');
}
async function rollbackQuestion(question, session) {
  console.log('Before rollbackQuestion');
  console.log('Question ID:', question._id);

  try {
    // Fetch the associated answers before deleting the question
    const answers = await Answer.find({ question_id: question._id }).session(session);

    // Log the answers for debugging purposes
    console.log('Answers to delete:', answers);

    // Delete the answers
    await Answer.deleteMany({ question_id: question._id }).session(session);

    // Delete the question
    await Question.deleteOne({ _id: question._id }).session(session);

    // If the question is associated with a survey, delete the related answers
    if (question.survey_id) {
      for (const answer of answers) {
        await Answer.deleteOne({ _id: answer._id, survey_id: question.survey_id }).session(session);
      }
    }

    console.log('After rollbackQuestion');
  } catch (error) {
    console.error('Error during rollbackQuestion:', error);
    throw error; // Re-throw the error to ensure it's captured in the higher-level catch block
  }
}
async function rollbackSurvey(survey, session) {
  await Question.deleteMany({ survey_id: survey._id }).session(session);
  await surveyModel.deleteOne({ _id: survey._id }).session(session);
}
async function rollbackLocation(location, session) {
  await Location.deleteOne({ _id: location._id }).session(session);
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
async function processAndStoreAnswers(answerArray, questionId, questionType, survey_id) {
  // Fetch question type ID from QuestionController table based on the provided question type
  const questionTypeObject = await QuestionController.findOne({ question_type: questionType });
  const questionTypeId = questionTypeObject ? questionTypeObject._id : null;

  const answerIdsAndTexts = await Promise.all(answerArray.map(async answerText => {
    const newAnswer = new Answer({
      answer: answerText.text,
      image: answerText.image,
      question_id: questionId,
      survey_id: survey_id,
      question_type: questionTypeId,
    });
    const savedAnswer = await newAnswer.save();
    return { id: savedAnswer._id, text: answerText.text, answer_id: savedAnswer._id };
  }));

  return answerIdsAndTexts;
}
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
async function processAndStoreQuestions(questionsData, survey_id, department_id) {
  const storedQuestions = [];

  for (const questionData of questionsData) {
    const { id, flag, question_title, answers, question_type, ...otherFields } = questionData;

    // Case-insensitive lookup for question type
    const questionTypeObject = await QuestionController.findOne({
      question_type: new RegExp(`^${question_type}$`, 'i'),
    });
    const questionTypeId = questionTypeObject ? questionTypeObject._id : null;

    const newQuestion = new Question({
      id,
      flag,
      question_title,
      survey_id,
      department_id,
      question_type: questionTypeId,
      ...otherFields,
    });

    const questionTypeLowerCase = question_type.toLowerCase();

    if (["text", "single choice", "multiple choice", "range"].includes(questionTypeLowerCase)) {
      const questionController = await QuestionController.findOne({
        question_type: new RegExp(`^${question_type}$`, 'i'),
      });

      if (!questionController) {
        throw new Error(`Question type "${question_type}" not found in question_controller`);
      }

      // Process and store answers only if the question type is not "text"
      if (questionTypeLowerCase !== "text") {
        const answerIdsAndTexts = await processAndStoreAnswers(answers, newQuestion._id, questionTypeLowerCase, survey_id);
        newQuestion.answers = answerIdsAndTexts.map((answerData) => answerData.id);
      }
    } else {
      throw new Error(`Unsupported question type: ${question_type}`);
    }

    const savedQuestion = await newQuestion.save();
    storedQuestions.push(savedQuestion);
  }

  for (const savedQuestion of storedQuestions) {
    const { id, child_questions, question_dependency } = questionsData.find((q) => q.id === savedQuestion.id);

    if (question_dependency && Array.isArray(question_dependency)) {
      savedQuestion.question_dependency = await processAndStoreQuestionDependencies(
        question_dependency,
        storedQuestions
      );
      await savedQuestion.save();
    }

    if (child_questions && Array.isArray(child_questions)) {
      savedQuestion.child_questions = await processAndStoreChildQuestions(child_questions, storedQuestions);
      await savedQuestion.save();
    }
  }

  return storedQuestions;
}
async function processAndStoreQuestionDependencies(dependencies, storedQuestions) {
  const updatedDependencies = [];

  for (const dependencyData of dependencies) {
    const { sign, flag, parent_dummy_id, related_answer, ...otherFields } = dependencyData; // Added related_answer field

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
        try {
          for (const location of locations) {
            const {
              _id,
              location_name,
              active,
              department_id, // Added department_id field
              location_description,
              children,
            } = location;

            // Check if the provided location_id exists
            const existingLocation = await Location.findOne({
              _id: _id,
              active: 1,
              survey_id: surveyId,
            });

            if (!existingLocation) {
              return res.status(404).json({ message: `Location with ID ${_id} not found` });
            }

            // Update the location information
            await Location.updateOne(
              { _id: _id },
              {
                location_name,
                active,
                location_description,
                parentId,
                department_id, // Added department_id field
              }
            );

            // Recursively update sub-locations
            if (children && children.length > 0) {
              await updateLocations(children, _id);
            }
          }

          return true; // Return true to indicate successful update
        } catch (error) {
          throw error; // Throw error to be caught by the calling function
        }
      };

      // Call the modified updateLocations function
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

//get questions from the specific phase
router.post('/api/v1/getQuestions', async (req, res) => {
  try {
    const results = [];
    const { phase, answered_questions } = req.body;

    let phaseQuestions = await Question.find({ phase: phase, active: 1 });

    const responses = [];

    for (const question of phaseQuestions) {
      let dependenciesSatisfied = true;

      if (question.question_dependency && question.question_dependency.length > 0) {
        if (question.question_dependency.length === 1) {
          // Keep the existing logic for a single dependency
          const dependency = question.question_dependency[0];
          const isDependencySatisfied = await checkDependencySatisfaction(dependency, answered_questions, results);

          if (!isDependencySatisfied) {
            dependenciesSatisfied = false;
          }
        } else {
          // New logic for multiple dependencies
          const isMultipleDependenciesSatisfied = await checkMultipleDependenciesSatisfaction(question.question_dependency, answered_questions, results);

          if (!isMultipleDependenciesSatisfied) {
            dependenciesSatisfied = false;
          }
        }
      }

      if (dependenciesSatisfied) {
        responses.push({
          child_id: question._id,
          question_text: question.question_title,
          phase: question.phase,
          // Add other necessary fields
        });
      }
    }

    // Send the response after processing all questions
    return res.json(responses);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

async function checkDependencySatisfaction(dependency, answeredQuestions, results) {
  const parentQuestionId = dependency.parent_id.toString();
  const relatedAnswer = dependency.related_answer;
  const sign = dependency.sign;
  const flag = dependency.flag; // Corrected line

  const matchingAnsweredQuestion = answeredQuestions.find((answeredQuestion) => answeredQuestion._id === parentQuestionId);

  if (matchingAnsweredQuestion) {
    const parentQuestion = await Question.findById(parentQuestionId);

    if (parentQuestion && parentQuestion.question_type) {
      const questionTypeId = parentQuestion.question_type.toString();

      let type = await QuestionController.findOne({ _id: questionTypeId }).select('question_type -_id');

      if (type && type.question_type) {
        let parentQuestionType = type.question_type;

        if (parentQuestionType === 'Single choice') {
          return matchingAnsweredQuestion.answers.includes(relatedAnswer);
        } else if (parentQuestionType === 'Range') {
          let threshold = await Answer.findOne({ _id: parentQuestion.answers[0] }).select('answer -_id');
          threshold = threshold.answer;
          const thresholdAnswer = parseFloat(threshold);
          const userAnswer = parseFloat(matchingAnsweredQuestion.answers[0]);

          if (!isNaN(thresholdAnswer) && !isNaN(userAnswer)) {
            // Use the correct variable "flag" instead of "question.flag"
            if (flag === 1) {
              return userAnswer >= parseFloat(thresholdAnswer);
            } else if (flag === -1) {
              return userAnswer <= parseFloat(thresholdAnswer);
            } else if (flag === 0) {
              return userAnswer === parseFloat(thresholdAnswer);
            } else if (flag === -2) {
              return userAnswer < parseFloat(thresholdAnswer);
            } else if (flag === 2) {
              return userAnswer > parseFloat(thresholdAnswer);
            }
          }
        }
      }
    }
  }

  return false;
}
async function checkMultipleDependenciesSatisfaction(dependencies, answeredQuestions, results) {
  let overallSatisfied = false;

  for (let i = 0; i < dependencies.length; i++) {
    const currentDependency = dependencies[i];
    const currentDependencySatisfied = await checkDependencySatisfaction(currentDependency, answeredQuestions, results);

    if (currentDependency.sign === "&") {
      // Special handling for "and" relation
      const nextDependency = dependencies[i + 1];

      if (nextDependency) {
        const nextDependencySatisfied = await checkDependencySatisfaction(nextDependency, answeredQuestions, results);

        // Apply "and" operation only between the current and the next dependency
        const andResult = currentDependencySatisfied && nextDependencySatisfied;

        // If the current dependency is not satisfied, set overall result to false
        overallSatisfied = overallSatisfied || andResult;

        // Skip the next dependency since it's already processed
        i++;
      }
    } else if (currentDependency.sign === "or" || currentDependency.sign === null) {
      // "or" relation when sign is explicitly set to "or" or when it's null
      overallSatisfied = overallSatisfied || currentDependencySatisfied;

      // If the current dependency is satisfied, we can break out of the loop since "or" condition is met
      if (currentDependencySatisfied) {
        break;
      }
    }

    if (!currentDependencySatisfied && currentDependency.sign !== "&") {
      // If any non-"and" dependency is not satisfied, set overall result to false
      overallSatisfied = false;
    }

    if (currentDependencySatisfied && currentDependency.question_type === 'Range') {
      const rangeSatisfied = await checkRangeDependency(currentDependency, answeredQuestions, results);
      overallSatisfied = overallSatisfied || rangeSatisfied;
    }
  }

  return overallSatisfied;
}
async function checkRangeDependency(dependency, answeredQuestions, results) {
  // Implement the logic for "Range" type dependencies
  // You can use a similar approach as in checkDependencySatisfaction for "Range" type
  const parentQuestionId = dependency.parent_id.toString();
  const threshold = await Answer.findOne({ _id: parentQuestion.answers[0] }).select('answer -_id');
  const thresholdAnswer = parseFloat(threshold.answer);
  const userAnswer = parseFloat(answeredQuestions.find(question => question._id === parentQuestionId).answers[0]);

  if (!isNaN(thresholdAnswer) && !isNaN(userAnswer)) {
    const flag = dependency.flag;

    if (flag === 1) {
      return userAnswer >= parseFloat(thresholdAnswer);
    } else if (flag === -1) {
      return userAnswer <= parseFloat(thresholdAnswer);
    } else if (flag === 0) {
      return userAnswer === parseFloat(thresholdAnswer);
    } else if (flag === -2) {
      return userAnswer < parseFloat(thresholdAnswer);
    } else if (flag === 2) {
      return userAnswer > parseFloat(thresholdAnswer);
    }
  }

  return false;
}

//delete survey
router.delete('/api/v1/deleteSurvey', auth, async (req, res) => {
  try {
    let role = req.user.user_role
    let survey_id = req.headers['survey_id']
    if (role == "admin") {
      let deleteSurvey = await surveyModel.findOneAndUpdate({ _id: survey_id, active: 1 }, { active: 0 })
      let deleteLocations = await Location.updateMany({ survey_id: survey_id, active: 1 }, { active: 0 })
      let deleteQuestions = await Question.updateMany({ survey_id: survey_id, active: 1 }, { active: 0 })
      let deleteAnswers = await Answer.updateMany({ survey_id: survey_id, active: 1 }, { active: 0 })
      let surveyReader = await surveyReaderModel.updateMany({ survey_id: survey_id, active: 1 }, { active: 0 })
      res.json({ message: "The survey and it is data deleted successfully" })
    }
    else {
      res.json({ message: "sorry, you are unauthorized" })
    }
  } catch (error) {
    res.json({ message: "catch error " + error })
  }
})

//get survey by id
router.get('/api/v1/getSurveyById', auth, async (req, res) => {
  try {
    const survey_id = req.headers['survey_id'];
    const userRole = req.user.user_role;

    if (userRole === "admin") {
      const survey = await surveyModel.findOne({ _id: survey_id, active: 1 }).populate({
        path: "company_id",
        select: "company_name"
      })
        .select('survey_title survey_description logo submission_pwd background_color question_text_color company_id');


      if (survey) {
        let company_name = survey.company_id.company_name;
        // Fetch locations
        const locations = await fetchLocations(survey_id);
        const questions = await Question.find({ survey_id: survey_id, active: 1 }).populate({
          path: 'answers',
          model: 'answer',
          select: 'answer image'
        })
        let response = {
          survey_title: survey.survey_title,
          survey_description: survey.survey_description,
          submission_pwd: survey.submission_pwd,
          background_color: survey.background_color,
          question_text_color: survey.question_text_color,
          logo: `${company_name}/${survey.logo}`,
          locations: buildTree(locations, null),
          questions: questions
        };

        res.json({ message: response });
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

//get survey according to the department 
router.get('/api/v1/getSurveys', auth, async (req, res) => {
  try {
    let role = req.user.user_role
    let id = req.user._id
    let department_id = req.user.department_id
    if (role == "admin") {
      // Retrieve the surveys in the admin's department
      let surveys = await surveyModel.find({ department_id: department_id, active: 1 }).populate(
        [{
          path: 'company_id',
          select: 'company_name -_id',
        },
        {
          path: 'department_id',
          select: 'department_name',
        },
        {
          path: 'created_by',
          select: 'user_name -_id',
        }
        ]
      )

      // Flatten the data structure
      let flattenedSurveys = surveys.map(item => {
        return {
          _id: item._id,
          survey_title: item.survey_title,
          department_name: item.department_id.department_name, // Include department_name directly
          responses: item.responses,
          created_by: item.created_by.user_name,
          active: item.active,
          survey_description: item.survey_description,
          //item.company_id && item.logo != "" ? `${item.company_id.company_name}/${item.logo}` : ""
          logo: item.company_id && item.logo != "" ? `${item.company_id.company_name}/${item.logo}` : "",
          submission_pwd: item.submission_pwd,
          background_color: item.background_color,
          question_text_color: item.question_text_color,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          __v: item.__v
        };
      });

      if (flattenedSurveys.length > 0) {
        res.json({ message: flattenedSurveys });
      } else {
        res.json({ message: "No data found" });
      }
    } 
    else if (role == "survey-reader") {
      let surveys = await surveyReaderModel
      .find({ department_id: department_id, reader_id: req.user._id, active: 1 })
      .populate([
        {
          path: 'company_id',
          select: 'company_name -_id',
        },
        {
          path: 'department_id',
          select: 'department_name',
        },
        {
          path: 'reader_id',
          select: 'user_name -_id',
        },
        {
          path: 'survey_id',
          select: 'survey_title responses created_by active survey_description logo submission_pwd background_color question_text_color createdAt updatedAt',
        }
      ]);

    // Transform the data structure
    let transformedSurveys = surveys.map(item => {
      return {
        _id: item.survey_id._id,
        survey_title: item.survey_id.survey_title,
        department_name: item.department_id.department_name,
        responses: item.survey_id.responses,
        created_by: item.survey_id.created_by.user_name,
        active: item.survey_id.active,
        survey_description: item.survey_id.survey_description,
        logo: item.company_id && item.survey_id.logo != "" ? `${item.company_id.company_name}/${item.survey_id.logo}` : "",
        submission_pwd: item.survey_id.submission_pwd,
        background_color: item.survey_id.background_color,
        question_text_color: item.survey_id.question_text_color,
        createdAt: item.survey_id.createdAt,
        updatedAt: item.survey_id.updatedAt,
      };
    });

    if (transformedSurveys.length > 0) {
      res.json({ message: transformedSurveys });
    } else {
      res.json({ message: "No data found" });
    }

     
    } else {
      res.json({ message: "sorry, you are unauthorized" })
    }
  } catch (error) {
    res.json({ message: "catch error " + error })
  }
});

// Helper function to fetch locations
async function fetchLocations(survey_id) {
  const locations = await locationModel.find({
    survey_id: survey_id,
    active: 1
  }).lean();
  return locations;
}
// Helper function to build the entire tree structure
function buildTree(locations, parentId) {
  const tree = [];

  locations.forEach(location => {
    if ((parentId === null && !location.parent_id) || (location.parent_id && location.parent_id.toString() === parentId)) {
      const children = buildTree(locations, location._id.toString());
      const node = { ...location }; // Use spread operator to create a new object

      if (children.length > 0) {
        node.children = children;
      }

      tree.push(node);
    }
  });

  return tree;
}


module.exports = router


