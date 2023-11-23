const express = require("express");
const router = express.Router();
const userModels = require("../models/user.models");
const departmentModel = require('../models/department.models')
const companyModel = require('../models/company.models')
const Location = require('../../src/models/location.models')
const surveyModel = require('../models/survey.models')
const { hashPassword } = require('../helper/hashPass.helper')
const config = require('../../config')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
const locationModels = require("../../src/models/location.models");
require('dotenv').config()

router.post('/api/v1/addLocation', auth, async (req, res) => {
    try {
        const { location_tree, survey_title } = req.body;
        const role = req.user.user_role;
        const department = req.user.department_id;

        if (role == 'admin') {
            let existingSurvey = await surveyModel.findOne({
                survey_title: survey_title,
                department_id: department,
                active: 1
            });

            if (!existingSurvey) {
                res.json({ message: "No survey exists for this department" });
            } else {
                const idToLocationMap = new Map();

                // Iterate through each set of locations for a survey
                for (const locationsSet of location_tree) {
                    // Store the MongoDB-generated IDs for each location in the set
                    for (const locationData of locationsSet) {
                        const { id, name, parentId } = locationData;

                        const location = new Location({
                            location_name: name,
                            department_id: department,
                            id: id,
                            survey_id: existingSurvey._id
                        });

                        await location.save();

                        // Store the MongoDB-generated ID for later reference
                        locationData.mongoId = String(location._id);

                        // Store the location in the map for potential parent references
                        // Store the whole object, use 'id' as the key consistently
                        idToLocationMap.set(id, location);
                    }

                    // Assign parent references based on the provided parent IDs for the current set
                    for (const locationData of locationsSet) {
                        const { id, parentId } = locationData;

                        const location = idToLocationMap.get(id);
                        const parent = parentId !== null ? idToLocationMap.get(parentId) : null;

                        // Check if location and parent exist before updating the parent reference
                        if (location) {
                            await Location.updateOne({ _id: location._id }, { parent_id: parent ? parent._id : null });
                        }
                    }
                }

                res.status(200).json({ message: 'Locations stored and parent references assigned successfully!' });
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized." });
        }
    } catch (error) {
        res.status(500).json({ message: "Catch error " + error });
    }
});

router.get('/api/v1/getLocation',auth,async(req,res)=>{
    try {
        let role = req.user.user_role
        if(role=="admin"){
          let locations = await locationModels.find({
            department_id:req.user.department_id,
            active:1,
            parent_id:null
          }).select('location_name -_id')
          if(locations.length!=0){
            res.json({message:locations})
          }
          else{
            res.json({message:'no data found'})
          }
        }
        else{
            res.json({ message: "Sorry, you are unauthorized." });
        }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})
module.exports = router
/*

 
/*
 
{
  "location_tree": [
    [
      { "id": "1", "name": "A", "parentId": null },
      { "id": "2", "name": "B", "parentId": "1" },
      { "id": "3", "name": "C", "parentId": "1" },
      { "id": "4", "name": "D", "parentId": "2" },
      { "id": "5", "name": "E", "parentId": "2" },
      { "id": "6", "name": "F", "parentId": "3" },
      { "id": "7", "name": "G", "parentId": "3" }
    ],
    [
      { "id": "1", "name": "A", "parentId": null },
      { "id": "2", "name": "B", "parentId": "1" },
      { "id": "3", "name": "C", "parentId": "1" },
      { "id": "4", "name": "D", "parentId": "2" },
      { "id": "5", "name": "E", "parentId": "2" },
      { "id": "6", "name": "F", "parentId": "3" },
      { "id": "7", "name": "G", "parentId": "3" }
    ]
  ]
}
 

*/