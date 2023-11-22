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


module.exports = router