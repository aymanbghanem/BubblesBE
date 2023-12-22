const express = require("express");
const router = express.Router();
const mongoose = require('mongoose');
const config = require('../../config')
const companyModel = require('../models/company.models')
const locationModel = require("../../src/models/location.models");
const Answer = require("../models/answers.model")
const QuestionController = require('../models/questions_controller.models')
const userModels = require("../models/user.models");
const departmentModel = require('../models/department.models')
const surveyReaderModel = require('../models/surveyReader.model')
const surveyModel = require('../models/survey.models')
const questionModel = require("../models/questions.models");
const {hashPassword,compareHashedPassword} = require('../helper/hashPass.helper')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
require('dotenv').config()

router.post('/api/v1/addCompany', auth, async (req, res) => {
    try {
        if (req.user.user_role === 'superadmin') {
            const { companies } = req.body;

            if (!Array.isArray(companies)) {
                return res.status(400).json({ message: "Invalid input format. 'companies' should be an array of object." });
            }

            const addedCompanies = [];

            for (const companyData of companies) {
                const { company_name } = companyData;
                const caseInsensitiveRegex = new RegExp(`^${company_name}$`, 'i');

                const existingCompany = await companyModel.findOne({ company_name: caseInsensitiveRegex,active:1 });

                if (existingCompany) {
                    addedCompanies.push({ message: `The company name '${company_name}' already exists`, company: existingCompany });
                } else {
                    const newCompany = await companyModel.create({
                        company_name: company_name,
                    });
                    addedCompanies.push({ message: `Successfully added company '${company_name}'`, company: newCompany });
                }
            }

            res.json({ addedCompanies });
        } else {
            res.json({ message: "Sorry, you are unauthorized" });
        }

    } catch (error) {
        res.status(500).json({ message: "Catch error: " + error });
    }
});

router.get('/api/v1/getCompanies',auth,async(req,res)=>{
    try {
       let role = req.user.user_role
      
       if(role=="superadmin"){
        let companies = await companyModel.find().select('company_name active') 

        if(companies.length>0){
            res.json(companies)
           }
           else{
            res.json({message:"No data found"})
           }
       }
       else{
        res.json({message:"sorry, you are unauthorized"})
       }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})

router.put('/api/v1/deleteDepartment', auth, async (req, res) => {
    try {
        let role = req.user.user_role
        let department_id = req.headers['department_id']
        let { active } = req.body
        
        if (role == "owner" || role == "superadmin") {
            // Update department and related entities
            let department = await departmentModel.findOneAndUpdate({ _id: department_id }, { active: active });
            let user = await userModels.updateMany({ department_id: department_id }, { active: active });

            // Update surveys and related entities
            let surveys = await surveyModel.find({ department_id: department_id, active: 1 });
            for (const survey of surveys) {
                await Promise.all([
                    surveyModel.updateOne({ _id: survey._id, active: 1 }, { active: active }),
                    surveyReaderModel.updateMany({ survey_id: survey._id, active: 1 }, { active: active }),
                    questionModel.updateMany({ survey_id: survey._id, active: 1 }, { active: active }),
                    Answer.updateMany({ survey_id: survey._id, active: 1 }, { active: active }),
                    locationModel.updateMany({ survey_id: survey._id, active: 1 }, { active: active })
                ]);
            }

            if (department) {
                if (active == 1) {
                    res.json({ message: "The department and associated entities activated successfully" });
                } else {
                    res.json({ message: "The department and associated entities deleted successfully" });
                }
            } else {
                res.json({ message: "The department you are looking for not found" });
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized" });
        }
    } catch (error) {
        res.json({ message: "Error occurred during the update operation: " + error.message });
    }
});


module.exports = router