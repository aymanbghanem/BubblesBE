const express = require("express");
const router = express.Router();
const _ = require('lodash');
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
const responseModel = require("../models/response.model");
const userModels = require("../models/user.models");
const departmentModels = require("../models/department.models");
const companyModels = require("../models/company.models");
const urlModel = require("../models/url.model");
const reportsModel = require("../models/reports.model");
const restricted_urlModel = require("../models/restricted_url.model");
const uuid = require('uuid');
require('dotenv').config()

router.post(`${process.env.BASE_URL}/createSurvey`, auth, async (req, res) => {
  let session;
  let storedSurvey, storedLocation, storedQuestions;

  try {
    const { location_data, survey, questions } = req.body;
    const role = req.user.user_role;
    const department = req.user.department_id;

    // Check if location_data and questions are not empty arrays
    if (!Array.isArray(location_data) || location_data.length === 0 || !Array.isArray(questions) || questions.length === 0) {
      return res.json({ message: 'Location data and questions cannot be empty arrays', type: 0 });
    }

    let departmentExist = await departmentModels.findOne({ _id: department, active: 1 });

    if (role !== 'admin') {
      return res.json({ message: 'Sorry, you are unauthorized', type: 0 });
    }

    if (departmentExist) {
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

      res.json({
        message: 'Survey, location, and questions added successfully',
        type: 1
      });
    } else {
      res.json({ message: "Cannot add surveys for an inactive department.", type: 0 });
    }
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

    res.status(500).json({ message:error.message,type:0 });
  }
});

