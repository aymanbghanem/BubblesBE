const express = require("express");
const router = express.Router();
const config = require('../../config')
const departmentModel = require('../models/department.models')
const companyModel = require('../models/company.models')
const locationModel = require("../../src/models/location.models");
const Answer = require("../models/answers.model")
const QuestionController = require('../models/questions_controller.models')
const userModels = require("../models/user.models");
const surveyReaderModel = require('../models/surveyReader.model')
const surveyModel = require('../models/survey.models')
const questionModel = require("../models/questions.models");
const responseModel = require("../models/response.model");
const {hashPassword,compareHashedPassword} = require('../helper/hashPass.helper')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
require('dotenv').config()

router.post('/api/v1/addDepartment', auth, async (req, res) => {
    try {
        const company_id = req.user.company_id;

        if (req.user.user_role === 'owner') {
            const departmentsData = req.body.department.map(department => {
                return { department_name: department.department_name.toLowerCase() };
            });

            const existingDepartments = await Promise.all(departmentsData.map(async (department) => {
                const { department_name } = department;
                return departmentModel.findOne({ department_name, company_id, active: 1 });
            }));

            if (existingDepartments.some(existingDepartment => existingDepartment)) {
                res.json({ message: "This department already exist in your company",type:0});
            } else {
                const createdDepartments = await Promise.all(departmentsData.map(async (department) => {
                    const createdDepartment = await departmentModel.create({
                        ...department,
                        company_id,
                    });
                    return createdDepartment;
                }));

                res.json({ message: "Successfully added", type:1});
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized" ,type:0 });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Catch error: " + error });
    }
});

router.get('/api/v1/getDepartments',auth,async(req,res)=>{
    try {
        let company_id = req.user.company_id
        let role = req.user.user_role
        if(role=="owner"){
            let departments = await departmentModel.find({company_id:company_id})
            .select('department_name active') 
            if(departments.length>0){
                res.json({message:departments,type:2})
            }
            else{
                res.status(200).json({message:"No data found",type:0})
               }
        }
        else{
            res.status(200).json({message:"sorry, you are unauthorized",type:0})
        }
      
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})

router.put('/api/v1/deleteDepartment', auth, async (req, res) => {
    try {
        let role = req.user.user_role
        let department_id = req.headers['department_id']
        let {active} = req.body
        if(role=="admin"|| role=="owner" || role=="superadmin"){
            // Delete department and related entities
            let department = await departmentModel.findOneAndUpdate({_id: department_id}, { active:active });
            let user = await userModels.updateMany({ department_id: department_id}, { active: active });
            

            // Deactivate surveys and related entities
            let surveys = await surveyModel.find({ department_id: department_id});
            for (const survey of surveys) {
                await Promise.all([
                    surveyModel.updateOne({ _id: survey._id}, { active: active }),
                    surveyReaderModel.updateMany({ survey_id: survey._id}, { active: active }),
                    questionModel.updateMany({ survey_id: survey._id}, { active: active }),
                    Answer.updateMany({ survey_id: survey._id}, { active: active }),
                    locationModel.updateMany({ survey_id: survey._id }, { active: active }),
                    responseModel.updateMany({ survey_id: survey._id }, { active:active })
                ]);
            }

            if (department) {
                if(active==0){
                    res.json({ message: "The department and associated entities deleted successfully",type:1});
                }
                else if(active==1){
                    res.json({ message: "The department and associated entities activated successfully",type:1 });
                }
            } else {
                res.json({ message: "The department you are looking for not found",type:0 });
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized",type:0 });
        }
    } catch (error) {
        res.json({ message: "Error occurred during the delete operation: " + error.message });
    }
});
module.exports = router
