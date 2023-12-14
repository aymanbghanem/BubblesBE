const express = require("express");
const router = express.Router();
const userModels = require("../models/user.models");
const departmentModel = require('../models/department.models')
const companyModel = require('../models/company.models')
const { hashPassword } = require('../helper/hashPass.helper')
const generateMixedID = require('../helper/passwordGenerator.helper')
const sendEmail = require('../middleware/email')
const surveyReaderModel = require('../models/surveyReader.model')
const surveyModel = require('../models/survey.models')
const config = require('../../config')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
require('dotenv').config()


const addOwner = async (company) => {
    const existingOwner = await userModels.findOne({
        user_role: 'owner',
        company_id: company._id,
    });

    if (existingOwner) {
        throw new Error("There is already an owner for this company");
    }
};

const addDepartmentAndUser = async (userParams, company_id, department_name) => {
    let department_id;

    const department = await departmentModel
        .find({ department_name: department_name.toLowerCase(), company_id: company_id })
        .populate({
            path: 'company_id',
            select: 'company_name',
        });

    if (department.length !== 0) {
        const filteredData = department.filter((entry) => entry.company_id !== null);
        department_id = filteredData[0]._id.toString();
    } else {
        const newDepartment = await departmentModel.create({
            department_name: department_name,
            company_id: company_id,
        });
        department_id = newDepartment._id;
    }

    const user = await userModels.create({
        ...userParams,
        company_id: company_id,
        department_id: department_id,
    });

    return user;
};

router.post('/api/v1/addUsers', auth, async (req, res) => {
    try {
        let hashedPassword;
        const role = req.user.user_role.toLowerCase();
        let newPassword = await generateMixedID()
        console.log(newPassword)
        const { user_name, email_address, user_role, company_name, department_name, survey } = req.body;

        if (!config.roles.includes(role)) {
            return res.json({ message: "sorry, you are unauthorized" });
        }

        let company = await companyModel.findOne({
            company_name: company_name.toLowerCase(),
            active: 1,
        });

        if (!company) {
            company = await companyModel.create({
                company_name: company_name,
            });
        }

        if (user_role.toLowerCase() == 'owner') {
            await addOwner(company);
        }

        const existingUser = await userModels.findOne({
            $and: [
                { $or: [{ email_address: email_address }, { user_name: user_name }] },
                { company_id: company._id },
            ],
        });

        if (existingUser) {
            return res.json({ message: "The email address or username already exists within the company" });
        }

        let token = jwt.sign({ user_name: user_name }, process.env.TOKEN_KEY);

        if (user_role.toLowerCase() === 'owner' && role == "superadmin") {
            await hashPassword(newPassword,async (hash) => {
                hashedPassword = hash;

            const user = await userModels.create({
                user_name: user_name,
                password: hashedPassword,
                email_address: email_address,
                company_id: company._id,
                user_role: user_role,
                token: token,
            });

          //  await sendEmail(user_name,email_address, "Account password", newPassword,"your account password")
            return res.json({
                message: "Successfully added",
                token: user.token,
                user_role: user.user_role,
                email_address: user.email_address,
                image: user.image
            });
        })
        } else if (department_name && (user_role.toLowerCase() === 'admin') && role == 'owner') {
            await hashPassword(newPassword,async (hash) => {
                hashedPassword = hash;
            const userParams = {
                user_name: user_name,
                password: hashedPassword,
                email_address: email_address,
                user_role: user_role,
                token: token,
            };
            const user = await addDepartmentAndUser(userParams, req.user.company_id, department_name);
           // await sendEmail(user_name,email_address, "Account password", newPassword,"your account password")
            return res.json({
                message: "Successfully added",
                token: user.token,
                user_role: user.user_role,
                email_address: user.email_address,
                image: user.image
            });
        })
        } else if (department_name && (user_role.toLowerCase() === 'survey-reader') && role == 'admin') {
            let user;
            await hashPassword(newPassword,async (hash) => {
                hashedPassword = hash;
            const userParams = {
                user_name: user_name,
                password: hashedPassword,
                email_address: email_address,
                user_role: user_role,
                token: token,
            };
             user= await addDepartmentAndUser(userParams, req.user.company_id, department_name);
           // await sendEmail(user_name,email_address, "Account password", newPassword,"your account password")
            return res.json({
                message: "Successfully added",
                token: user.token,
                user_role: user.user_role,
                email_address: user.email_address,
                image: user.image
            })
        })
           
        }
        else {
            return res.json({ message: "sorry, you are unauthorized" });
        }
    } catch (error) {
        return res.json({ message: error.message });
    }
});

