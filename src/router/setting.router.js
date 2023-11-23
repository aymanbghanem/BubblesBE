const express = require("express");
const router = express.Router();

const config = require('../../config')
const auth = require('../middleware/auth')

const settingModels = require("../models/setting.models");
require('dotenv').config()

router.post('/api/v1/addSetting', auth, async (req, res) => {
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
            res.json({ message: "successfully added", setting })
        }
        else {
            res.json({ message: "sorry, you are unauthorized" })
        }
    } catch (error) {
        res.json({ message: "catch error " + error })
    }
})

router.get('/api/v1/getSetting',auth,async(req,res)=>{
    try {
        let role = req.user.user_role
        if (role==="superadmin") {
            let  setting = await settingModels.findOne({
                active:1
            })
            if(setting){
               res.json({message:setting})
            }else{
                res.json({ message: "no data found " })
            }
        }
        else {
            res.json({ message: "sorry, you are unauthorized" })
        }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})

router.put('/api/v1/updateSetting', auth, async (req, res) => {
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

                res.json({ message: "setting updated successfully", updatedSetting });
            } else {
                res.json({ message: "sorry, the data does not exist" });
            }
        } else {
            res.json({ message: "sorry, you are unauthorized" });
        }
    } catch (error) {
        res.json({ message: "Catch error " + error });
    }
});

router.delete('/api/v1/deleteSetting',auth,async(req,res)=>{
    try {
        let role = req.user.user_role;
        let { id}= req.body
        if(role == 'superadmin'){
           let setting = await settingModels.findByIdAndUpdate({_id:id},{active:0},{new:true})
           res.json({message:"Deleted",setting})
        }
        else{
            res.json({ message: "sorry, the data does not exist" });
        }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})
module.exports = router

