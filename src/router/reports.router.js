const express = require("express");
const router = express.Router();
const surveyModels = require("../models/survey.models");
const locationModels = require("../models/location.models");
const reportsModel = require("../models/reports.model");
const responseModel = require("../models/response.model")
const auth = require('../middleware/auth')


router.post('/api/v1/createReport', auth, async (req, res) => {
    try {
        let role = req.user.user_role
        let created_by = req.user._id
        let { survey_id, location_id, question_id, start_date, end_date, chart_type } = req.body
        if (role == 'admin' || role == 'owner' || role == 'survey-reader') {
            let surveyExist = await surveyModels.findOne({ _id: survey_id, active: 1 })
            if (surveyExist) {
                let locationExist = await locationModels.findOne({ _id: location_id, active: 1 })
                if (locationExist) {
                    let reportRecord = await reportsModel.create({
                        survey_id,
                        location_id,
                        question_id,
                        created_by,
                        company_id: surveyExist.company_id,
                        department_id: surveyExist.department_id,
                        start_date: start_date ? start_date : new Date(),
                        end_date: end_date ? end_date : new Date(),
                        chart_type,
                    })
                    if (reportRecord) {
                        res.json({ message: "Report successfully created", reportRecord })
                    }
                    else {
                        res.json({ message: "sorry,something wrong" })
                    }
                }
                else {
                    res.json({ message: "The location you are looking for does not exist" })
                }
            }
            else {
                res.json({ message: "The survey you are looking for does not exist" })
            }
        }
        else {
            res.json({ message: "sorry, you are unauthorized" })
        }
    } catch (error) {
        res.json({ message: "catch error " + error })
    }
})


router.get('/api/v1/getReport', auth, async (req, res) => {
    try {
        let role = req.user.user_role;
        let created_by = req.user._id
        if (role === "owner" || role == "admin" || role == "survey-reader") {
            let reports = await reportsModel.find({ created_by: created_by, active: 1 });

            if (reports.length > 0) {
                // Array to store the results with counts for each answer and additional information
                let resultArray = [];

                for (const report of reports) {
                    let startDateString = new Date(report.start_date).toISOString().split('T')[0];
                    let endDateString = new Date(report.end_date).toISOString().split('T')[0];

                    let responses = await responseModel.find({
                        survey_id: report.survey_id,
                        location_id: report.location_id,
                        question_id: report.question_id
                    });
                    // Filter responses based on date conditions
                    let filteredResponses = responses.filter(response => {
                        let createdAtDateOnly = new Date(response.createdAt).toISOString().split('T')[0];
                        return createdAtDateOnly >= startDateString && createdAtDateOnly <= endDateString;
                    });
                    if (filteredResponses.length > 0) {
                        // Count the responses for each answer and update the resultMap
                        let resultMap = new Map();
                        filteredResponses.forEach(response => {
                            let answer = response.user_answer;
                            resultMap.set(answer, (resultMap.get(answer) || 0) + 1);
                        });
                        // Convert resultMap to an array of objects for easier JSON serialization
                        let answerArray = Array.from(resultMap.entries()).map(([answer, count]) => ({ answer, count }));
                        // Add additional information like report ID and chart type
                        resultArray.push({
                            reportId: report._id, // assuming report has an _id field
                            chartType: report.chart_type,
                            answers: answerArray
                        });
                        // Your response structure
                        res.status(200).json({ resultArray });
                    }
                    else {
                        res.json({ message: "No data found" })
                    }
                }
            }
            else {
                res.json({ message: "No data found" })
            }
        } else {
            res.json({ message: "sorry, you are unauthorized" })
        }
    } catch (error) {
        console.error("Error:", error);
        res.json({ message: "catch error " + error });
    }
});


module.exports = router


//2023-12-27T13:14:30.941Z