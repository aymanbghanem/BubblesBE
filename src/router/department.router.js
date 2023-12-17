const express = require("express");
const router = express.Router();
const config = require('../../config')
const departmentModel = require('../models/department.models')
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
       let departments = await departmentModel.find({company_id:company_id,active:1})
       .select('department_name') 
       if(departments.length>0){
        res.json(departments)
       }
       else{
        res.json({message:"No data found"})
       }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})

router.patch('/api/v1/deleteDepartment',auth,async(req,res)=>{
    try {
        let role = req.user.user_role
        let department_id = req.headers['department_id']
        if(role=="owner" || role=="superadmin" ){
          let department = await departmentModel.findOneAndUpdate({_id:department_id,active:1},{active:0})
          if(department){
            res.json({message:"The department deleted successfully"})
          }
          else{
            res.json({message:"The department you are looking for does not found"})
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