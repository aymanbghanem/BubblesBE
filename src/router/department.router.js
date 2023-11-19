const express = require("express");
const router = express.Router();
const config = require('../../config')
const departmentModel = require('../models/department.models')
const {hashPassword,compareHashedPassword} = require('../helper/hashPass.helper')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
require('dotenv').config()

router.post('/api/v1/addDepartment',auth,async(req,res)=>{
    try {
        let {department_name} = req.body
        department_name = department_name.toLowerCase()
        let company_id = req.user.company_id
        if(req.user.user_role=='owner'){
            let existingDepartment = await departmentModel.findOne({department_name:department_name,company_id:company_id,active:1})
            if(existingDepartment){
                let department = existingDepartment
                res.json({ message: "The department name already exists for your company",department});
            }
            else{
                let department = await departmentModel.create({
                    department_name:department_name,
                    company_id : company_id
                })
                res.json({message:"successfully added",department})
            }
        }
        else{
            res.json({ message: "sorry you are unauthorized" })
        }
       
    } catch (error) {
        res.status(500).json({message:"catch error "+error})
    }
})

module.exports = router