async function rollbackQuestions(questions, session) {
  if (questions.length === 0) {
    return;
  }

  for (const question of questions) {
    try {
      await rollbackQuestion(question, session);
    } catch (error) {
      console.error('Error during rollbackQuestion in rollbackQuestions:', error);
    }
  }
}
async function rollbackQuestion(question, session) {
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
      id: String(item.id), // Convert the ID to a string
      location_name: item.location_name || item.textValue,
      location_description: item.location_description || "",
      parentId: parentId !== null ? String(parentId) : null, // Convert parent ID to a string if it exists
    });
    if (item.sublocations && item.sublocations.length > 0) {
      result = result.concat(flattenLocationData(item.sublocations, item.id));
    }
  }
  return result;
}
async function processAndStoreLocation(locationData, survey, user) {
  try {
    const department = user.department_id;

    const idToLocationMap = new Map();

    for (const flattenedLocation of flattenLocationData(locationData)) {
      const { id, location_name, textValue, location_description, parentId } = flattenedLocation;

      const location = new Location({
        location_name: location_name,
        department_id: department,
        id, // Use the string ID
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

    return "Locations stored and parent references assigned successfully!";
  } catch (error) {
    throw error;
  }
}
async function processAndStoreSurvey(surveyData, user) {
  try {


    let existingSurvey = await surveyModel.findOne({ survey_title: surveyData.survey_title, department_id: user.department_id });

    if (existingSurvey) {
      throw new Error("Survey with the same name already exists in the department");
    } else {
      // Create a new survey
      let survey = await surveyModel.create({
        survey_title: surveyData.survey_title,
        survey_description: surveyData.survey_description,
        logo: surveyData.logo,
        symbol_size: surveyData.symbol_size,
        department_id: user.department_id,
        created_by: user._id,
        company_id: user.company_id,
        background_color: surveyData.background_color,
        question_text_color: surveyData.question_text_color,
        submission_pwd: surveyData.submission_pwd,
        title_font_size: surveyData.title_font_size,
        description_font_size: surveyData.description_font_size,
        response_message: surveyData.response_message,
        restricted : surveyData.restricted,
        language : surveyData.language
      });

      return survey;
    }
  } catch (error) {
    throw error;
  }
}
async function processAndStoreAnswers(answerArray, questionId, questionType, survey_id) {
  // Fetch question type ID from QuestionController table based on the provided question type
  const questionTypeObject = await QuestionController.findOne({ question_type: questionType });
  const questionTypeId = questionTypeObject ? questionTypeObject._id : null;

  const answerIdsAndTexts = await Promise.all(answerArray.map(async answerText => {
    const newAnswer = new Answer({
      answer: answerText.text || answerText.answer,
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
async function processAndStoreQuestions(questionsData, survey_id, department_id) {
  const storedQuestions = [];

  for (const questionData of questionsData) {
    const { _id,drop_down ,id, comparisonOptions, flag, question_title, answers, question_type, ...otherFields } = questionData;

    // Case-insensitive lookup for question type
    const questionTypeObject = await QuestionController.findOne({
      question_type: new RegExp(`^${question_type}$`, 'i'),
    });
    const questionTypeId = questionTypeObject ? questionTypeObject._id : null;

    let newQuestion = new Question({
      id,
      flag,
      question_title,
      comparisonOptions,
      survey_id,
      department_id,
      question_type: questionTypeId,
      ...otherFields,
    });

    const questionTypeLowerCase = question_type.toLowerCase();

    if (["text", "single selection", "multiple selection", "range"].includes(questionTypeLowerCase)) {
      
      if (questionTypeLowerCase === "single selection") {
        newQuestion.drop_down = drop_down;
      }

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
  }

  return storedQuestions;
}

async function processAndStoreQuestionDependencies(dependencies, storedQuestions) {
  const updatedDependencies = [];

  for (const dependencyData of dependencies) {
    const { sign, comparisonOptions, flag, parent_dummy_id, related_answer, ...otherFields } = dependencyData; // Added related_answer field

    const correspondingQuestion = storedQuestions.find(question => question.id === parent_dummy_id);

    if (correspondingQuestion) {
      const newDependency = {
        ...otherFields,
        sign,
        flag,
        comparisonOptions,
        parent_id: correspondingQuestion._id,
        related_answer,
        parent_dummy_id: (correspondingQuestion.id).toString()
      };
      updatedDependencies.push(newDependency);
    } else {
      console.error(`Parent question with dummy id ${parent_dummy_id} not found.`);
    }
  }

  return updatedDependencies;
}


router.put(`${process.env.BASE_URL}/updateSurvey`, auth, async (req, res) => {
  let session;
  try {
    let role = req.user.user_role;
    let surveyId = req.headers['survey_id'];

    if (role === 'admin') {
      const { updatedSurveyData, locationData, questionsUpdates } = req.body;
      const department = req.user.department_id;

      // Check if locationData and questionsUpdates are arrays
      if (!Array.isArray(locationData) || locationData.length === 0 || !Array.isArray(questionsUpdates)|| questionsUpdates.length === 0) {
        return res.json({ message: 'locationData and questionsUpdates must be arrays', type: 0 });
      }

      // Check if the survey title is being updated
      if (updatedSurveyData.survey_title) {
        // Check if the new survey title already exists
        const existingSurveyWithNewTitle = await surveyModel.findOne({
          survey_title: updatedSurveyData.survey_title,
          _id: { $ne: surveyId }, // Exclude the current survey from the check
          department_id:department
        });

        if (existingSurveyWithNewTitle) {
          return res.json({ message: 'Survey title must be unique. Choose a different title.', type: 0 });
        }
      }

      // Start a MongoDB transaction
      session = await mongoose.startSession();
      session.startTransaction();

      // Update survey information
      const existingSurvey = await surveyModel.findOne({ _id: surveyId, active: 1,updated:1 });

      if (!existingSurvey) {
        
        return res.json({ error: 'Survey not found or cannot be updated.', type: 0 });

      }

      try {
        // Update survey data
        await surveyModel.updateOne(
          { _id: surveyId },
          {
            $set: {
              survey_title: updatedSurveyData.survey_title || existingSurvey.survey_title,
              survey_description: updatedSurveyData.survey_description || existingSurvey.survey_description,
              logo: updatedSurveyData.logo || existingSurvey.logo,
              question_text_color: updatedSurveyData.question_text_color || existingSurvey.question_text_color,
              submission_pwd: updatedSurveyData.submission_pwd || existingSurvey.submission_pwd,
              title_font_size: updatedSurveyData.title_font_size || existingSurvey.title_font_size,
              description_font_size: updatedSurveyData.description_font_size || existingSurvey.description_font_size,
              response_message: updatedSurveyData.response_message || existingSurvey.response_message,
              symbol_size : updatedSurveyData.symbol_size || existingSurvey.symbol_size,
              restricted:updatedSurveyData.restricted ,
              language : updatedSurveyData.language
            },
          }
        );

        // Soft delete existing locations related to the survey
        await Location.updateMany({ survey_id: surveyId}, { $set: { active: 0,deleted:1} });

        // Process and store new locations
        const storedLocations = await processAndStoreLocation(locationData, existingSurvey, req.user, session);

        // Process and store new questions
        await Question.updateMany({ survey_id: surveyId,}, { $set: { active: 0,deleted:1} });
        await Answer.updateMany({ survey_id: surveyId,}, { $set: { active: 0,deleted:1} });
        const storedQuestions = await processAndStoreQuestions(questionsUpdates, surveyId, department, session);

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.json({ message: 'Survey, locations, and questions updated successfully!', type: 1 });
      } catch (updateError) {
        // Rollback in case of an error during the update
        await session.abortTransaction();
        session.endSession();
        res.json({ message: 'Error updating survey, locations, and questions: ' + updateError.message });
      }
    } else {
      res.json({ message: 'Unauthorized access', type: 0 });
    }
  } catch (error) {
    // Rollback in case of an error before the update
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    res.status(500).json({ message: 'Error updating survey, locations, and questions: ' + error.message });
  }
});


router.post(`${process.env.BASE_URL}/getQuestions`, async (req, res) => {
  try {
    const results = [];
    let survey_id = req.query.survey_id;
    let location_id = req.query.location_id;
    let view  = req.headers['view']
    const { phase, answered_questions } = req.body; // Include location_id in the request body

    if (view == 1 ){
      const survey = await surveyModel.findOne({ _id: survey_id, active: 1 }).populate({
        path: "company_id",
        select: "company_name"
      })
        .select('survey_title language restricted response_message symbol_size survey_description logo title_font_size description_font_size submission_pwd background_color question_text_color company_id');
  
      if (!survey) {
        return res.json({ message: "Survey not found or is inactive.", type: 0 });
      } else {
        let company_name = survey.company_id.company_name;
           // Check if location_id is provided and the location check is required
        if (location_id) {
          const existingLocation = await locationModel.findOne({
            _id: location_id,
            survey_id: survey_id,
            active: 1,
          });
  
          if (!existingLocation) {
            return res.json({ message: "The location does not exist or is not active.", type: 0 });
          }
        }
        let surveyData = {
          survey_title: survey.survey_title,
          survey_description: survey.survey_description,
          title_font_size: survey.title_font_size,
          description_font_size: survey.description_font_size,
          background_color: survey.background_color,
          symbol_size: survey.symbol_size,
          question_text_color: survey.question_text_color,
          response_message: survey.response_message,
          logo: (survey.logo != "" && survey.logo != " ") ? `${company_name}/${survey.logo}` : " " || "",
          language : survey.language
        };
  
          if (phase == 1) {
  
            const firstPhaseQuestions = await Question.find({
              survey_id: survey_id,
              active: 1,
              phase: 1,
              question_dependency: []
            })
              .populate({
                path: 'answers',
                model: 'answer',
                select: 'answer image',
              })
              .populate({
                path: 'question_type',
                model: 'question_controller',
                select: 'question_type',
              })
              .select('question_title answers question_type required drop_down');
  
            if (!firstPhaseQuestions || firstPhaseQuestions.length === 0) {
              return res.status(404).json({ questions: [] });
            }
  
            // Flatten the question_type field
            const flattenedQuestions = firstPhaseQuestions.map(question => {
              return {
                _id: question._id,
                question_title: question.question_title,
                answers: question.answers,
                question_type: question.question_type.question_type,
                required: question.required,
                drop_down:question.drop_down
              };
            });
  
            return res.json({ questions: flattenedQuestions, surveyData, type: 2 });
          }
          else {
            let phaseQuestions = await Question.find({ survey_id: survey_id, phase: phase, active: 1 })
              .populate({
                path: 'answers',
                model: 'answer',
                select: 'answer image',
              })
              .populate({
                path: 'question_type',
                model: 'question_controller',
                select: 'question_type',
              })
            const responses = [];
            const maxPhase = await Question.findOne({ survey_id: survey_id, active: 1 })
              .sort({ phase: -1 }) // Sort in descending order of phase number
              .limit(1)
              .select('phase');
  
            let phaseNum = maxPhase.phase
  
            if (phase <= phaseNum) {
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
                    _id: question._id,
                    question_title: question.question_title,
                    phase: question.phase,
                    question_type: question.question_type ? question.question_type.question_type : null,
                    required: question.required,
                    drop_down:question.drop_down,
                    answers: question.answers.map(answer => ({
                      _id: answer._id,
                      answer: answer.answer,
                      image: answer.image,
                      
                    })),
  
                  });
                }
              }
  
              return res.json({ questions: responses, surveyData, type: 2 });
            }
            else {
              res.json({ message: "No more questions", type: 1 });
            }
          }
        }
    }
    else{
      const survey = await surveyModel.findOne({ _id: survey_id, active: 1 }).populate({
        path: "company_id",
        select: "company_name"
      })
        .select('survey_title language restricted response_message symbol_size survey_description logo title_font_size description_font_size submission_pwd background_color question_text_color company_id');
  
      if (!survey) {
        return res.json({ message: "Survey not found or is inactive.", type: 0 });
      } else {
        let company_name = survey.company_id.company_name;
           // Check if location_id is provided and the location check is required
        if (location_id) {
          const existingLocation = await locationModel.findOne({
            _id: location_id,
            survey_id: survey_id,
            active: 1,
          });
  
          if (!existingLocation) {
            return res.json({ message: "The location does not exist or is not active.", type: 0 });
          }
        }
        if (survey.restricted == 1){
          const encodedLink = decodeURIComponent(req.query.user_number);
          // Base64 decode the URL parameter
          const decodedString = Buffer.from(encodedLink, 'base64').toString('utf-8');
          // Split the decoded string if needed
          let user_link = decodedString
          let link = await restricted_urlModel.findOne({link:user_link})
          if(!link){
            return  res.json({message:"This link is not valid you need to upload file contain user's id's ",type:0})
          }
          else if(link.active == 0){
            return  res.json({message:"This link is not valid",type:0})
          }
        }
        let surveyData = {
          survey_title: survey.survey_title,
          survey_description: survey.survey_description,
          title_font_size: survey.title_font_size,
          description_font_size: survey.description_font_size,
          background_color: survey.background_color,
          symbol_size: survey.symbol_size,
          question_text_color: survey.question_text_color,
          response_message: survey.response_message,
          logo: (survey.logo != "" && survey.logo != " ") ? `${company_name}/${survey.logo}` : " " || "",
          language : survey.language
        };
  
          if (phase == 1) {
  
            const firstPhaseQuestions = await Question.find({
              survey_id: survey_id,
              active: 1,
              phase: 1,
              question_dependency: []
            })
              .populate({
                path: 'answers',
                model: 'answer',
                select: 'answer image',
              })
              .populate({
                path: 'question_type',
                model: 'question_controller',
                select: 'question_type',
              })
              .select('question_title answers question_type required drop_down');
  
            if (!firstPhaseQuestions || firstPhaseQuestions.length === 0) {
              return res.status(404).json({ questions: [] });
            }
  
            // Flatten the question_type field
            const flattenedQuestions = firstPhaseQuestions.map(question => {
              return {
                _id: question._id,
                question_title: question.question_title,
                answers: question.answers,
                question_type: question.question_type.question_type,
                required: question.required,
                drop_down:question.drop_down
              };
            });
  
            return res.json({ questions: flattenedQuestions, surveyData, type: 2 });
          }
          else {
            let phaseQuestions = await Question.find({ survey_id: survey_id, phase: phase, active: 1 })
              .populate({
                path: 'answers',
                model: 'answer',
                select: 'answer image',
              })
              .populate({
                path: 'question_type',
                model: 'question_controller',
                select: 'question_type',
              })
            const responses = [];
            const maxPhase = await Question.findOne({ survey_id: survey_id, active: 1 })
              .sort({ phase: -1 }) // Sort in descending order of phase number
              .limit(1)
              .select('phase');
  
            let phaseNum = maxPhase.phase
  
            if (phase <= phaseNum) {
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
                    _id: question._id,
                    question_title: question.question_title,
                    phase: question.phase,
                    question_type: question.question_type ? question.question_type.question_type : null,
                    required: question.required,
                    drop_down:question.drop_down,
                    answers: question.answers.map(answer => ({
                      _id: answer._id,
                      answer: answer.answer,
                      image: answer.image,
                      
                    })),
  
                  });
                }
              }
  
              return res.json({ questions: responses, surveyData, type: 2 });
            }
            else {
              res.json({ message: "No more questions", type: 1 });
            }
          }
        }
    }
  
  } catch (error) {
    console.error(error);
    return res.json({ message: 'Invalid link '+error,type:0 });
  }
});

async function checkDependencySatisfaction(dependency, answeredQuestions, results) {
  const parentQuestionId = dependency.parent_id.toString();
  const relatedAnswer = dependency.related_answer;
  const sign = dependency.sign;
  const flag = dependency.flag;

  const matchingAnsweredQuestion = answeredQuestions.find((answeredQuestion) => answeredQuestion._id === parentQuestionId);

  if (matchingAnsweredQuestion) {
    const parentQuestion = await Question.findById(parentQuestionId);

    if (parentQuestion && parentQuestion.question_type) {
      const questionTypeId = parentQuestion.question_type.toString();

      let type = await QuestionController.findOne({ _id: questionTypeId }).select('question_type -_id');

      if (type && type.question_type) {
        let parentQuestionType = type.question_type;

        if (parentQuestionType === 'Single selection' || parentQuestionType === 'Multiple selection') {
          return matchingAnsweredQuestion.answers.includes(relatedAnswer);
        } else if (parentQuestionType === 'Range') {
          let threshold = await Answer.findOne({ _id: parentQuestion.answers[0] }).select('answer -_id');
          threshold = threshold.answer;
          const thresholdAnswer = parseFloat(relatedAnswer);
          const userAnswer = parseFloat(matchingAnsweredQuestion.answers[0]);

          if (!isNaN(thresholdAnswer) && !isNaN(userAnswer)) {
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
  let overallSatisfied = true;
  let andResult = true;

  for (let i = 0; i < dependencies.length; i++) {
    const currentDependency = dependencies[i];
    const currentDependencySatisfied = await checkDependencySatisfaction(currentDependency, answeredQuestions, results);

    if (currentDependency.sign == "&") {
      // Special handling for "and" relation
      andResult = andResult && currentDependencySatisfied;
    } else if (currentDependency.sign == "or" || currentDependency.sign == null) {
      // "or" relation when sign is explicitly set to "or" or when it's null
      overallSatisfied = overallSatisfied || currentDependencySatisfied;

      // If the current dependency is satisfied, we can break out of the loop since "or" condition is met
      if (currentDependencySatisfied) {
        break;
      }
    }

    if (!currentDependencySatisfied && currentDependency.sign != "&") {
      // If any non-"and" dependency is not satisfied, set overall result to false
      overallSatisfied = false;
    }

    if (currentDependencySatisfied && currentDependency.question_type === 'Range') {
      const rangeSatisfied = await checkRangeDependency(currentDependency, answeredQuestions, results);
      overallSatisfied = overallSatisfied || rangeSatisfied;
    }
  }

  // Consider "and" conditions after processing all dependencies
  overallSatisfied = overallSatisfied && andResult;

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


router.delete(`${process.env.BASE_URL}/deleteSurvey`, auth, async (req, res) => {
  try {
    let role = req.user.user_role;
    let survey_id = req.headers['survey_id'];
    let active = req.headers['active']
    
    //  let { active } = req.body;
    let department_id = req.user.department_id;

    let survey = await surveyModel.findOne({ _id: survey_id }).select('company_id -_id');
    let department_exist = await departmentModels.findOne({_id:department_id,active:1})
    if(department_exist){
      if (role == "admin") {

        if (survey) {
          let deleteSurvey = await surveyModel.findOneAndUpdate(
              { _id: survey_id, company_id: req.user.company_id },
              { active: active, deleted: !(parseInt(active)) }
          );

          let deleteLocations = await Location.updateMany(
              { survey_id: survey_id,deleted:0 },
              { active: active}
          );

          let deleteQuestions = await Question.updateMany(
              { survey_id: survey_id,deleted:0},
              { active: active}
          );

          let deleteAnswers = await Answer.updateMany(
              { survey_id: survey_id,deleted:0},
              { active: active}
          );

          let surveyReader = await surveyReaderModel.updateMany(
              { survey_id: survey_id },
              { active: active }
          );

          let url = await urlModel.updateMany(
              { survey_id: survey_id },
              { active: active }
          );
          
          let report = await reportsModel.updateMany(
            { survey_id: survey_id },
            { active: active }
          )
          // let response = await responseModel.updateMany({ survey_id: survey._id }, { active:active })
        
          if (active == 1) {
              res.json({
                  message: "The survey and its data were activated successfully",
                  type: 1,
              });
          } else if (active == 0) {
              res.json({
                  message: "The survey and its data were deleted successfully",
                  type: 1,
              });
          } else {
              res.json({
                  message:
                      "Invalid value for 'active'. Please provide either 0 for deletion or 1 for activation.",
                  type: 0,
              });
          }
        }
        else {
          res.json({ message: "Survey not found", type: 0 });
        }
      } else {
        res.json({ message: "Unauthorized. Only admin users can perform this operation.", type: 0 });
      }
    }
    else{
      res.json({ message: "Survey linked to inactive department. Cannot complete process.", type: 0 });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
});

//get survey by id
router.get(`${process.env.BASE_URL}/getSurveyById`, auth, async (req, res) => {
  try {
    const survey_id = req.headers['survey_id'];
    const userRole = req.user.user_role;

    if (userRole === "admin" || userRole == "owner") {
      const survey = await surveyModel.findOne({ _id: survey_id, active: 1,deleted:0 }).populate([
        {
          path: "company_id",
          select: "company_name"
        }, {
          path: "created_by",
          select: "user_name"
        }
      ])
        .select('survey_title language restricted updated response_message symbol_size survey_description logo title_font_size description_font_size submission_pwd background_color question_text_color company_id');

      if (survey) {
        let company_name = survey.company_id.company_name;
        let created_by = survey.created_by.user_name;
        // Fetch locations
        const locations = await fetchLocations(survey_id);

        const questions = await Question.find({ survey_id: survey_id, active: 1,deleted:0 }).populate([
          {
            path: 'answers',
            model: 'answer',
            select: 'answer image'
          },
          {
            path: 'question_type',
            model: 'question_controller',
            select: 'question_type'
          }
        ]);

        const simplifiedQuestions = questions.map(question => {
          // Extract answer ID and text for each answer in the answers array
          const modifiedAnswers = question.answers.map(answer => ({
            answerID: answer._id,
            text: answer.answer,
            image: answer.image,
          
          }));
          const modifiedDependencies = question.question_dependency.map(dep => ({
            id: dep._id,
            parent_id: dep.parent_id,
            related_answer: dep.related_answer,
            question_title: dep.question_title,
            parent_dummy_id: dep.parent_dummy_id,
            flag: dep.flag,
            comparisonOptions: dep.comparisonOptions,
            sign: dep.sign
          }));
          return {
            ...question.toObject(),
            answers: modifiedAnswers, // Replace the existing answers array
            question_type: question.question_type.question_type,
            question_dependency: modifiedDependencies
          };
        });


        let response = {
          survey_title: survey.survey_title,
          survey_description: survey.survey_description,
          title_font_size: survey.title_font_size,
          description_font_size: survey.description_font_size,
          submission_pwd: survey.submission_pwd,
          background_color: survey.background_color,
          question_text_color: survey.question_text_color,
          created_by: created_by,
          symbol_size: survey.symbol_size,
          response_message: survey.response_message,
          logo: (survey.logo != "" && survey.logo != " ") ? `${company_name}/${survey.logo}` : " " || "",
          locations: buildTree(locations, null),
          questions: simplifiedQuestions,
          updated : survey.updated,
          updatedMessage : survey.updated == 1 ? "valid action":"sorry we can not complete this action" ,
          restricted:survey.restricted,
          language:survey.language
        };

         res.json({ message: response, type: 2 });
      } else {
        res.json({ message: "The survey you are looking for does not exist", type: 0 });
      }
    }
    else if (userRole == 'survey-reader') {

      let survey = await surveyReaderModel
        .findOne({ survey_id: survey_id, active: 1 })
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
            select: 'survey_title language restricted updated response_message symbol_size responses created_by active survey_description logo submission_pwd background_color question_text_color createdAt updatedAt',
          }
        ]);

      if (survey) {

        let company_name = survey.company_id.company_name;
        let created_by = survey.created_by.user_name;
        // Fetch locations
        const locations = await fetchLocations(survey_id);

        const questions = await Question.find({ survey_id: survey_id, active: 1,deleted:0 }).populate([
          {
            path: 'answers',
            model: 'answer',
            select: 'answer image'
          },
          {
            path: 'question_type',
            model: 'question_controller',
            select: 'question_type'
          }
        ]);

        const simplifiedQuestions = questions.map(question => {
          // Extract answer ID and text for each answer in the answers array
          const modifiedAnswers = question.answers.map(answer => ({
            answerID: answer._id,
            text: answer.answer,
            image: answer.image
          }));
          const modifiedDependencies = question.question_dependency.map(dep => ({
            id: dep._id,
            parent_id: dep.parent_id,
            related_answer: dep.related_answer,
            question_title: dep.question_title,
            parent_dummy_id: dep.parent_dummy_id
          }));
          return {
            ...question.toObject(),
            answers: modifiedAnswers, // Replace the existing answers array
            question_type: question.question_type.question_type,
            question_dependency: modifiedDependencies
          };
        });

        let response = {

          survey_title: survey.survey_id.survey_title,
          survey_description: survey.survey_id.survey_description,
          title_font_size: survey.survey_id.title_font_size,
          description_font_size: survey.survey_id.description_font_size,
          submission_pwd: survey.survey_id.submission_pwd,
          background_color: survey.survey_id.background_color,
          question_text_color: survey.survey_id.question_text_color,
          symbol_size: survey.survey_id.symbol_size,
          response_message: survey.response_message,
          created_by: created_by,
          logo: (survey.survey_id.logo != "" && survey.survey_id.logo != " ") ? `${company_name}/${survey.survey_id.logo}` : " " || "",
          locations: buildTree(locations, null),
          questions: simplifiedQuestions,
          updated : survey.survey_id.updated,
          updatedMessage : survey.survey_id.updated == 1 ? "valid action":"sorry we can not complete this action" ,
          restricted : survey.survey_id.restricted,
          language : survey.survey_id.language
        };

        res.json({ message: response, type: 2 });
      }
      else {
        res.json({ message: "The survey you are looking for does not exist", type: 0 });
      }

    }
    else {
      res.json({ message: "Sorry, you are unauthorized", type: 0 });
    }
  } catch (error) {
    res.json({ message: "Internal server error", error: error.message });
  }
});


//get survey according to the department 
router.get(`${process.env.BASE_URL}/getSurveys`, auth, async (req, res) => {
  try {
    let role = req.user.user_role
    let id = req.user._id
    let department_id = req.user.department_id
    let company_id = req.user.company_id
    if (role == 'admin') {
      let department_id = req.user.department_id;

      // Retrieve the surveys in the admin's department
      let department = await departmentModels.findOne({ _id: department_id, active: 1 })
      if (department) {
        let surveys = await surveyModel.find({ department_id: department_id }).populate([
          {
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
          },
        ]);

        // Flatten the data structure
        let flattenedSurveys = await Promise.all(
          surveys.map(async (item) => {
            // Filter responses for the current survey
            let surveyResponses = await responseModel
              .find({ survey_id: item._id, active: 1 })
              .distinct('user_id');

            // Count distinct user_id responses for the survey
            let responseCount = surveyResponses.length;

            return {
              _id: item._id,
              survey_title: item.survey_title,
              department_name: item.department_id.department_name, // Include department_name directly
              responses: responseCount,
              created_by: item.created_by.user_name,
              active: item.active,
              logo: item.company_id && item.logo !== "" ? `${item.company_id.company_name}/${item.logo}` : "",
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              updated : item.updated,
              updatedMessage : item.updated == 1 ? "valid action":"sorry we can not complete this action" ,
              restricted:item.restricted
            };
          })
        );

        if (flattenedSurveys.length > 0) {
          res.json({ message: flattenedSurveys, type: 2 });
        } else {
          res.json({ message: "No data found", type: 0 });
        }
      }
      else {
        res.json({ message: "Surveys not available for inactive department", type: 0 });
      }
    }

    else if (role == "survey-reader") {
      let department_id = req.user.department_id;
      let department = await departmentModels.findOne({ _id: department_id, active: 1 })
      if (department) {
        // Retrieve the surveys for the survey-reader
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
              select: 'survey_title restricted updated symbol_size responses created_by active survey_description logo submission_pwd background_color question_text_color createdAt updatedAt',
            }
          ]);

        let transformedSurveys = await Promise.all(surveys.map(async (item) => {
          // Filter responses for the current survey
          let surveyResponses = await responseModel
            .find({ survey_id: item.survey_id._id, active: 1 })
            .distinct('user_id');

          // Count distinct user_id responses for the survey
          let responseCount = surveyResponses.length;

          let created = await userModels.findOne({
            _id: item.survey_id.created_by
          }).select('user_name -_id');

          return {
            _id: item.survey_id._id,
            survey_title: item.survey_id.survey_title,
            department_name: item.department_id.department_name,
            responses: responseCount,
            created_by: created.user_name,
            active: item.survey_id.active,
            logo: (item.company_id && item.survey_id.logo !== "") ? `${item.company_id.company_name}/${item.survey_id.logo}` : "",
            createdAt: item.survey_id.createdAt,
            updatedAt: item.survey_id.updatedAt,
            updated : item.survey_id.updated,
            updatedMessage : item.survey_id.updated == 1 ? "valid action":"sorry we can not complete this action" ,
            restricted:item.survey_id.restricted
          };
        }));

        if (transformedSurveys.length > 0) {
          res.json({ message: transformedSurveys, type: 2 });
        } else {
          res.json({ message: "No data found", type: 0 });
        }
      }
      else {
        res.json({ message: "You are trying to get surveys for inactive department", type: 0 })
      }
    }

    else if (role == "owner") {
      // Retrieve the surveys for the owner
      let company = await companyModels.findOne({ _id: company_id })
      if (company) {
        let surveys = await surveyModel.find({ company_id: company_id }).populate(
          [{
            path: 'company_id',
            select: 'company_name -_id',
          },
          {
            path: 'created_by',
            select: 'user_name -_id',
          }
          ]
        );

        // Flatten the data structure
        let flattenedSurveys = await Promise.all(surveys.map(async (item) => {
          // Filter responses for the current survey
          let surveyResponses = await responseModel
            .find({ survey_id: item._id, active: 1 })
            .distinct('user_id');

          // Count distinct user_id responses for the survey
          let responseCount = surveyResponses.length;

          return {
            _id: item._id,
            survey_title: item.survey_title,
            responses: responseCount,
            created_by: item.created_by.user_name,
            active: item.active,
            logo: (item.company_id && item.logo !== "") ? `${item.company_id.company_name}/${item.logo}` : "",
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            updatedMessage : item.updated == 1 ? "valid action":"sorry we can not complete this action",
            updated : item.updated,
            restricted:item.restricted
          };
        }));

        if (flattenedSurveys.length > 0) {
          res.json({ message: flattenedSurveys, type: 2 });
        } else {
          res.json({ message: "No data found", type: 0 });
        }
      }
      else {
        res.json({ message: "You are trying to get surveys for inactive company", type: 0 })
      }
    }

    else {
      res.json({ message: "sorry, you are unauthorized", type: 0 })
    }
  } catch (error) {
    res.json({ message: "catch error " + error })
  }
});

// Helper function to fetch locations
async function fetchLocations(survey_id) {
  const locations = await locationModel.find({
    survey_id: survey_id,
    active: 1,
    deleted:0
  }).lean();
  return locations;
}
// Helper function to build the entire tree structure
function buildTree(locations, parentId) {
  const tree = [];

  locations.forEach(location => {
    if ((parentId === null && !location.parent_id) || (location.parent_id && location.parent_id.toString() === parentId)) {
      const sublocations = buildTree(locations, location._id.toString());
      const node = { ...location }; // Use spread operator to create a new object

      if (sublocations.length > 0) {
        node.sublocations = sublocations;
      }

      tree.push(node);
    }
  });

  return tree;
}
module.exports = router


