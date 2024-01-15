const express = require("express");
const router = express.Router();
const surveyModels = require("../models/survey.models");
const locationModels = require("../models/location.models");
const reportsModel = require("../models/reports.model");
const responseModel = require("../models/response.model")
const auth = require('../middleware/auth');
const companyModels = require("../models/company.models");
const questionsModels = require("../models/questions.models");
const ExcelJS = require('exceljs');
const fs = require('fs');
const userModels = require("../models/user.models");
const departmentModels = require("../models/department.models");
const _ = require('lodash');
const notificationModel = require("../models/notification.model");
const path = require('path');

router.post('/api/v1/createReport', auth, async (req, res) => {
    try {
        let role = req.user.user_role
        let created_by = req.user._id
        let company_id = req.user.company_id
        let { survey_id, location_id, question_id, start_date, end_date, chart_type } = req.body

        let companyAccess = await companyModels.findOne({ _id: company_id, active: 1, dashboard: 1 })
        if (companyAccess) {
            if (role == 'admin' || role == 'owner' || role == 'survey-reader') {
                let surveyExist = await surveyModels.findOne({ _id: survey_id, active: 1 })
                if (surveyExist) {
                    if (location_id != null) {
                        let locationExist = await locationModels.findOne({ _id: location_id, active: 1 })
                        if (locationExist) {
                            let reportRecord = await reportsModel.create({
                                survey_id,
                                location_id,
                                question_id,
                                created_by,
                                company_id: surveyExist.company_id,
                                department_id: surveyExist.department_id,
                                start_date: start_date ? start_date : null,
                                end_date: end_date ? end_date : null,
                                chart_type,
                            })
                            if (reportRecord) {
                                res.json({ message: "Report successfully created", type: 1 })
                            }
                            else {
                                res.json({ message: "sorry,something wrong", type: 0 })
                            }
                        }
                        else {
                            res.json({ message: "The location you are looking for does not exist", type: 0 })
                        }
                    }
                    else {
                        let reportRecord = await reportsModel.create({
                            survey_id,
                            location_id,
                            question_id,
                            created_by,
                            company_id: surveyExist.company_id,
                            department_id: surveyExist.department_id,
                            start_date: start_date ? start_date : null,
                            end_date: end_date ? end_date : null,
                            chart_type,
                        })
                        if (reportRecord) {
                            res.json({ message: "Report successfully created", type: 1 })
                        }
                        else {
                            res.json({ message: "sorry,something wrong", type: 0 })
                        }
                    }

                }
                else {
                    res.json({ message: "The survey you are looking for does not exist", type: 0 })
                }
            }
            else {
                res.json({ message: "sorry, you are unauthorized", type: 0 })
            }
        }
        else {
            res.json({ message: "Apologies, but your company currently lacks the necessary access for this operation.", type: 0 });

        }
    } catch (error) {
        res.json({ message: "catch error " + error })
    }
})

