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
const qrModel = require("../models/qr.model");
const {hashPassword,compareHashedPassword} = require('../helper/hashPass.helper')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
const responseModel = require("../models/response.model");
const notificationModel = require("../models/notification.model");
const notifyModels = require("../models/notify.models");
const reportsModel = require("../models/reports.model");
require('dotenv').config()



router.post('/api/v1/addCompany', auth, async (req, res) => {
    try {
        if (req.user.user_role === 'superadmin') {
            const { company_name, dashboard,notifier } = req.body;

            const caseInsensitiveRegex = new RegExp(`^${company_name}$`, 'i');

            const existingCompany = await companyModel.findOne({ company_name: caseInsensitiveRegex});

            if (existingCompany) {
                res.json({ message: `The company name '${company_name}' already exists`,type:0 });
            } else {

                const newCompany = await companyModel.create({
                    company_name: company_name,
                    dashboard:dashboard ? dashboard:0,
                    notifier:notifier?notifier:0
                });

                res.json({ message: `Successfully added company '${company_name}'`,type:1});
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized",type:0});
        }
    } catch (error) {
        res.status(500).json({ message: "Catch error: " + error });
    }
});

router.get('/api/v1/getCompanies',auth,async(req,res)=>{
    try {
       let role = req.user.user_role
      
       if(role=="superadmin"){
        let companies = await companyModel.find().select('company_name dashboard notifier active') 

        if(companies.length>0){
            res.json({message:companies,type:2})
           }
           else{
            res.json({message:"No data found",type:0})
           }
       }
       else{
        res.json({message:"sorry, you are unauthorized",type:0})
       }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})

router.put('/api/v1/deleteCompany', auth, async (req, res) => {
    try {
        let role = req.user.user_role;
        let company_id = req.headers['company_id'];
        let {active} = req.body
        if (role === "superadmin") {
            // Delete company and related entities
            let company = await companyModel.findOneAndUpdate({ _id: company_id}, { active:active});
            let user = await userModels.updateMany({ company_id: company_id,deleted:0}, {active:active});
            let department = await departmentModel.updateMany({ company_id: company_id,deleted:0}, {active:active});
            let report = await reportsModel.updateMany({ company_id: company_id}, {active:active})
            // Deactivate surveys and related entities
            let surveys = await surveyModel.find({ company_id: company_id,deleted:0});
            for (const survey of surveys) {
                await Promise.all([
                    surveyModel.updateOne({ _id: survey._id,deleted:0}, { active:active }),
                    surveyReaderModel.updateMany({ survey_id: survey._id }, { active:active }),
                    questionModel.updateMany({ survey_id: survey._id }, { active:active }),
                    Answer.updateMany({ survey_id: survey._id }, { active:active }),
                    locationModel.updateMany({ survey_id: survey._id }, { active:active }),
                    qrModel.updateMany({ survey_id: survey._id }, { active:active }),
                   // responseModel.updateMany({ survey_id: survey._id }, { active:active }),
                    notificationModel.updateMany({ survey_id: survey._id }, { active:active }),
                    notifyModels.updateMany({ survey_id: survey._id }, { active:active })
                ]);
            }

            if (company) {
                if(active==1){
                    res.json({ message: "The company and associated entities activated successfully",type:1 });
                }
                else{
                    res.json({ message: "The company and associated entities deleted successfully",type:1 });
                }
            } else {
                res.json({ message: "The company you are looking for was not found.", type: 0 });
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized",type:0});
        }
    } catch (error) {
        res.json({ message: "Error occurred during the delete operation: " + error.message });
    }
});

router.get('/api/v1/getCompanyById',auth,async(req,res)=>{
    try {
        let company_id = req.headers['company_id']
        let role = req.user.user_role
        if(role == 'admin'){
            let company = await companyModel.findOne({_id:company_id , active:1})
            if(company){
                res.json({message:company , type:2})
            }
            else{
                res.json({message:"No data found"})
            }
        }
        else{
            res.json({message:"sorry, you are unauthorized",type:0})
        }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})

router.put('/api/v1/updateCompanyAccess',auth,async(req,res)=>{
    try {
        let role = req.user.user_role
        let company_id = req.headers['company_id']
        let {dashboard,notifier} = req.body
        if(role == 'superadmin'){
            let company = await companyModel.findOne({_id:company_id,active:1})
            if(company){
      

                 if(dashboard == 0 || dashboard == 1 ){
                
                    let report = await reportsModel.updateMany({ company_id: company_id}, {active:dashboard})
                }

                if(notifier == 0 || notifier == 1 ){
                let surveys = await surveyModel.find({ company_id: company_id});
                for (const survey of surveys) {
                   
                    await Promise.all([
                        notificationModel.updateMany({ survey_id: survey._id }, { active:notifier }),
                        notifyModels.updateMany({ survey_id: survey._id }, { active:notifier })
                    ]);
                }
                }
                company = await companyModel.findOneAndUpdate({_id:company_id},{notifier:notifier , dashboard:dashboard})
                res.json({ message: "Successfully updated", type: 1 });
            }
            else{
                res.json({message:"No data found",type:0})
            }
        }
        else{
            res.json({message:"sorry, you are unauthorized",type:0})
        }
    } catch (error) {
      res.json({message : "catch error "+error})  
    }
})
module.exports = router