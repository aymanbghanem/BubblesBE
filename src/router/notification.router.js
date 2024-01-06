const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');
const notificationModel = require("../models/notification.model");

router.get('/api/v1/getNotifications',auth,async(req,res)=>{
        try {
            let id = req.user._id
            let role = req.user.user_role
            if(role == 'survey-reader'){
                let notifications = await notificationModel.find({
                    survey_reader_id:id,
                    active:1
                }).populate([
                    {
                        path: 'survey_id',
                        select: 'survey_title',
                    },
                    {
                        path: 'question_id',
                        select: 'question_title',
                    },
                    {
                        path: 'location_id',
                        select: 'location_name',
                    }
                ]);

                if (notifications.length > 0) {
                    const flattenedNotifications = notifications.map(notification => ({
                        _id: notification._id,
                        active: notification.active,
                        location_name: notification.location_id ? notification.location_id.location_name : null,
                        survey_title: notification.survey_id ? notification.survey_id.survey_title : null,
                        question_title: notification.question_id ? notification.question_id.question_title : null,
                        answer_text: notification.answer_text,
                       
                    }));
                    res.json(flattenedNotifications);
                } else {
                    res.json({ message: "No data found" });
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