router.get('/api/v1/getReport', auth, async (req, res) => {
    try {
        let role = req.user.user_role;
        let created_by = req.user._id;
        let count = 0;
        let location;
        if (role == "owner" || role == "survey-reader") {
            let reports = await reportsModel.find({ created_by, active: 1 });

            if (reports.length > 0) {
                // Array to store the results with counts for each answer and additional information
                let resultArray = [];

                for (const report of reports) {
                    let survey = await surveyModels.findOne({ _id: report.survey_id, active: 1 }).select('survey_title')
                    let question = await questionsModels.findOne({ _id: report.question_id, active: 1 }).select('question_title')
                    let startDateString = (report.start_date) ? new Date(report.start_date).toISOString().split('T')[0] : null;
                    let endDateString = (report.end_date) ? new Date(report.end_date).toISOString().split('T')[0] : null;

                    let responseQuery = {
                        survey_id: report.survey_id,
                        question_id: report.question_id,
                    };

                    if (report.location_id) {
                        responseQuery.location_id = report.location_id;
                        location = await locationModels.findOne({ _id: report.location_id, active: 1 }).select('location_name')
                    }

                    let responses = await responseModel.find(responseQuery);

                    let filteredResponses = responses.filter(response => {
                        let createdAtDateOnly = new Date(response.createdAt).toISOString().split('T')[0];
                        let responseDate = new Date(createdAtDateOnly);

                        // If startDateString is provided, check if the response date is greater than or equal to it
                        let isAfterStartDate = !startDateString || responseDate >= new Date(startDateString);

                        // If endDateString is provided, check if the response date is less than or equal to it
                        let isBeforeEndDate = !endDateString || responseDate <= new Date(endDateString);

                        return isAfterStartDate && isBeforeEndDate;
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
                            survey_title: survey.survey_title,
                            question_title: question.question_title ? question.question_title : "",
                            reportId: report._id, // assuming report has an _id field
                            chartType: report.chart_type,
                            answers: answerArray,
                            location_name: report.location_id ? location.location_name : ""
                        });
                    }
                    else {
                        // No matching responses, add default response data
                        resultArray.push({
                            survey_title: survey.survey_title,
                            question_title: question.question_title ? question.question_title : "",
                            reportId: report._id, // assuming report has an _id field
                            chartType: report.chart_type,
                            answers: [], // You can customize this as needed
                            location_name: report.location_id ? location.location_name : ""
                        });
                    }
                }

                res.json({ resultArray, type: 2 });
            } else {
                res.json({ message: "No data found", type: 0 });
            }
        }

        else if (role == 'superadmin') {
            let companyCount = await companyModels.countDocuments({ active: 1 });
            let surveyCount = await surveyModels.countDocuments({ active: 1 });
            let userCount = await userModels.countDocuments({ active: 1 })
            let locationCount = await locationModels.countDocuments({ active: 1 })
            let departmentCount = await departmentModels.countDocuments({ active: 1 })
            const activeCompanies = await companyModels.find({ active: 1 });

            let responses = await responseModel.find()

            if (responses) {
                // Group responses by user_id
                const groupedResponses = _.groupBy(responses, 'user_id');

                // Select only the first response for each user_id
                const uniqueResponses = _.map(groupedResponses, group => group[0]);

                // Transform the unique responses array
                count = uniqueResponses.length


            }
            let data = {
                company_count: companyCount,
                survey_count : surveyCount,
                 user_count: userCount,
                location_count: locationCount,
                department_count: departmentCount,
                response_count: count,
            }
            res.json({ message: data, type: 2 });
        }
        else if (role == "admin") {
            let reports = await reportsModel.find({ created_by, active: 1 });
            let notification_count = await notificationModel.countDocuments({ created_by, processed: 0 })
            let survey_count = await surveyModels.countDocuments({ created_by, active: 1 })
            let responses = await responseModel.find()

            if (responses) {
                // Group responses by user_id
                const groupedResponses = _.groupBy(responses, 'user_id');

                // Select only the first response for each user_id
                const uniqueResponses = _.map(groupedResponses, group => group[0]);

                // Transform the unique responses array
                count = uniqueResponses.length


            }
            if (reports.length > 0) {
                // Array to store the results with counts for each answer and additional information
                let resultArray = [];

                for (const report of reports) {
                    let survey = await surveyModels.findOne({ _id: report.survey_id, active: 1 }).select('survey_title')
                    let question = await questionsModels.findOne({ _id: report.question_id }).select('question_title')
                    let startDateString = (report.start_date) ? new Date(report.start_date).toISOString().split('T')[0] : null;
                    let endDateString = (report.end_date) ? new Date(report.end_date).toISOString().split('T')[0] : null;

                    let responseQuery = {
                        survey_id: report.survey_id,
                        question_id: report.question_id,
                    };

                    if (report.location_id) {
                        responseQuery.location_id = report.location_id;
                        location = await locationModels.findOne({ _id: report.location_id, active: 1 }).select('location_name')
                    }

                    let responses = await responseModel.find(responseQuery);

                    let filteredResponses = responses.filter(response => {
                        let createdAtDateOnly = new Date(response.createdAt).toISOString().split('T')[0];
                        let responseDate = new Date(createdAtDateOnly);

                        // If startDateString is provided, check if the response date is greater than or equal to it
                        let isAfterStartDate = !startDateString || responseDate >= new Date(startDateString);

                        // If endDateString is provided, check if the response date is less than or equal to it
                        let isBeforeEndDate = !endDateString || responseDate <= new Date(endDateString);

                        return isAfterStartDate && isBeforeEndDate;
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
                            survey_title: survey.survey_title,
                            question_title: question.question_title ? question.question_title : "",
                            reportId: report._id, // assuming report has an _id field
                            chartType: report.chart_type,
                            answers: answerArray,
                            location_name: report.location_id ? location.location_name : ""
                        });
                    }
                    else {
                        // No matching responses, add default response data
                        resultArray.push({
                            survey_title: survey.survey_title,
                            question_title: question.question_title ? question.question_title : "",
                            reportId: report._id, // assuming report has an _id field
                            chartType: report.chart_type,
                            answers: [], // You can customize this as needed
                            location_name: report.location_id ? location.location_name : ""
                        });
                    }
                }
                let data = {
                    notification_count: notification_count,
                    response_count: count,
                    survey_count: survey_count,
                }
                res.json({ message:data,resultArray, type: 2 });
            }


            else {
                let data = {
                    notification_count: notification_count,
                    response_count: count,
                    survey_count: survey_count,
                }
                res.json({ message:data, type: 2 });
            }
        }
        else {
            res.json({ message: "Sorry, you are unauthorized", type: 0 });
        }
    } catch (error) {
        //console.error("Error:", error);
        res.json({ message: "Catch error: " + error });
    }
});

