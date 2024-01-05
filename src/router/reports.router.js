const express = require("express");
const router = express.Router();
const surveyModels = require("../models/survey.models");
const locationModels = require("../models/location.models");
const reportsModel = require("../models/reports.model");
const responseModel = require("../models/response.model")
const auth = require('../middleware/auth');
const companyModels = require("../models/company.models");
const questionsModels = require("../models/questions.models");


router.post('/api/v1/createReport', auth, async (req, res) => {
    try {
        let role = req.user.user_role
        let created_by = req.user._id
        let { survey_id, location_id, question_id, start_date, end_date, chart_type } = req.body
        
        if (role == 'admin' || role == 'owner' || role == 'survey-reader') {
            let surveyExist = await surveyModels.findOne({ _id: survey_id, active: 1 })
            if (surveyExist) {
                if(location_id!=null){
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
                else{
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
                            res.json({ message: "Report successfully created", reportRecord })
                        }
                        else {
                            res.json({ message: "sorry,something wrong" })
                        }
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
        let created_by = req.user._id;

        if (role == "owner" || role == "admin" || role == "survey-reader") {
            let reports = await reportsModel.find({ created_by, active: 1 });

            if (reports.length > 0) {
                // Array to store the results with counts for each answer and additional information
                let resultArray = [];

                for (const report of reports) {
                    let survey = await surveyModels.findOne({ _id:report.survey_id,active:1}).select('survey_title')
                    let question = await questionsModels.findOne({_id:report.question_id,active:1}).select('question_title')
                    let startDateString = new Date(report.start_date).toISOString().split('T')[0];
                    let endDateString = new Date(report.end_date).toISOString().split('T')[0];

                    let responseQuery = {
                        survey_id: report.survey_id,
                        question_id: report.question_id,
                    };

                    if (report.location_id) {
                        responseQuery.location_id = report.location_id;
                    }

                    let responses = await responseModel.find(responseQuery);

                    // Filter responses based on date conditions
                    let filteredResponses = responses.filter(response => {
                        let createdAtDateOnly = new Date(response.createdAt).toISOString().split('T')[0];
                        return createdAtDateOnly >= startDateString && createdAtDateOnly <= endDateString;
                    });

                    if (filteredResponses.length > 0) {
                        // Count the responses for each answer and update the resultMap
                        console.log(filteredResponses)
                        let resultMap = new Map();
                        filteredResponses.forEach(response => {
                            let answer = response.user_answer;
                            resultMap.set(answer, (resultMap.get(answer) || 0) + 1);
                        });

                        // Convert resultMap to an array of objects for easier JSON serialization
                        let answerArray = Array.from(resultMap.entries()).map(([answer, count]) => ({ answer, count }));

                        // Add additional information like report ID and chart type
                        resultArray.push({
                            survey_title:survey.survey_title,
                            question_title:question.question_title,
                            reportId: report._id, // assuming report has an _id field
                            chartType: report.chart_type,
                            answers: answerArray,
                        });
                    }
                }

                // Your response structure
                res.status(200).json({ resultArray });
            } else {
                res.json({ message: "No data found" });
            }
        } else if (role == 'superadmin') {
            let companyCount = await companyModels.countDocuments({ active: 1 });
            let surveyCount = await surveyModels.countDocuments({ active: 1 });
            const activeCompanies = await companyModels.find({ active: 1 });

            const companySurveyCounts = new Map();

            for (const company of activeCompanies) {
                const surveyCount = await surveyModels.countDocuments({ company_id: company._id, active: 1 });
                companySurveyCounts.set(company.company_name, surveyCount);
            }

            const result = Array.from(companySurveyCounts).map(([company_name, surveys]) => ({
                company_name,
                surveys
            }));

            res.json({ "company_count": companyCount, "survey_count": surveyCount, "company_surveys": result });
        } else {
            res.json({ message: "Sorry, you are unauthorized" });
        }
    } catch (error) {
        console.error("Error:", error);
        res.json({ message: "Catch error: " + error });
    }
});

router.put('/api/v1/deleteReport',auth,async(req,res)=>{
    try {
        let role = req.user.user_role
        let report_id = req.headers['report_id']
        if(role == 'admin' || role == 'owner' || role == 'survey-reader'){
           let report = await reportsModel.findOneAndUpdate({_id:report_id,active:1},{active:0})
           if(report){
            res.json({message:"The report sucssfully deleted"})
           }
           else{
            res.json({message:"sorry , the report you are trying to delete does not exist"})
           }
        }
        else{
            res.json({message:"sorry, you are unauthorized"})
        }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})

module.exports = router


//2023-12-27T13:14:30.941Z