const express = require("express");
const router = express.Router();

const config = require('../../config')
const auth = require('../middleware/auth')

const settingModels = require("../models/setting.models");
require('dotenv').config()

router.post(`${process.env.BASE_URL}/addSetting`, auth, async (req, res) => {
    try {
        let role = req.user.user_role
        let { title_weight, title_font_size, description_font_size, question_font_size, location_limitation, range_limitation, char_limitation } = req.body
        if (role==="superadmin") {
            let setting = await settingModels.create({
                title_weight: title_weight,
                title_font_size: title_font_size,
                description_font_size: description_font_size,
                question_font_size: question_font_size,
                location_limitation: location_limitation,
                range_limitation: range_limitation,
                char_limitation: char_limitation
            })
            res.json({ message: "successfully added",type:1 })
        }
        else {
            res.json({ message: "sorry, you are unauthorized" ,type:0 })
        }
    } catch (error) {
        res.json({ message: "catch error " + error })
    }
})

router.get(`${process.env.BASE_URL}/getSetting`,auth,async(req,res)=>{
    try {
        let role = req.user.user_role
        if (role==="superadmin" || role==="admin" ) {
            let  setting = await settingModels.findOne({
                active:1
            })
            if(setting){
               res.json({message:setting,type:2})
            }else{
                res.json({ message: "No data found",type:0 })
            }
        }
        else {
            res.json({ message: "sorry, you are unauthorized",type:0 })
        }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})

router.put(`${process.env.BASE_URL}/updateSetting`, auth, async (req, res) => {
    try {
        let role = req.user.user_role;
        let { id, title_weight, title_font_size, description_font_size, question_font_size, location_limitation, range_limitation, char_limitation } = req.body;

        if (role === "superadmin") {
            let existingSetting = await settingModels.findById({ _id: id, active: 1 });

            if (existingSetting) {
              
                let updateObject = {};

                if (title_weight) {
                    updateObject.title_weight = title_weight;
                }

                if (title_font_size) {
                    updateObject.title_font_size = title_font_size;
                }

                if (description_font_size) {
                    updateObject.description_font_size = description_font_size;
                }

                if (question_font_size) {
                    updateObject.question_font_size = question_font_size;
                }

                if (location_limitation) {
                    updateObject.location_limitation = location_limitation;
                }

                if (range_limitation) {
                    updateObject.range_limitation = range_limitation;
                }

                if (char_limitation) {
                    updateObject.char_limitation = char_limitation;
                }

                let updatedSetting = await settingModels.findOneAndUpdate({ _id: id, active: 1 }, updateObject, { new: true });

                res.json({ message: "Settings updated successfully", type: 1 });
            } else {
                res.json({ message: "Data not found", type: 0 });
            }
        } else {
            res.json({ message: "sorry, you are unauthorized",type:0 });
        }
    } catch (error) {
        res.json({ message: "Catch error " + error });
    }
});

router.delete(`${process.env.BASE_URL}/deleteSetting`,auth,async(req,res)=>{
    try {
        let role = req.user.user_role;
        let { id}= req.body
        if(role == 'superadmin'){
           let setting = await settingModels.findByIdAndUpdate({_id:id},{active:0},{new:true})
           res.json({message:"Deleted",type:1})
        }
        else{
            res.json({ message: "Data not found", type: 0 });
        }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})
module.exports = router