router.put('/api/v1/deleteReport', auth, async (req, res) => {
    try {
        let role = req.user.user_role
        let report_id = req.headers['report_id']
        if (role == 'admin' || role == 'owner' || role == 'survey-reader') {
            let report = await reportsModel.updateOne({ _id: report_id, active: 1 }, { active: 0 })

            if (report) {
                res.json({ message: "The report sucssfully deleted", type: 1 })
            }
            else {
                res.json({ message: "Report not found for deletion", type: 0 });
            }
        }
        else {
            res.json({ message: "sorry, you are unauthorized", type: 0 })
        }
    } catch (error) {
        res.json({ message: "catch error " + error })
    }
})

function getDynamicFileName() {
    let randomFraction = Math.random() * 1000;

    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    return `responses_${timestamp}_${randomFraction}.xlsx`;
}

router.get('/api/v1/exportReport',auth, async (req, res) => {
    try {
          let role = req.user.user_role;
        if (role === 'admin' || role == 'survey-reader') {
          let department_id = req.user.department_id;

        let responses = await responseModel.find({ department_id, active: 1 }).populate([
            {
                path: 'survey_id',
                model: 'survey',
                select: 'survey_title -_id'
            },
            {
                path: 'question_id',
                model: 'question',
                select: 'question_title  -_id'
            },
            {
                path: 'location_id',
                model: 'location',
                select: 'location_name -_id'
            },
        ]).select('user_answer createdAt question_type active user_id');

        if (responses && responses.length > 0) {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Responses');

            // Add headers to the worksheet
            worksheet.columns = [
                { header: 'Survey title', key: 'survey_title', width: 30, alignment: { vertical: 'center' } },
                { header: 'Location name', key: 'location_name', width: 30, alignment: { vertical: 'center' } },
                { header: 'Question title', key: 'question_title', width: 50, alignment: { vertical: 'center' } },
                { header: 'Question type', key: 'question_type', width: 20, alignment: { vertical: 'center' } },
                { header: 'User answer', key: 'user_answer', width: 30, alignment: { vertical: 'center' } },
                { header: 'Created at', key: 'createdAt', width: 20, alignment: { vertical: 'center' } },
                { header: 'User ID', key: 'user_id', width: 40, alignment: { vertical: 'center' } },
            ];
            worksheet.getRow(1).font = { bold: true, size: 12};
         
            // Add data to the worksheet
            responses.forEach(response => {
                const formattedResponse = {
                    _id: response._id,
                    survey_title: response.survey_id.survey_title,
                    location_name: response.location_id.location_name,
                    createdAt: response.createdAt,
                    user_id: response.user_id,
                    user_answer: response.user_answer,
                    question_title: response.question_id.question_title,
                    question_type: response.question_type
                };

                const row = worksheet.addRow(formattedResponse);
                row.eachCell({ includeEmpty: true }, cell => {
                    cell.alignment = { vertical: 'center' };
                });
            });

            const dynamicFileName = getDynamicFileName();

            // Resolve the dynamic file path based on the current working directory
            const filePath = path.resolve(__dirname, '..', '..', 'report', dynamicFileName);

            // Save the workbook to a file with the dynamic name
            await workbook.xlsx.writeFile(filePath);

            // Set headers for file download
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${dynamicFileName}`);

            // Send the file to the front end
            res.sendFile(filePath, (err) => {
                // Delete the file after sending
                fs.unlinkSync(filePath);
                if (err) {
                    res.json({ message: "Error sending file: " + err });
                }
            });
        }
        else {
            res.json({ message: "No data found", type: 0 });
        }
        }
    } catch (error) {
        res.json({ message: "Catch error " + error });
    }
});

module.exports = router


//2023-12-27T13:14:30.941Z