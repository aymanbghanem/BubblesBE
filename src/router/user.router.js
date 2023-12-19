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


router.post('/api/v1/addUsers', auth, async (req, res) => {
    try {
        let hashedPassword;
        const role = req.user.user_role.toLowerCase();

        let newPassword = await generateMixedID()

        const { user_name, email_address, company_name, department_name, survey } = req.body;
        if (!config.roles.includes(role)) {
            return res.json({ message: "sorry, you are unauthorized" });
        }

        const existingUser = await userModels.findOne({
            //on the platform
            $and: [
                { $or: [{ email_address: email_address }, { user_name: user_name }] },
                { active: 1 },
            ],
        });

        if (existingUser) {
            return res.json({ message: "The email address or username already exists" });
        }

        let token = jwt.sign({ user_name: user_name }, process.env.TOKEN_KEY);

        if (role == "superadmin") {
            // check if the company is exists
            let company = await companyModel.findOne({
                company_name: { $regex: new RegExp("^" + company_name, "i") },
                active: 1,
            });
            if (company) {
                const ownerError = await addOwner(company);
                if (ownerError) {
                    return res.json({ message: ownerError });
                }
                else {

                    console.log(company)
                    //  await hashPassword(newPassword, async (hash) => {
                    // hashedPassword = hash;

                    const user = await userModels.create({
                        user_name: user_name,
                        password: newPassword,
                        email_address: email_address,
                        company_id: company._id,
                        user_role: "owner",
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
                    //  })
                }
            }
            else {
                res.json({ message: "The company does not exist" })
            }
        }


        else if (department_name && role == 'owner') {
            // await hashPassword(newPassword, async (hash) => {
            //  hashedPassword = hash;

            const department = await departmentModel.findOne({
                department_name: { $regex: new RegExp("^" + department_name, "i") },
                company_id: req.user.company_id,
                active: 1,
            });

            if (!department) {
                return res.json({ message: "The department does not exist within your company" });
            }

            // Continue with the user creation
            const userParams = {
                user_name: user_name,
                password: newPassword,
                email_address: email_address,
                user_role: "admin",
                token: token,
            };

            const user = await userModels.create({
                ...userParams,
                company_id: req.user.company_id,
                department_id: department._id,
            });

            return res.json({
                message: "Successfully added",
                token: user.token,
                user_role: user.user_role,
                email_address: user.email_address,
                image: user.image
            });

            // await sendEmail(user_name,email_address, "Account password", newPassword,"your account password")

            //  })
        }
        else if (role === 'admin') {

            //await hashPassword(newPassword, async (hash) => {
            // hashedPassword = hash;
            let user;
            // Set user parameters
            const userParams = {
                user_name: user_name,
                password: newPassword,
                email_address: email_address,
                user_role: 'survey-reader',
                token: token,
            };
            // Create a new user
            user = await userModels.create({
                ...userParams,
                company_id: req.user.company_id,
                department_id: req.user.department_id,
            });
            // Check if there are surveys to assign
            if (survey && survey.length > 0) {
                // Assign surveys to the user
                for (let i = 0; i < survey.length; i++) {
                    // Get the survey information
                    const surveyInfo = await surveyModel.findOne({
                        _id: survey[i],
                        company_id: req.user.company_id,
                        active: 1,
                    });
                    if (surveyInfo) {
                        let survey_reader = await surveyReaderModel.create({
                            survey_id: survey[i],
                            company_id: req.user.company_id,
                            department_id: user.department_id,
                            reader_id: user._id,
                            company_logo: user.company_logo,
                            created_by: surveyInfo.created_by, // Assign the survey creator
                            active: 1,
                        });
                    } else {
                        // Handle the case when the survey is not found
                        console.error(`Survey not found: ${survey[i]}`);
                    }
                }
            }

            return res.json({
                message: "Successfully added",
                user: {
                    token: user.token,
                    user_role: user.user_role,
                    email_address: user.email_address,
                    image: user.image
                }
            });
            //  });

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
        //console.log(newPassword)
        let hashedPassword;
        // Check if either the email_address or user_name already exists
        const existingUser = await userModels.findOne({
            $or: [{ email_address: email_address }, { user_name: user_name }],
        });

        if (existingUser) {
            res.json({ message: "The email address or username already exists" });
        } else {

            await hashPassword(newPassword, async (hash) => {
                hashedPassword = hash;

                let token = jwt.sign({ user_name: user_name }, process.env.TOKEN_KEY);
                let new_user = await userModels.create({
                    user_name: user_name,
                    user_role: 'superadmin',
                    email_address: email_address,
                    password: newPassword,
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
        let id = req.user._id;
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
                _id: user._id,
                user_name: user.user_name,
                user_role: user.user_role,
                token: user.token,
                email_address: user.email_address,
                company_name: user.company_id ? user.company_id.company_name || " " : " ",
                department_name: user.department_id ? user.department_id.department_name || " " : " ",
                image: user.company_id && user.image != "" ? `${user.company_id.company_name}/${user.image}` : "",
            };

            res.json({ message: response });
        } else {
            res.json({ message: "The user is not in the system" });
        }
    } catch (error) {
        res.status(500).json({ message: "catch error " + error });
    }
});

router.put('/api/v1/updateUserInfo', auth, async (req, res) => {
    try {
        let { user_name, email_address, image } = req.body
        let role = req.user.user_role
        let company_id = req.user.company_id

        if (config.roles.includes(role)) {
            let existingUser = await userModels.findOne({
                user_name: user_name,
                active: 1,
            })

            if (existingUser) {
                // Check if the updated email is unique
                if (email_address && email_address !== existingUser.email_address) {
                    const isEmailUnique = await userModels.findOne({
                        email_address: email_address,
                        _id: { $ne: existingUser._id } // Exclude the current user from the check
                    });

                    if (isEmailUnique) {
                        return res.json({ message: "Email address is not unique. Please choose a different email." });
                    }
                }
               else{
                let updateUser = await userModels.findByIdAndUpdate(
                    { _id: existingUser._id },
                    {
                        email_address: email_address ? email_address : existingUser.email_address,
                        image: image ? image : existingUser.image
                    },
                    { new: true }
                );

                return res.json({ message: "successfully updated", updateUser });
               }
               
            } else {
                return res.json({ message: "The user is not in the system" });
            }
        } else {
            return res.json({ message: "sorry, you are unauthorized" });
        }
    } catch (error) {
        return res.json({ message: "catch error " + error });
    }
});

router.get('/api/v1/getUserAccordingToMyRole', auth, async (req, res) => {
    try {
        const role = req.user.user_role;
        const company_id = req.user.company_id
        if (!config.roles.includes(role)) {
            return res.json({ message: "Sorry, you are unauthorized" });
        }

        let users;

        if (role === 'superadmin') {
            users = await userModels.find({ user_role: 'owner' }).populate({
                path: "company_id",
                select: "company_name -_id"
            });
        } else if (role === 'owner') {
            users = await userModels.find({ user_role: 'admin', company_id: company_id }).populate([
                {
                    path: "company_id",
                    select: "company_name -_id"
                },
                {
                    path: "department_id",
                    select: "department_name"
                }
            ]);
        } else if (role === 'admin') {
            users = await userModels.find({ user_role: 'survey-reader', company_id: company_id, department_id: req.user.department_id }).populate([
                {
                    path: "company_id",
                    select: "company_name -_id"
                },
                {
                    path: "department_id",
                    select: "department_name"
                }
            ]);
        } else {
            return res.json({ message: "Invalid user role" });
        }

        if (users.length !== 0) {
            const simplifiedUsers = users.map(user => {
                const response = {
                    active: user.active,
                    _id: user._id,
                    user_name: user.user_name,
                    user_role: user.user_role,
                    token: user.token,
                    email_address: user.email_address,
                    company_name: user.company_id ? user.company_id.company_name || "" : "",
                    department_name: user.department_id ? user.department_id.department_name || "" : "",
                    image: user.company_id && user.image != "" ? `${user.company_id.company_name}/${user.image}` : "",
                };
                return response;
            });

            res.json({ message: simplifiedUsers });
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
        //console.log(newPassword)
        let response;
        let existingUser = await userModels.findOne({
            user_name: user_name
        })
        if (existingUser) {
            await hashPassword(newPassword, async (hash) => {
                hashedPassword = hash;
                existingUser = await userModels.findOneAndUpdate({ user_name: user_name }, { password: newPassword }, { new: true })
            })

            //let user_name = existingUser.user_name
            //  response = await sendEmail(user_name,existingUser.email_address, "Reset password", newPassword,"to reset your password")
            res.json({ message: response, existingUser })
        }
        else {
            res.json({ message: "The user does not exist" })
        }
    } catch (error) {
        res.json({ message: "catch error " + error })
    }
})

router.post('/api/v1/deleteUsers', auth, async (req, res) => {
    try {
        const role = req.user.user_role
        const { user_ids } = req.body;

        if (!config.roles.includes(role)) {
            return res.json({ message: "Sorry, you are unauthorized" });
        }

        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            return res.json({ message: "Please provide valid user IDs to delete" });
        }

        const deletedUsers = await userModels.updateMany(
            { _id: { $in: user_ids }, active: 1 },
            { $set: { active: 0 } }
        );

        if (deletedUsers.modifiedCount == deletedUsers.matchedCount) {
            return res.json({ message: "Users deleted successfully" });
        } else {
            return res.json({ message: "No valid users found to delete" });
        }
    } catch (error) {
        return res.json({ message: error.message });
    }
});

module.exports = router

