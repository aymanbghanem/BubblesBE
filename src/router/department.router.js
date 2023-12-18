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
                res.json({ message: "One or more department names already exist for your company", departments: existingDepartments });
            } else {
                const createdDepartments = await Promise.all(departmentsData.map(async (department) => {
                    const createdDepartment = await departmentModel.create({
                        ...department,
                        company_id,
                    });
                    return createdDepartment;
                }));

                res.json({ message: "Successfully added", departments: createdDepartments });
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized" });
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
            let departments = await departmentModel.find({company_id:company_id,active:1})
            .select('department_name') 
            if(departments.length>0){
             res.json(departments)
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
        if(role=="owner" || role=="superadmin" ){
            // Delete department and related entities
            let department = await departmentModel.findOneAndUpdate({_id: department_id, active: 1 }, { active: 0 });
            let user = await userModels.updateMany({ department_id: department_id, active: 1 }, { active: 0 });
            

            // Deactivate surveys and related entities
            let surveys = await surveyModel.find({ department_id: department_id, active: 1 });
            for (const survey of surveys) {
                await Promise.all([
                    surveyModel.updateOne({ _id: survey._id, active: 1 }, { active: 0 }),
                    surveyReaderModel.updateMany({ survey_id: survey._id, active: 1 }, { active: 0 }),
                    questionModel.updateMany({ survey_id: survey._id, active: 1 }, { active: 0 }),
                    Answer.updateMany({ survey_id: survey._id, active: 1 }, { active: 0 }),
                    locationModel.updateMany({ survey_id: survey._id, active: 1 }, { active: 0 })
                ]);
            }

            if (department) {
                res.json({ message: "The department and associated entities deleted successfully" });
            } else {
                res.json({ message: "The department you are looking for not found" });
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized" });
        }
    } catch (error) {
        res.json({ message: "Error occurred during the delete operation: " + error.message });
    }
});
module.exports = router