const express = require("express");
const router = express.Router();
const config = require('../../config')
const companyModel = require('../models/company.models')
const locationModel = require("../../src/models/location.models");
const Answer = require("../models/answers.model")
const QuestionController = require('../models/questions_controller.models')
const userModels = require("../models/user.models");
const departmentModel = require('../models/department.models')
const surveyReaderModel = require('../models/surveyReader.model')
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

                const existingCompany = await companyModel.findOne({ company_name: caseInsensitiveRegex });

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

       let companies = await companyModel.find({active:1}).select('company_name') 
       if(companies.length>0){
        res.json(companies)
       }
       else{
        res.json({message:"No data found"})
       }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})

router.put('/api/v1/deleteCompany', auth, async (req, res) => {
    try {
        let role = req.user.user_role
        let company_id = req.headers['company_id']
        if (role == "admin" || role == "owner" || role == "superadmin") {
            // Delete company and related entities
            let company = await companyModel.findOneAndUpdate({ _id: company_id, active: 1 }, { active: 0 })
            let user = await userModels.updateMany({ company_id: company_id, active: 1 }, { active: 0 })
            let department = await departmentModel.updateMany({ company_id: company_id, active: 1 }, { active: 0 })

            // Delete surveys and related entities
            let surveys = await surveyModel.find({ company_id: company_id, active: 1 })
            for (const survey of surveys) {
                await surveyReaderModel.updateMany({ survey_id: survey._id, active: 1 }, { active: 0 })
                await questionModel.updateMany({ survey_id: survey._id, active: 1 }, { active: 0 })
                await answerModel.updateMany({ survey_id: survey._id, active: 1 }, { active: 0 })
                await locationModel.updateMany({ survey_id: survey._id, active: 1 }, { active: 0 })
            }

            if (company) {
                res.json({ message: "The company and associated entities deleted successfully" })
            } else {
                res.json({ message: "The company you are looking for not found" })
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized" })
        }
    } catch (error) {
        res.json({ message: "Catch error " + error })
    }
})

module.exports = router