router.post('/api/v1/addSuperadmin', async (req, res) => {
    try {
        let { user_name, email_address, password } = req.body;
        user_name = user_name.toLowerCase();
        let newPassword = await generateMixedID()
        console.log(newPassword)
        let hashedPassword;
        // Check if either the email_address or user_name already exists
        const existingUser = await userModels.findOne({
            $or: [{ email_address: email_address }, { user_name: user_name }],
        });

        if (existingUser) {
            res.json({ message: "The email address or username already exists" });
        } else {
            
            await hashPassword(newPassword,async (hash) => {
              hashedPassword = hash;
           
                let token = jwt.sign({ user_name: user_name }, process.env.TOKEN_KEY);
                let new_user = await userModels.create({
                    user_name: user_name,
                    user_role: 'superadmin',
                    email_address: email_address,
                    password: hashedPassword,
                    token: token,
                });
               // await sendEmail(user_name,email_address, "Account password", newPassword,"for your account password")
                let response = {
                    message: "successfully added",
                    token: new_user.token,
                    user_role: new_user.user_role,
                    email_address: new_user.email_address,
                };
                res.json({ response });
            });
        }
    } catch (error) {
        res.status(500).json({ message: "catch error " + error });
    }
});

router.get('/api/v1/userInfo', auth, async (req, res) => {
    try {
        let id = req.user._id
        let user = await userModels.findById({ _id: id, active: 1 }).populate([
            {
                path: 'company_id',
                select: 'company_name -_id',
            },
            {
                path: 'department_id',
                select: 'department_name',
            },
        ]);
        if (user) {
            let response = {
                user_name: user.user_name,
                user_role: user.user_role,
                token: user.token,
                email_address: user.email_address,
                company_name: user.company_id.company_name || " ", // Add a check here
                department_name: user.department_id ? user.department_id.department_name || " " : " ",// Add a check here
                image: `${user.company_id.company_name}/${user.image}`
            }
            res.json({ message: response })
        } else {
            res.json({ message: "The user is not in the system" })
        }
    } catch (error) {
        res.status(500).json({ message: "catch error " + error })
    }
})

router.put('/api/v1/updateUserInfo', auth, async (req, res) => {
    try {
        let { user_name, email_address, image } = req.body
        let role = req.user.user_role
        let company_id = req.user.company_id

        if (config.roles.includes(role)) {
            let existingUser = await userModels.findOne({
                user_name: user_name,
                active: 1,
                company_id: company_id
            })
            if (existingUser) {
                let updateUser = await userModels.findByIdAndUpdate({ _id: existingUser._id }, {
                    email_address: email_address ? email_address : existingUser.email_address,
                    image: image ? image : existingUser.image
                }, { new: true })
                res.json({ message: "successfully updated", updateUser })
            }
            else {
                res.json({ message: "The user is not in the system" })
            }
        }
        else {
            res.json({ message: "sorry, you are unauthorized" })
        }

    } catch (error) {
        res.json({ message: "catch error " + error })
    }
})

router.get('/api/v1/getUserAccordingToMyRole', auth, async (req, res) => {
    try {
        const role = req.user.user_role;

        if (!config.roles.includes(role)) {
            return res.json({ message: "Sorry, you are unauthorized" });
        }

        const roleQueries = {
            superadmin: {
                userQuery: { user_role: 'owner' },
                populate: { path: 'company_id', select: 'company_name -_id' }
            },
            owner: {
                userQuery: { user_role: 'admin', company_id: req.user.company_id },
                populate: null
            },
            admin: {
                userQuery: { user_role: 'survey-reader', department_id: req.user.department_id },
                populate: null
            }
        };

        const { userQuery, populate } = roleQueries[role] || {};
        if (!userQuery) {
            return res.json({ message: "Invalid user role" });
        }

        const users = await userModels.find({ ...userQuery, active: 1 })
            .populate(populate)
            .select('-_id -password');

        if (users.length !== 0) {
            res.json({ message: users });
        } else {
            res.json({ message: "Sorry, there are no users under your role" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.post('/api/v1/resetPassword', async (req, res) => {
    try {
        let { user_name } = req.body
        let newPassword = await generateMixedID()
        console.log(newPassword)
        let response;
        let existingUser = await userModels.findOne({
            user_name:user_name
        })
        if(existingUser){
            await hashPassword(newPassword,async (hash) => {
                hashedPassword = hash;
                existingUser = await userModels.findOneAndUpdate({user_name:user_name},{password:hashedPassword},{new:true})
            })
           
            //let user_name = existingUser.user_name
          //  response = await sendEmail(user_name,existingUser.email_address, "Reset password", newPassword,"to reset your password")
            res.json({ message: response,existingUser })
        }
        else{
            res.json({message:"The user does not exist"})
        }
    } catch (error) {
        res.json({ message: "catch error " + error })
    }
})


module.exports = router

